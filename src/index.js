#!/usr/bin/env node

/**
 * Saola Builder - Node.js orchestration cho PHP compiler
 * 
 * Quy trình:
 * 1. Đọc .sao files từ thư mục source
 * 2. Gửi mỗi source một lần tới `php bin/saoc`
 * 3. Ghi đồng thời Blade SSR và JavaScript/TypeScript CSR
 * 
 * Usage: 
 *   sao-build [context] [--watch]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const ConfigManager = require('./config-manager');
const { RegistryGenerator } = require('./registry-generator');

/**
 * Làm trắng vùng `{{-- --}}` và `@verbatim`, GIỮ NGUYÊN độ dài.
 *
 * Mọi khâu quét .sao (khai báo, <script>/<style>) đọc thô toàn văn bản, nên ví
 * dụ minh hoạ trong comment bị coi là mã thật — trang tài liệu dính nặng nhất.
 * Thay bằng khoảng trắng chứ không xoá: offset tính trên bản làm trắng vẫn trỏ
 * đúng vào bản gốc, nên chỗ nào cần giữ comment trong output chỉ việc cắt bản
 * gốc theo offset. Giữ '\n' vì nhiều khâu quét theo dòng.
 *
 * Song sinh với Saola\Compiler\Support\BladeComment::blank() bên PHP —
 * sửa một bên là cổng source-split đỏ ngay.
 */
function blankBladeComments(content) {
    if (!content) return content;
    return content.replace(
        /\{\{--[\s\S]*?--\}\}|@verbatim\b[\s\S]*?@endverbatim\b/gi,
        m => m.replace(/[^\n]/g, ' ')
    );
}

/** Xoá mọi match NGOÀI comment; xoá từ cuối về đầu để offset không dịch. */
function stripOutsideComments(regex, content) {
    const scan = blankBladeComments(content);
    const hits = [];
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let m;
    while ((m = re.exec(scan)) !== null) hits.push([m.index, m.index + m[0].length]);
    for (let i = hits.length - 1; i >= 0; i--) {
        content = content.slice(0, hits[i][0]) + content.slice(hits[i][1]);
    }
    return content;
}

/**
 * Match đầu tiên NGOÀI comment; nhóm bắt được cắt từ bản GỐC theo offset —
 * thân thẻ thật có thể chứa `{{--` nên không đọc bản đã làm trắng.
 */
function matchOutsideComments(regex, content) {
    const scan = blankBladeComments(content);
    const re = new RegExp(regex.source, regex.flags.includes('d') ? regex.flags : regex.flags + 'd');
    const m = re.exec(scan);
    if (!m) return null;
    const out = [content.slice(m.indices[0][0], m.indices[0][1])];
    for (let i = 1; i < m.length; i++) {
        out.push(m.indices[i] ? content.slice(m.indices[i][0], m.indices[i][1]) : m[i]);
    }
    out.index = m.index;
    return out;
}

class Compiler {
    /**
     * Số hiệu hợp đồng ĐẦU RA của compiler: định dạng marker, thuật toán sinh
     * id, API runtime mà JS compiled gọi, và hợp đồng bundle.
     *
     * TĂNG TAY khi một trong bốn thứ đó đổi — KHÔNG bám theo version package:
     * một bản vá không đụng tới sinh id thì không được làm chết mọi theme đang
     * chạy. Mỗi lần tăng phải ghi lý do ở docs/RUNTIME_CONTRACT.md.
     */
    static OUTPUT_CONTRACT = 2; // RCDATA content + stable foreach row identity/scope (2026-10-01).

    constructor() {
        this.watcherInstances = [];
        this.projectRoot = process.cwd();
        this.phpCompilerPath = this.resolvePhpCompilerPath(this.projectRoot, false);
        this.phpWorker = null;
        this.phpWorkerBuffer = '';
        this.phpWorkerRequestId = 0;
        this.phpWorkerPending = new Map();
        this.compiledViews = {}; // Track compiled views per context
        this.compiledContexts = []; // Track which contexts were compiled in this run
    }

    /**
     * Main entry point
     */
    async run(args = []) {
        try {
            const { config, projectRoot } = ConfigManager.loadConfig(process.cwd());
            this.projectRoot = projectRoot;
            this.resolvePhpCompilerPath(projectRoot);
            ConfigManager.validateConfig(config);

            const context = args[0] || 'default';
            const watchMode = args.includes('--watch');

            if (context === 'all') {
                await this.buildAllContexts(config, projectRoot);
            } else {
                await this.buildContext(config, projectRoot, context);
            }

            if (watchMode) {
                await this.setupWatcher(config, projectRoot, context === 'all' ? null : context);
            }

        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }

    /**
     * Build single context
     */
    async buildContext(config, projectRoot, contextName) {
        this.projectRoot = projectRoot;
        this.resolvePhpCompilerPath(projectRoot);
        // Reset compiled contexts for single context build
        this.compiledContexts = [];
        
        // Build the context
        await this.buildContextWithoutViewsUpdate(config, projectRoot, contextName);
        
        // Update views.ts with only this context
        await this.updateViewsFile(config, projectRoot, config.paths, this.compiledContexts);
    }

    /**
     * Build single context without updating views.ts
     * Used internally for both single and all-context builds
     */
    async buildContextWithoutViewsUpdate(config, projectRoot, contextName) {
        this.projectRoot = projectRoot;
        this.resolvePhpCompilerPath(projectRoot);
        // idMode phải KHỚP giữa lúc compile và lúc app chạy, và phải khớp giữa
        // app với mọi theme cài vào. Biến môi trường vô hình là cơ chế sai cho
        // một giá trị như vậy — đọc từ config, và ghi ra artifact ở Phase 2.
        this.compilerOptions = { idMode: 'terse', ...(config.compiler || {}) };
        // `theme` trong sao.config.json => đang build một GÓI THEME, không phải app.
        this.themeConfig = config.theme || null;
        const contexts = config.contexts || {};
        const paths = config.paths || {};

        // Check if context exists
        if (!contexts[contextName]) {
            console.error(`❌ Context "${contextName}" not found in configuration`);
            process.exit(1);
        }

        const contextConfig = contexts[contextName];
        
        console.log(`\n🔨 Building context: ${contextName}`);
        
        // Clean temp folder for this context BEFORE compiling
        await this.cleanContextTemp(contextConfig, projectRoot, paths, contextName);
        
        // Initialize compiled views tracking for this context
        this.compiledViews[contextName] = [];
        // Blade đã sinh trong LƯỢT NÀY — dùng để quét file mồ côi SAU khi
        // compile, thay vì xoá sạch cây TRƯỚC khi compile.
        this.writtenBlade = new Set();
        
        // Process all namespace views
        const namespaces = Object.keys(contextConfig.views || {});
        
        if (namespaces.length === 0) {
            console.log('ℹ️  No views namespaces configured\n');
            return;
        }

        let totalFiles = 0;
        const processPromises = [];
        const failures = [];

        // Process each namespace
        for (const namespace of namespaces) {
            console.log(`\n📁 Namespace: ${namespace}`);
            
            // Get relative paths from config
            const viewsRelPath = contextConfig.views[namespace];
            const bladeRelPath = contextConfig.blade[namespace];
            
            // Resolve với base paths
            const viewsDir = ConfigManager.resolveViewPath(projectRoot, paths, viewsRelPath);
            const bladeBaseDir = ConfigManager.resolveBladePath(projectRoot, paths, bladeRelPath);
            
            console.log(`   Views config: ${viewsRelPath}`);
            console.log(`   Views: ${viewsDir}`);
            console.log(`   Blade config: ${bladeRelPath}`);
            console.log(`   Blade: ${bladeBaseDir}`);

            // Find all .sao files in this namespace

            // Find all .sao files in this namespace
            const saoFiles = this.findSaoFiles(viewsDir);
            totalFiles += saoFiles.length;

            if (saoFiles.length > 0) {
                console.log(`   Found: ${saoFiles.length} files\n`);
                
                // Process all files in this namespace
                for (const saoFilePath of saoFiles) {
                    processPromises.push(
                        this.processSaoFile(
                            saoFilePath,
                            viewsDir,
                            namespace,
                            contextName,
                            contextConfig,
                            projectRoot,
                            paths
                        ).catch(error => {
                            const relativePath = path.relative(viewsDir, saoFilePath);
                            console.error(`  ✗ ${namespace}.${relativePath}: ${error.message}`);
                            failures.push(`${namespace}.${relativePath}`);
                        })
                    );
                }
            }
        }

        if (totalFiles === 0) {
            console.log('ℹ️  No .sao files found\n');
            return;
        }

        // Wait for all files to complete
        await Promise.all(processPromises);

        // View lỗi vẫn được đếm vào totalFiles, nên báo "Successfully compiled
        // ${totalFiles}" là nói dối — và exit 0 khiến `npm run check`/CI đi tiếp
        // với view thiếu. Lỗi biên dịch phải dừng build.
        if (failures.length > 0) {
            console.error(`\n❌ ${failures.length}/${totalFiles} file lỗi trong context ${contextName}:`);
            for (const f of failures) console.error(`   ✗ ${f}`);
            throw new Error(`${failures.length} file .sao biên dịch lỗi (context: ${contextName})`);
        }

        console.log(`\n✅ Successfully compiled ${totalFiles} files for context: ${contextName}`);
        
        // Copy app files to compiled.app
        await this.copyAppFiles(contextConfig, projectRoot, paths, contextName);
        
        // Quét Blade mồ côi — SAU khi ghi xong, không phải xoá cây trước.
        this.sweepOrphanBlade(contextConfig, projectRoot, paths);

        // Generate registry after all views compiled
        await this.generateRegistry(contextConfig, projectRoot, paths, contextName);

        // Entry — gói THEME sinh `main.js` (một defineBundle), app sinh
        // `app.{ctx}.js` (bundle runtime + boot). Xem §8.5.1.
        if (this.themeConfig) {
            await this.generateThemeEntry(contextConfig, projectRoot, paths, contextName);
        } else {
            await this.generateAppEntry(contextConfig, projectRoot, paths, contextName);
            this.writeBuildManifest(projectRoot, paths);
        }
        
        // Track this context as compiled
        if (!this.compiledContexts.includes(contextName)) {
            this.compiledContexts.push(contextName);
        }
        
        console.log();
    }

    /**
     * Build all contexts
     */
    async buildAllContexts(config, projectRoot) {
        const allContexts = Object.keys(config.contexts || {});
        
        // Filter out 'default' - it's not a real context
        const contexts = allContexts.filter(name => name !== 'default');

        if (contexts.length === 0) {
            console.error('No contexts defined in configuration (excluding default)');
            process.exit(1);
        }

        console.log(`\n🔨 Building ${contexts.length} contexts...\n`);

        // Reset compiled contexts for fresh all-build
        this.compiledContexts = [];

        for (const contextName of contexts) {
            // Build without updating views.ts (will do after all)
            await this.buildContextWithoutViewsUpdate(config, projectRoot, contextName);
        }

        // Update views.ts with ALL compiled contexts
        await this.updateViewsFile(config, projectRoot, config.paths, this.compiledContexts);

        console.log('\n✨ All contexts built successfully\n');
    }

    /** Compile một file bằng đúng một request PHP, nhận đồng thời Blade + JS. */
    async processSaoFile(saoFilePath, viewsDir, namespace, contextName, contextConfig, projectRoot, paths) {
        const fileContent = fs.readFileSync(saoFilePath, 'utf-8');
        const publicUrlBase = String(paths.public || 'public/static/saola').replace(/^\/?public\/+/, '');
        // Theme có kho asset riêng: `asset('logo.svg')` trong theme mà dùng prefix
        // của context sẽ trỏ vào assets của APP — hoặc 404, hoặc tệ hơn là hiện
        // đúng file của app mà không ai nhận ra. Xem EXTENSION_ARCHITECTURE §8.5.5.
        const themeMatch = /^themes\.([A-Za-z0-9_-]+)/.exec(namespace);
        const assetScope = themeMatch ? `themes/${themeMatch[1]}` : contextName;
        const assetPrefix = `${publicUrlBase.replace(/\/?$/, '')}/${assetScope}/assets/`;
        const relativePath = path.relative(viewsDir, saoFilePath);
        const fileNameNoExt = path.basename(saoFilePath, '.sao');
        const dirPath = path.dirname(relativePath);
        const viewPath = this.generateViewPath(namespace, relativePath);
        const bladeRelPath = contextConfig.blade[namespace];
        if (!bladeRelPath || typeof bladeRelPath !== 'string') {
            throw new Error(`Invalid blade configuration for namespace "${namespace}". Expected string path, got: ${typeof bladeRelPath}`);
        }
        const bladeBaseDir = ConfigManager.resolveBladePath(projectRoot, paths, bladeRelPath);
        const bladePath = path.join(bladeBaseDir, dirPath, `${fileNameNoExt}.blade.php`);
        const compiledViewsRelPath = contextConfig.compiled.views;
        const compiledViewsDir = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledViewsRelPath);
        const namespaceCount = Object.keys(contextConfig.views || {}).length;
        const includeNamespaceInPath = namespaceCount > 1;
        const jsRelativeDir = includeNamespaceInPath 
            ? path.join(namespace, path.dirname(relativePath))
            : path.dirname(relativePath);
        const langMatch = fileContent.match(/<script\s+setup\b[^>]*\blang=["']?([^"'\s>]+)["']?/i);
        const isTypeScript = !!langMatch && ['ts', 'typescript'].includes(langMatch[1].toLowerCase());


        const result = await this.compileWithPhp(fileContent, {
            viewPath,
            functionName: this.generateComponentName(viewPath),
            factoryName: this.generateFactoryFunctionName(viewPath),
            namespace: `${namespace}.`,
            emit: 'both',
            lang: isTypeScript ? 'ts' : 'js',
            idMode: this.compilerOptions?.idMode || 'terse',
            assetPrefix
        });

        const jsFileExt = result.lang === 'ts' || isTypeScript ? '.ts' : '.js';
        const jsPath = path.join(compiledViewsDir, jsRelativeDir, fileNameNoExt + jsFileExt);

        this.ensureDir(path.dirname(bladePath));
        this.ensureDir(path.dirname(jsPath));
        fs.writeFileSync(bladePath, result.blade, 'utf-8');
        this.writtenBlade?.add(path.resolve(bladePath));
        fs.writeFileSync(jsPath, result.js, 'utf-8');
        // A declaration annotation can switch an existing generated view to TS.
        const alternatePath = path.join(compiledViewsDir, jsRelativeDir, fileNameNoExt + (jsFileExt === '.ts' ? '.js' : '.ts'));
        if (fs.existsSync(alternatePath)) {
            const previous = fs.readFileSync(alternatePath, 'utf-8');
            if (previous.includes(`const __VIEW_PATH__ = '${viewPath}';`)) fs.unlinkSync(alternatePath);
        }
        console.log(`  ✓ ${viewPath}`);

        const actualPath = path.relative(compiledViewsDir, jsPath);
        const namingPath = includeNamespaceInPath ? actualPath : path.join(namespace, actualPath);
        if (this.compiledViews[contextName]) {
            this.compiledViews[contextName].push({ namingPath, actualPath });
        }
    }

    /**
     * Giữ external stylesheet trong HTML Blade để SSR không bị FOUC khi JS
     * chưa boot. @once với identity ổn định chặn layout lồng nhau phát
     * cùng một <link> nhiều lần.
     *
     * KHÔNG còn nằm trên đường build: SaolaCompiler::compile() đã đảm nhận.
     * GIỮ LẠI vì hai chỗ vẫn dùng — đừng xoá:
     *   - compiler/tests/Parity/full-pipeline/oracle.js (oracle của cổng đầu-cuối)
     *   - src/test.js (bộ test JS)
     * Chỉ gỡ được sau khi cổng parity ngừng dùng bản Python làm oracle (P6).
     */
    injectSsrStylesheets(templateContent, linkTags) {
        if (!Array.isArray(linkTags) || linkTags.length === 0) return templateContent;

        const seen = new Set();
        const blocks = [];
        for (const originalTag of linkTags) {
            const tag = originalTag.trim().replace(/\s+/g, ' ');
            if (!tag || seen.has(tag)) continue;
            seen.add(tag);
            const id = `saola-css-${this.stableHash(tag)}`;
            blocks.push(`@once('${id}')\n${originalTag.trim()}\n@endonce`);
        }
        if (blocks.length === 0) return templateContent;

        const assetBlock = blocks.join('\n');
        // @extends nên đứng đầu view; @pageStart nên bao ngoài page markers.
        const anchor = templateContent.match(/^\s*@(extends|pageStart)\b[^\n]*(?:\n|$)/im);
        if (anchor && anchor.index !== undefined) {
            const position = anchor.index + anchor[0].length;
            return `${templateContent.slice(0, position)}${assetBlock}\n${templateContent.slice(position)}`;
        }
        return `${assetBlock}\n${templateContent}`;
    }

    /** Hash DJB2 ngắn, chỉ dùng làm Blade @once identity. */
    stableHash(value) {
        let hash = 5381;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
        }
        return hash.toString(36);
    }

    /**
     * Generate view path từ namespace và relative path
     * Ví dụ: namespace="web", relativePath="pages/home/Index.sao"
     * → "web.pages.home.Index"
     */
    generateViewPath(namespace, relativePath) {
        // Remove .sao extension
        const pathWithoutExt = relativePath.replace(/\.sao$/, '');
        
        // Convert path separators to dots
        const pathParts = pathWithoutExt.split(path.sep).filter(p => p);
        
        // Combine namespace with path parts
        return [namespace, ...pathParts].join('.');
    }

    /**
     * Generate JS file name từ view path
     * Ví dụ: "web.pages.home.hero-section" → "WebPagesHomeHeroSection.js"
     * Loại bỏ ký tự đặc biệt, convert sang PascalCase
     */
    generateJsFileName(viewPath) {
        // Convert to PascalCase, loại bỏ ký tự đặc biệt
        const className = viewPath
            .split('.')
            .map(part => this.toPascalCase(part))
            .join('');
        
        return `${className}.js`;
    }

    /**
     * Convert string sang PascalCase, loại bỏ ký tự đặc biệt
     * Giữ nguyên internal capitals (useState → UseState)
     * Ví dụ: "hero-section" → "HeroSection"
     *        "user_profile" → "UserProfile"
     *        "useState" → "UseState"
     */
    toPascalCase(str) {
        return str
            // Split by dấu gạch ngang, gạch dưới, space
            .split(/[-_\s]+/)
            // Capitalize chữ cái đầu mỗi từ, giữ nguyên phần còn lại
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            // Join lại
            .join('');
    }

    /**
     * Generate component name từ view path (chỉ lấy tên file cuối cùng)
     * Ví dụ: "web.pages.home.hero-section" → "HeroSection"
     *        "admin.views.templates.todo-list" → "TodoList"
     * Loại bỏ ký tự đặc biệt, convert sang PascalCase
     */
    generateComponentName(viewPath) {
        // Lấy phần cuối cùng của view path (tên file)
        const parts = viewPath.split('.');
        const fileName = parts[parts.length - 1];
        
        // Convert to PascalCase, loại bỏ ký tự đặc biệt
        return this.toPascalCase(fileName);
    }

    /**
     * Generate factory function name từ view path (include full path)
     * Format: PascalCase, context + path + filename
     * Ví dụ: "admin.templates.demo3" → "AdminTemplatesDemo3"
     *        "web.pages.home" → "WebPagesHome"
     */
    generateFactoryFunctionName(viewPath) {
        // Split view path và convert mỗi part to PascalCase
        const parts = viewPath.split('.');
        
        // Convert all parts to PascalCase
        return parts.map(part => this.toPascalCase(part)).join('');
    }

    /**
     * Parse .sao file thành các phần
     * .sao file format:
     * @useState($var, value)     <- declarations
     * @const($API = '/api')
     * <blade>...</blade>         <- template
     * <script>...</script>        <- script
     * <style>...</style>         <- style
     */
    parseSaoFile(content, saoFilePath = null) {
        const parts = {
            declarations: [],
            blade: '',
            script: '',
            ssrContent: '',  // Content from @ssr blocks (for blade file only)
            cleanedContent: '',  // Store content after @ssr removal for script extraction
            wrapperType: null // 'sao:blade', 'template', 'blade', or null (no wrapper)
        };

        // ========================================================================
        // PRIORITY 0: Extract @ssr blocks content (for blade) and prepare clean content (for JS)
        // ========================================================================
        // @serverSide/@endServerSide, @ssr/@endssr, @useSSR/@enduseSSR, etc.
        // - Blade file (server-side): Include content INSIDE @ssr blocks (remove only directives)
        // - JS file (client-side): Exclude @ssr blocks completely (remove directives + content)
        
        // For Blade: keep @ssr/@endssr directives in content so hydrate processor
        // can skip ID generation for SSR-only elements, then strip directives after processing
        const contentForBlade = content; // Preserve original with @ssr directives
        parts.ssrContent = ''; // No longer used separately
        
        // Remove @ssr blocks completely from content (for JS file)
        const contentWithoutSSR = content.replace(
            /@(?:serverside|serverSide|ssr|SSR|useSSR|useSsr)\b[\s\S]*?@end(?:serverside|serverSide|ServerSide|SSR|Ssr|ssr|useSSR|useSsr)\b/gi,
            ''
        );
        
        // Use content without SSR for all client-side processing
        content = contentWithoutSSR;
        
        // Store cleaned content for later script extraction (JS file)
        parts.cleanedContent = content;

        // ========================================================================
        // Extract blade/template wrapper bounds first to filter out local declarations
        // ========================================================================
        // Find all level-0 <blade> and <template> tags (not nested)
        // Strategy: Parse character by character to track nesting depth
        // Quét vị trí trên bản ĐÃ LÀM TRẮNG comment, cắt nội dung từ bản GỐC.
        // `{{-- <template>...</template> --}}` mà không che thì thẻ bọc trong
        // CHÚ THÍCH bị coi là thẻ bọc thật: template thật bị bỏ qua và view
        // render nội dung chú thích. Làm trắng giữ độ dài nên offset còn dùng
        // được. Song sinh với WrapperScanner::scan() bên PHP (§21).
        const findLevel0Wrappers = (original, tagName) => {
            const text = blankBladeComments(original);
            const wrappers = [];
            const openTag = `<${tagName}>`;
            const closeTag = `</${tagName}>`;
            let pos = 0;
            
            while (pos < text.length) {
                const openPos = text.indexOf(openTag, pos);
                if (openPos === -1) break;
                
                // Find matching close tag by tracking depth
                let depth = 1;
                let searchPos = openPos + openTag.length;
                let closePos = -1;
                
                while (searchPos < text.length && depth > 0) {
                    const nextOpen = text.indexOf(openTag, searchPos);
                    const nextClose = text.indexOf(closeTag, searchPos);
                    
                    if (nextClose === -1) break; // No matching close tag
                    
                    if (nextOpen !== -1 && nextOpen < nextClose) {
                        // Found nested open tag
                        depth++;
                        searchPos = nextOpen + openTag.length;
                    } else {
                        // Found close tag
                        depth--;
                        if (depth === 0) {
                            closePos = nextClose;
                        }
                        searchPos = nextClose + closeTag.length;
                    }
                }
                
                if (closePos !== -1) {
                    // Found complete level-0 wrapper
                    const innerContent = original.substring(openPos + openTag.length, closePos);
                    wrappers.push({
                        fullMatch: original.substring(openPos, closePos + closeTag.length),
                        innerContent: innerContent,
                        startPos: openPos,
                        endPos: closePos + closeTag.length,
                        tagName: tagName
                    });
                    pos = closePos + closeTag.length;
                } else {
                    // No matching close, move forward
                    pos = openPos + openTag.length;
                }
            }
            
            return wrappers;
        };
        
        // Find all level-0 wrappers for each tag type
        const saoBladeWrappers = findLevel0Wrappers(content, 'sao:blade');
        const templateWrappers = findLevel0Wrappers(content, 'template');
        const bladeWrappers = findLevel0Wrappers(content, 'blade');
        
        // Combine all found wrappers
        const allFoundWrappers = [...saoBladeWrappers, ...templateWrappers, ...bladeWrappers];
        
        // Filter out wrappers that are INSIDE other wrappers (keep only true level-0)
        const trulyLevel0Wrappers = [];
        for (const wrapper of allFoundWrappers) {
            let isInside = false;
            for (const other of allFoundWrappers) {
                if (wrapper !== other) {
                    // Check if wrapper is inside other
                    if (wrapper.startPos > other.startPos && wrapper.endPos < other.endPos) {
                        isInside = true;
                        break;
                    }
                }
            }
            if (!isInside) {
                trulyLevel0Wrappers.push(wrapper);
            }
        }
        
        // Sort by position (to get first one)
        const allWrappers = trulyLevel0Wrappers.sort((a, b) => a.startPos - b.startPos);

        // Extract declarations (@useState, @const, @let, @var, @vars)
        // Support nested parentheses like: @let([$x, $y] = useState($data))
        // CRITICAL: Preserve original order from source file
        const declarationTypes = ['useState', 'const', 'let', 'var', 'vars', 'state', 'props', 'states', 'import', 'asset', 'assets'];
        const foundDeclarations = [];
        
        // Ví dụ trong comment không phải khai báo thật; offset vẫn khớp content gốc.
        const scanContent = blankBladeComments(content);

        for (const type of declarationTypes) {
            const regex = new RegExp(`@${type}\\s*\\(`, 'g');
            let match;
            while ((match = regex.exec(scanContent)) !== null) {
                // Find matching closing parenthesis
                let depth = 1;
                let i = match.index + match[0].length;
                while (i < scanContent.length && depth > 0) {
                    if (scanContent[i] === '(') depth++;
                    else if (scanContent[i] === ')') depth--;
                    i++;
                }
                if (depth === 0) {
                    const declaration = content.substring(match.index, i);
                    
                    // Check if this declaration falls inside any level-0 wrapper
                    let isInsideWrapper = false;
                    for (const wrapper of allWrappers) {
                        if (match.index >= wrapper.startPos && i <= wrapper.endPos) {
                            isInsideWrapper = true;
                            break;
                        }
                    }
                    
                    if (!isInsideWrapper) {
                        foundDeclarations.push({
                            text: declaration,
                            index: match.index
                        });
                    }
                }
            }
        }
        
        // Sort by original position in file to preserve order
        foundDeclarations.sort((a, b) => a.index - b.index);
        parts.declarations = foundDeclarations.map(d => d.text);

        // Extract @await and @fetch directives (these are NOT declarations, but compiler flags)
        // @await/@fetch nêu trong CHÚ THÍCH không phải cờ thật — không che thì
        // view đi gọi API chỉ vì tài liệu có nhắc tới nó. Làm trắng giữ nguyên
        // độ dài nên index dưới đây vẫn trỏ đúng `content` gốc (§21).
        const flagScan = blankBladeComments(content);
        const awaitMatch = flagScan.match(/@await(\s|$)/);
        // Phải lấy TRỌN `@fetch(...)`, không chỉ `@fetch(`. Chèn mảnh cụt lên
        // đầu template làm bước strip sau đó (/@fetch\s*\([^)]*\)/) không khớp
        // được, và nó nuốt luôn phần đầu template — view mất cây render JS.
        const fetchOpen = flagScan.match(/@fetch\s*\(/);
        let fetchMatch = null;
        if (fetchOpen) {
            let depth = 1;
            let k = fetchOpen.index + fetchOpen[0].length;
            while (k < content.length && depth > 0) {
                if (content[k] === '(') depth++;
                else if (content[k] === ')') depth--;
                k++;
            }
            fetchMatch = [depth === 0 ? content.slice(fetchOpen.index, k) : fetchOpen[0]];
        }
        
        // ========================================================================
        // Extract blade/template wrapper (PRIORITY: handle nested/multiple wrappers)
        // ========================================================================
        // Rules:
        // 1. If multiple nested wrappers: take level-0 (outermost) wrapper
        // 2. If multiple level-0 wrappers: take FIRST one, remove others
        // 3. Content inside level-0 wrapper is ALL blade content (even inner <template>/<blade> tags are HTML)
        // 4. Script/style tags INSIDE level-0 wrapper: keep as-is (don't extract)
        // 5. Script/style tags OUTSIDE wrapper: extract normally (unless in @ssr)
        
        let hasLevel0Wrapper = false;
        let bladeContentFromWrapper = null;
        
        if (allWrappers.length > 0) {
            hasLevel0Wrapper = true;
            
            // Take FIRST wrapper (lowest startPos)
            const firstWrapper = allWrappers[0];
            bladeContentFromWrapper = firstWrapper.innerContent.trim();
            parts.wrapperType = firstWrapper.tagName;
            
            // Remove ALL level-0 wrappers from content (for script/style extraction later)
            // This ensures script/style inside wrappers are not extracted
            let contentWithoutWrappers = content;
            for (const wrapper of allWrappers) {
                contentWithoutWrappers = contentWithoutWrappers.replace(wrapper.fullMatch, '');
            }
            content = contentWithoutWrappers;
        }
        
        // Set blade content
        if (hasLevel0Wrapper) {
            parts.blade = bladeContentFromWrapper;
            // Prepend @await/@fetch if they exist
            if (awaitMatch) parts.blade = '@await\n' + parts.blade;
            if (fetchMatch) parts.blade = fetchMatch[0] + '\n' + parts.blade;
        } else {
            // No level-0 wrapper: use old logic (extract content minus script/style)
            let tempContent = content;
            // Remove script tags
            tempContent = stripOutsideComments(/<script[\s\S]*?<\/script>/gi, tempContent);
            // Remove style tags
            tempContent = stripOutsideComments(/<style[\s\S]*?<\/style>/gi, tempContent);
            // Remove declarations (using extracted declarations list)
            parts.declarations.forEach(decl => {
                tempContent = tempContent.replace(decl, '');
            });
            parts.blade = tempContent.trim();
        }

        // Build blade content WITH SSR inline (for blade output file)
        // Re-extract from contentForBlade which has @ssr directives stripped but content kept
        if (hasLevel0Wrapper) {
            // Extract inner content from the same wrapper in contentForBlade
            const saoBladeWrappersForSSR = findLevel0Wrappers(contentForBlade, 'sao:blade');
            const templateWrappersForSSR = findLevel0Wrappers(contentForBlade, 'template');
            const bladeWrappersForSSR = findLevel0Wrappers(contentForBlade, 'blade');
            const allWrappersForSSR = [...saoBladeWrappersForSSR, ...templateWrappersForSSR, ...bladeWrappersForSSR]
                .filter(w => {
                    let isInside = false;
                    for (const other of [...saoBladeWrappersForSSR, ...templateWrappersForSSR, ...bladeWrappersForSSR]) {
                        if (w !== other && w.startPos > other.startPos && w.endPos < other.endPos) {
                            isInside = true;
                            break;
                        }
                    }
                    return !isInside;
                })
                .sort((a, b) => a.startPos - b.startPos);
            if (allWrappersForSSR.length > 0) {
                parts.bladeWithSSR = allWrappersForSSR[0].innerContent.trim();
            } else {
                parts.bladeWithSSR = parts.blade;
            }
            if (awaitMatch) parts.bladeWithSSR = '@await\n' + parts.bladeWithSSR;
            if (fetchMatch) parts.bladeWithSSR = fetchMatch[0] + '\n' + parts.bladeWithSSR;
        } else {
            let tempContentSSR = contentForBlade;
            tempContentSSR = stripOutsideComments(/<script[\s\S]*?<\/script>/gi, tempContentSSR);
            tempContentSSR = stripOutsideComments(/<style[\s\S]*?<\/style>/gi, tempContentSSR);
            parts.declarations.forEach(decl => {
                tempContentSSR = tempContentSSR.replace(decl, '');
            });
            parts.bladeWithSSR = tempContentSSR.trim();
        }

        // Extract script (only from content WITHOUT wrappers)
        const scriptMatch = matchOutsideComments(/<script[^>]*>([\s\S]*?)<\/script>/i, content);
        if (scriptMatch) {
            parts.script = scriptMatch[1].trim();
        }

        // `<style>` KHÔNG bóc ở đây: compiler PHP (SourceSplitter → BladeEmitter)
        // mới là bên xử lý, nó đưa CSS vào `styles` của view kèm class scope.
        // Chỗ này từng gán `parts.style` mà không ai đọc — tàn dư đường parse JS cũ.

        // Store cleaned content (after removing wrappers) for script setup extraction
        parts.cleanedContent = content;

        return parts;
    }

    /**
     * Tìm CLI do Composer cài. SAOLA_PHP_COMPILER luôn có ưu tiên cao nhất;
     * các đường sibling chỉ là fallback cho workspace phát triển hệ sinh thái.
     */
    resolvePhpCompilerPath(projectRoot = process.cwd(), required = true) {
        const explicit = process.env.SAOLA_PHP_COMPILER;
        const candidates = [
            explicit && (path.isAbsolute(explicit) ? explicit : path.resolve(projectRoot, explicit)),
            path.resolve(projectRoot, 'vendor/bin/saoc'),
            path.resolve(projectRoot, 'vendor/saola/compiler/bin/saoc'),
            path.resolve(process.cwd(), 'vendor/bin/saoc'),
            path.resolve(__dirname, '../../compiler/bin/saoc'),
        ].filter(Boolean);

        const found = candidates.find(candidate => fs.existsSync(candidate));
        if (found) {
            this.phpCompilerPath = found;
            return found;
        }

        this.phpCompilerPath = null;
        if (required) {
            throw new Error(
                'Không tìm thấy saola/compiler. Chạy `composer require saola/compiler` ' +
                'hoặc đặt SAOLA_PHP_COMPILER=/đường/dẫn/tới/bin/saoc.'
            );
        }
        return null;
    }

    /** Gửi source qua stdin, nhận cả Blade và JS từ một tiến trình PHP. */
    compileWithPhp(source, options) {
        if (this.phpWorker) {
            return new Promise((resolve, reject) => {
                const id = ++this.phpWorkerRequestId;
                this.phpWorkerPending.set(id, { resolve, reject });
                this.phpWorker.stdin.write(JSON.stringify({ id, cmd: 'compile', source, options }) + '\n');
            });
        }
        return new Promise((resolve, reject) => {
            let phpCompilerPath;
            try {
                phpCompilerPath = this.resolvePhpCompilerPath(this.projectRoot || process.cwd());
            } catch (error) {
                reject(error);
                return;
            }
            const args = [phpCompilerPath, 'compile', '-', '--json'];
            const optionNames = {
                viewPath: 'view-path', functionName: 'fn', factoryName: 'factory',
                namespace: 'namespace', emit: 'emit', lang: 'lang',
                idMode: 'id-mode', assetPrefix: 'asset-prefix'
            };
            for (const [key, cliName] of Object.entries(optionNames)) {
                if (options[key] !== undefined && options[key] !== null) {
                    args.push(`--${cliName}=${options[key]}`);
                }
            }
            if (options.sandbox) args.push('--sandbox');

            const child = spawn(process.env.SAOLA_PHP_BINARY || 'php', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: this.projectRoot || path.dirname(phpCompilerPath)
            });
            // setEncoding thay vì data.toString(): toString() giải mã TỪNG CHUNK
            // riêng lẻ, nên ký tự UTF-8 nhiều byte nằm vắt qua ranh giới chunk sẽ
            // vỡ thành ký tự thay thế (`nhánh` → `nh<?><?>nh`). setEncoding dùng
            // StringDecoder, nó giữ lại byte dở dang chờ chunk sau.
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', data => { stdout += data; });
            child.stderr.on('data', data => { stderr += data; });
            child.on('error', error => reject(new Error(`Failed to spawn PHP compiler: ${error.message}`)));
            child.on('close', code => {
                if (code !== 0) {
                    reject(new Error(stderr.trim() || `PHP compiler exited with code ${code}`));
                    return;
                }
                // Compile THÀNH CÔNG vẫn có thể kèm cảnh báo (vd: tên builtin JS
                // rơi vào Blade — CSR chạy, SSR nổ). Nhánh worker ở watch mode
                // đã chuyển tiếp stderr sẵn; nhánh này trước đây nuốt mất.
                if (stderr.trim()) process.stderr.write(stderr);
                try {
                    const result = JSON.parse(stdout);
                    if (typeof result.blade !== 'string' || typeof result.js !== 'string') {
                        throw new Error('PHP compiler returned incomplete output');
                    }
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Invalid PHP compiler response: ${error.message}`));
                }
            });
            child.stdin.end(source);
        });
    }

    /** Khởi động NDJSON worker cho watch mode để tránh PHP startup mỗi lần sửa. */
    startPhpWorker() {
        if (this.phpWorker) return;
        const phpCompilerPath = this.resolvePhpCompilerPath(this.projectRoot || process.cwd());
        const worker = spawn(process.env.SAOLA_PHP_BINARY || 'php', [phpCompilerPath, 'serve'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: this.projectRoot || path.dirname(phpCompilerPath)
        });
        this.phpWorker = worker;
        this.phpWorkerBuffer = '';
        // Xem giải thích ở compileWithPhp: giải mã theo chunk làm vỡ UTF-8
        worker.stdout.setEncoding('utf8');
        worker.stdout.on('data', data => {
            this.phpWorkerBuffer += data;
            while (true) {
                const newline = this.phpWorkerBuffer.indexOf('\n');
                if (newline < 0) break;
                const line = this.phpWorkerBuffer.slice(0, newline);
                this.phpWorkerBuffer = this.phpWorkerBuffer.slice(newline + 1);
                if (!line.trim()) continue;
                try {
                    const response = JSON.parse(line);
                    const pending = this.phpWorkerPending.get(response.id);
                    if (!pending) continue;
                    this.phpWorkerPending.delete(response.id);
                    if (response.ok) pending.resolve(response);
                    else pending.reject(new Error(response.error || 'PHP worker compile failed'));
                } catch (error) {
                    for (const pending of this.phpWorkerPending.values()) pending.reject(error);
                    this.phpWorkerPending.clear();
                }
            }
        });
        worker.stderr.on('data', data => process.stderr.write(data));
        const failPending = error => {
            for (const pending of this.phpWorkerPending.values()) pending.reject(error);
            this.phpWorkerPending.clear();
            this.phpWorker = null;
        };
        worker.on('error', error => failPending(new Error(`PHP worker error: ${error.message}`)));
        worker.on('close', code => failPending(new Error(`PHP worker stopped with code ${code}`)));
    }

    /**
     * Ensure directory exists
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Copy directory recursively
     */
    copyDirectory(src, dest) {
        // Ensure destination exists
        this.ensureDir(dest);

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Copy app files to compiled.app
     */
    async copyAppFiles(contextConfig, projectRoot, paths, contextName) {
        const appSources = contextConfig.app || [];
        const compiledAppDest = contextConfig.compiled?.app;

        if (!compiledAppDest) {
            console.log('   ⚠️  No compiled.app configured, skipping app files copy');
            return;
        }

        if (appSources.length === 0) {
            console.log('   ℹ️  No app sources configured, skipping app files copy');
            return;
        }

        console.log(`\n📦 Copying app files for context: ${contextName}`);
        
        // Resolve destination and ensure it exists
        const destDir = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledAppDest);
        
        // Create destination folder if not exists
        if (!fs.existsSync(destDir)) {
            this.ensureDir(destDir);
            console.log(`   📁 Created compiled directory: ${compiledAppDest}`);
        }

        let totalCopied = 0;
        for (const appRelPath of appSources) {
            const srcDir = ConfigManager.resolveAppPath(projectRoot, paths, appRelPath);
            
            // Skip if source doesn't exist - don't fail, just warn
            if (!fs.existsSync(srcDir)) {
                console.log(`   ⚠️  Source not found, skipping: ${appRelPath}`);
                continue;
            }

            console.log(`   📁 ${appRelPath} → ${compiledAppDest}`);
            
            // Copy all contents from src to dest
            const entries = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(srcDir, entry.name);
                const destPath = path.join(destDir, entry.name);

                if (entry.isDirectory()) {
                    this.copyDirectory(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
                totalCopied++;
            }
        }

        if (totalCopied > 0) {
            console.log(`   ✅ Copied ${totalCopied} items to ${compiledAppDest}`);
        } else {
            console.log(`   ℹ️  No files copied (sources not found or empty)`);
        }
    }

    /**
     * Generate registry file for context
     */
    async generateRegistry(contextConfig, projectRoot, paths, contextName) {
        const registryPath = contextConfig.compiled?.registry;
        const viewsPath = contextConfig.compiled?.views;

        if (!registryPath) {
            console.log('   ⚠️  No compiled.registry configured, skipping registry generation');
            return;
        }

        if (!viewsPath) {
            console.log('   ⚠️  No compiled.views configured, cannot generate registry');
            return;
        }

        console.log(`\n📝 Generating registry for context: ${contextName}`);

        // Get compiled views for this context.
        //
        // SẮP XẾP: processSaoFile chạy qua Promise.all nên thứ tự HOÀN THÀNH
        // đổi mỗi lần build, làm registry.ts sinh ra khác nhau dù nguồn không
        // đổi. Build không tái lập được thì `git diff` đầy nhiễu và bundler
        // đổi hash chunk vô cớ. Sắp theo namingPath cho ổn định.
        const compiledViews = [...(this.compiledViews[contextName] || [])]
            .sort((a, b) => a.namingPath.localeCompare(b.namingPath));
        
        if (compiledViews.length === 0) {
            console.log('   ℹ️  No compiled views found, skipping registry generation');
            return;
        }

        // Resolve paths
        const registryFullPath = ConfigManager.resolveCompiledPath(projectRoot, paths, registryPath);
        const viewsDir = ConfigManager.resolveCompiledPath(projectRoot, paths, viewsPath);

        // Code-splitting: bật qua `registry.lazy` trong context config.
        // `registry.eager` liệt kê view giữ eager (dot-path hoặc tiền tố) —
        // nên gồm view entry của route hay được truy cập nhất, vì view entry
        // lazy làm hydrate phải chờ tải chunk mới tương tác được.
        const registryOptions = contextConfig.registry || {};
        RegistryGenerator.generate(
            contextName,
            compiledViews,
            registryFullPath,
            viewsDir,
            registryOptions
        );

        console.log(`   ✅ Registry: ${compiledViews.length} views registered`
            + (registryOptions.lazy ? ' (lazy code-splitting: ON)' : ''));
    }

    /**
     * Find all .sao files recursively
     */
    findSaoFiles(dirPath) {
        const files = [];

        const walkDir = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        // Skip node_modules and hidden directories
                        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                            walkDir(fullPath);
                        }
                    } else if (entry.name.endsWith('.sao')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`⚠️  Error reading directory ${dir}: ${error.message}`);
            }
        };

        if (fs.existsSync(dirPath)) {
            walkDir(dirPath);
        } else {
            console.warn(`⚠️  Source directory not found: ${dirPath}`);
        }

        return files.sort();
    }

    /**
     * Setup file watcher for development
     */
    async setupWatcher(config, projectRoot, singleContext = null) {
        try {
            this.startPhpWorker();
            const chokidar = require('chokidar');
            // Watch the actual .sao views directory. New-format config keeps it at
            // paths.saoView (e.g. "resources/saola"); fall back to legacy config.root.
            const saoViewDir = (config.paths && config.paths.saoView)
                ? config.paths.saoView
                : (config.root || 'resources/sao');
            const saoFilesDir = path.resolve(projectRoot, saoViewDir);

            console.log(`\n👀 Watching for changes in ${saoFilesDir}...`);

            const watcher = chokidar.watch(saoFilesDir, {
                ignored: /(^|[\\/])(node_modules|\.[^\\/]+)([\\/]|$)/,
                persistent: true,
                awaitWriteFinish: {
                    stabilityThreshold: 100,
                    pollInterval: 100
                }
            });

            let buildTimeout;
            const debounce = (callback) => {
                return () => {
                    clearTimeout(buildTimeout);
                    buildTimeout = setTimeout(callback, 500);
                };
            };

            const rebuildContexts = debounce(async () => {
                try {
                    if (singleContext) {
                        await this.buildContext(config, projectRoot, singleContext);
                    } else {
                        await this.buildAllContexts(config, projectRoot);
                    }
                } catch (error) {
                    console.error(`\n❌ Compilation error: ${error.message}`);
                }
            });

            watcher.on('change', (filePath) => {
                if (filePath.endsWith('.sao')) {
                    console.log(`\n📝 Change detected: ${path.relative(saoFilesDir, filePath)}`);
                    rebuildContexts();
                }
            });

            watcher.on('add', (filePath) => {
                if (filePath.endsWith('.sao')) {
                    console.log(`\n✨ New file: ${path.relative(saoFilesDir, filePath)}`);
                    rebuildContexts();
                }
            });

            watcher.on('unlink', (filePath) => {
                if (filePath.endsWith('.sao')) {
                    console.log(`\n🗑️  File deleted: ${path.relative(saoFilesDir, filePath)}`);
                    // Could optionally trigger rebuild to clean up generated files
                }
            });

            this.watcherInstances.push(watcher);

        } catch (error) {
            console.error(`⚠️  Watch mode setup failed: ${error.message}`);
            if (error.message.includes('Cannot find module')) {
                console.error('Install chokidar: npm install --save-dev chokidar');
            }
        }
    }

    /**
     * Close all watchers
     */
    closeWatchers() {
        for (const watcher of this.watcherInstances) {
            watcher.close();
        }
        this.watcherInstances = [];
        if (this.phpWorker) {
            this.phpWorker.stdin.end();
            this.phpWorker.kill();
            this.phpWorker = null;
        }
    }

    /**
     * Clean temp folder for a context before compiling
     * Removes views, app folders and registry file
     */
    async cleanContextTemp(contextConfig, projectRoot, paths, contextName) {
        const compiledConfig = contextConfig.compiled || {};
        
        console.log(`🧹 Cleaning compiled for context: ${contextName}`);
        
        // Get paths to clean
        const pathsToClean = [];
        
        // Views folder
        if (compiledConfig.views) {
            const viewsPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.views);
            pathsToClean.push({ path: viewsPath, type: 'views' });
        }
        
        // App folder
        if (compiledConfig.app) {
            const appPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.app);
            pathsToClean.push({ path: appPath, type: 'app' });
        }
        
        // Registry file
        if (compiledConfig.registry) {
            const registryPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
            pathsToClean.push({ path: registryPath, type: 'registry' });
        }

        
        // Clean each path
        for (const item of pathsToClean) {
            try {
                if (fs.existsSync(item.path)) {
                    const stat = fs.statSync(item.path);
                    if (stat.isDirectory()) {
                        fs.rmSync(item.path, { recursive: true, force: true });
                        console.log(`   ✓ Removed ${item.type}: ${path.basename(item.path)}/`);
                    } else {
                        fs.unlinkSync(item.path);
                        console.log(`   ✓ Removed ${item.type}: ${path.basename(item.path)}`);
                    }
                }
            } catch (error) {
                console.warn(`   ⚠️  Could not clean ${item.type}: ${error.message}`);
            }
        }
    }

    /**
     * Xoá `.blade.php` không còn nguồn `.sao` nào sinh ra nó.
     *
     * Trước đây cây Blade KHÔNG bao giờ được dọn → xoá một `.sao` là để lại file
     * mồ côi sống mãi, và nó vẫn render được.
     *
     * Nhưng cũng KHÔNG xoá sạch cây trước khi compile: làm vậy mở ra một khoảng
     * thời gian view không tồn tại, request nào rơi vào đó thì 500 — đã đo được
     * trên dev server. Quét sau khi ghi xong thì không có khoảng trống nào.
     *
     * Chỉ quét thư mục SUY RA TỪ `contexts.{ctx}.blade`; theme cài lúc chạy
     * không có namespace trong config app nên không bao giờ bị đụng tới.
     */
    sweepOrphanBlade(contextConfig, projectRoot, paths) {
        if (!this.writtenBlade || this.writtenBlade.size === 0) return;

        let removed = 0;
        const walk = (dir) => {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full);
                    try { if (fs.readdirSync(full).length === 0) fs.rmdirSync(full); } catch { /* bỏ qua */ }
                } else if (entry.name.endsWith('.blade.php') && !this.writtenBlade.has(path.resolve(full))) {
                    try { fs.unlinkSync(full); removed++; } catch { /* bỏ qua */ }
                }
            }
        };

        for (const bladeRelPath of Object.values(contextConfig.blade || {})) {
            if (typeof bladeRelPath !== 'string' || bladeRelPath === '') continue;
            walk(ConfigManager.resolveBladePath(projectRoot, paths, bladeRelPath));
        }

        if (removed > 0) console.log(`   ✓ Removed ${removed} orphan blade file(s)`);
    }

    /**
     * Sinh entry `app.{ctx}.js`.
     *
     * Bốn việc, đúng thứ tự:
     *   1. `export *` runtime  → import map của theme trỏ vào đây (§7)
     *   2. `window.Saola`      → script thường dựng được view (§6.4d)
     *   3. gộp bundle nguồn    → app/bootstrap.ts + contexts/{ctx}/app/bootstrap.ts
     *   4. App.start()         → tự nạp APP_CONFIGS.bundles rồi rút hàng đợi App.push
     *
     * KHÔNG đặt `window.App` ở đây: `drainPushQueue()` trong client mới là chỗ
     * thay mảng hàng đợi bằng App thật. Gán sớm là xoá mất hàng đợi.
     */
    async generateAppEntry(contextConfig, projectRoot, paths, contextName) {
        const compiledConfig = contextConfig.compiled || {};
        if (!compiledConfig.registry) return;

        const compiledBase = ConfigManager.resolveCompiledPath(projectRoot, paths, '');
        const entryPath = path.join(compiledBase, `app.${contextName}.js`);

        const registryAbs = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
        const registryTs = registryAbs.replace(/\.(js|ts)$/, '.ts');
        const registryFile = fs.existsSync(registryTs) ? registryTs : registryAbs.replace(/\.(js|ts)$/, '.js');
        const registryImport = './' + path.relative(compiledBase, registryFile)
            .replace(/\\/g, '/')
            .replace(/\.(ts|js)$/, '.js');

        // bootstrap.ts là TUỲ CHỌN — không có thì bỏ qua, không lỗi.
        //
        // Đường dẫn SUY TỪ CONFIG, không hardcode tên thư mục: `contexts.{ctx}.app`
        // trỏ đâu thì bootstrap của context nằm đó. Hardcode một lần là mỗi lần
        // đổi cấu trúc thư mục lại phải sửa builder.
        const saoView = ConfigManager.resolveAppPath(projectRoot, paths, '');
        const sharedDir = String(paths.sharedApp || '_app');
        const ctxAppRel = (contextConfig.app || [])[0] || null;

        const sharedBootstrap = path.join(saoView, sharedDir, 'bootstrap.ts');
        const shared = fs.existsSync(sharedBootstrap);
        const ctxBootstrapPath = ctxAppRel ? path.join(saoView, ctxAppRel, 'bootstrap.ts') : null;
        const ctxBootstrap = ctxBootstrapPath ? fs.existsSync(ctxBootstrapPath) : false;

        const imports = [
            `import * as SaolaRuntime from '@saolabs/client';`,
            `import { app, App, mergeBundles, bootBundles } from '@saolabs/client';`,
            `import registry from '${registryImport}';`,
        ];
        const own = [];
        if (shared) { imports.push(`import sharedBundle from '@sao/${sharedDir}/bootstrap';`); own.push('sharedBundle'); }
        if (ctxBootstrap) { imports.push(`import contextBundle from '@sao/${ctxAppRel}/bootstrap';`); own.push('contextBundle'); }

        const content = `/**
 * ĐƯỢC SINH TỰ ĐỘNG bởi @saolabs/builder — đừng sửa file này.
 * Sinh lúc: ${new Date().toISOString()}
 *
 * Muốn thêm provider / service / helper thì sửa:
 *   ${paths.saoView}/${sharedDir}/bootstrap.ts     (mọi context)
 *   ${paths.saoView}/${ctxAppRel}/bootstrap.ts     (riêng ${contextName})
 */

${imports.join('\n')}

const container = app();

// Namespace runtime cho script KHÔNG phải module (snippet Blade, plugin bên thứ
// ba) — chúng cần class View để dựng view, mà App chỉ là container.
if (typeof window !== 'undefined') window.Saola = SaolaRuntime;

// Bundle nguồn của chính app, gộp theo thứ tự: chung trước, context sau.
const own = mergeBundles([${own.join(', ')}]);

// Top-level await sẽ đẩy build.target lên cao và làm hỏng vài đường phân tích
// tĩnh của rollup — dùng async IIFE.
(async () => {
    await App.start({
        view: {
            container: (typeof window !== 'undefined' && window.APP_CONFIGS?.container) || '#app-root',
            // Bundle nạp rời (theme) đè lên registry này, xử lý trong App.start.
            registry: { ...registry, ...own.views },
        },
        services: own.services,
        helpers: own.helpers,
        providers: own.providers,
    });
    bootBundles(own, container);
})();

// Đích của import map: theme build độc lập \`import ... from '@saolabs/client'\`
// resolve về CHÍNH FILE NÀY, nên hai bên dùng chung một instance runtime (§7).
// Cần \`preserveEntrySignatures: 'exports-only'\` trong vite.config, nếu không
// rollup tree-shake sạch khối export này.
export * from '@saolabs/client';
export { container as App, registry };
`;

        this.ensureDir(path.dirname(entryPath));
        fs.writeFileSync(entryPath, content, 'utf8');
        console.log(`   ✓ Generated entry: app.${contextName}.js`);
    }

    /**
     * Entry của gói theme: MỘT file `main.js` = một `defineBundle`.
     *
     * Context tách hai file để thay view mà không đụng logic; theme thì CHÍNH NÓ
     * đã là đơn vị thay thế nên tách nữa không mua được gì (§8.5.1).
     *
     * `@saolabs/client` để EXTERNAL lúc bundle: import map của trang trỏ nó về
     * entry của app ⇒ dùng chung một instance runtime. Quên external là kéo theo
     * bản runtime thứ hai và hydrate vỡ câm (§7.2b).
     */
    async generateThemeEntry(contextConfig, projectRoot, paths, contextName) {
        const compiledConfig = contextConfig.compiled || {};
        if (!compiledConfig.registry) return;

        const compiledBase = ConfigManager.resolveCompiledPath(projectRoot, paths, '');
        const entryPath = path.join(compiledBase, 'main.js');

        const registryAbs = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
        const registryTs = registryAbs.replace(/\.(js|ts)$/, '.ts');
        const registryFile = fs.existsSync(registryTs) ? registryTs : registryAbs.replace(/\.(js|ts)$/, '.js');
        const registryImport = './' + path.relative(compiledBase, registryFile)
            .replace(/\\/g, '/')
            .replace(/\.(ts|js)$/, '.js');

        const saoView = ConfigManager.resolveAppPath(projectRoot, paths, '');
        const hasApp = fs.existsSync(path.join(saoView, 'app', 'bootstrap.ts'));

        const imports = [
            `import { defineBundle } from '@saolabs/client';`,
            `import registry from '${registryImport}';`,
        ];
        if (hasApp) imports.push(`import themeApp from '@theme/app/bootstrap';`);

        const slug = this.themeConfig.slug || contextName;
        const content = `/**
 * ĐƯỢC SINH TỰ ĐỘNG bởi @saolabs/builder — đừng sửa file này.
 * Gói theme: ${slug}
 * Sinh lúc: ${new Date().toISOString()}
 */

${imports.join('\n')}

// View thì ĐÈ view cùng khoá của app; provider/service thì CỘNG THÊM.
// Theme không được gỡ provider của app — đó là đường để một theme vô hiệu hoá
// hạ tầng của chính ứng dụng.
export default defineBundle({
    name: 'theme:${slug}',
    views: registry,
${hasApp ? `    providers: themeApp?.providers ?? [],
    services: themeApp?.services ?? {},
    helpers: themeApp?.helpers ?? {},
` : ''}});
`;

        this.ensureDir(path.dirname(entryPath));
        fs.writeFileSync(entryPath, content, 'utf8');
        console.log(`   ✓ Generated theme entry: main.js`);

        this.writeThemeManifest(projectRoot, paths, contextConfig);
    }

    /**
     * `theme.json` — manifest phát hành, BUILDER đóng dấu chứ tác giả không gõ.
     *
     * Số nào phải khớp với app thì công cụ ghi, người không bao giờ gõ: một
     * `contract` gõ tay là một con số sai đang chờ tới lượt (§8.3.3).
     */
    writeThemeManifest(projectRoot, paths, contextConfig) {
        const t = this.themeConfig || {};
        const generatedAt = new Date().toISOString();
        const manifest = {
            slug: t.slug || null,
            name: t.name || null,
            version: t.version || '0.0.0',
            context: t.context || 'web',
            contract: Compiler.OUTPUT_CONTRACT,
            idMode: this.compilerOptions?.idMode || 'terse',
            builder: this.readPackageVersion(path.join(__dirname, '..')),
            runtime: this.readPackageVersion(path.join(projectRoot, 'node_modules', '@saolabs', 'client')),
            revision: this.createBuildRevision({ theme: t, generatedAt }),
            generatedAt,
        };

        const distBase = path.resolve(projectRoot, t.dist || 'dist');
        try {
            this.ensureDir(distBase);
            fs.writeFileSync(path.join(distBase, 'theme.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
            console.log(`   ✓ Generated theme.json (contract ${manifest.contract}, idMode ${manifest.idMode}, rev ${manifest.revision})`);
        } catch (e) {
            console.warn(`   ⚠️  Không ghi được theme.json: ${e.message}`);
        }
    }

    /**
     * `public/static/saola/saola.json` — bản đối xứng của `theme.json`.
     *
     * Theme cài vào phải khớp `contract` và `idMode` với app, nếu không marker id
     * lệch và hydrate nhân đôi DOM mà KHÔNG có lỗi nào. Xem §8.3.
     */
    writeBuildManifest(projectRoot, paths) {
        const generatedAt = new Date().toISOString();
        const builder = this.readPackageVersion(path.join(__dirname, '..'));
        const runtime = this.readPackageVersion(path.join(projectRoot, 'node_modules', '@saolabs', 'client'));
        const manifest = {
            contract: Compiler.OUTPUT_CONTRACT,
            idMode: this.compilerOptions?.idMode || 'terse',
            builder,
            runtime,
            revision: this.createBuildRevision({ builder, runtime, generatedAt }),
            generatedAt,
        };

        const publicBase = path.resolve(projectRoot, paths.public || 'public/static/saola');
        try {
            this.ensureDir(publicBase);
            fs.writeFileSync(path.join(publicBase, 'saola.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
            console.log(`   ✓ Generated build manifest: saola.json (contract ${manifest.contract}, idMode ${manifest.idMode})`);
        } catch (e) {
            console.warn(`   ⚠️  Không ghi được saola.json: ${e.message}`);
        }
    }

    readPackageVersion(pkgDir) {
        try {
            return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version || null;
        } catch {
            return null;
        }
    }

    createBuildRevision(seed) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(seed))
            .update(crypto.randomBytes(16))
            .digest('hex')
            .slice(0, 16);
    }

    /**
     * Update views.ts to import context registries
     * @param {Object} config - Full configuration
     * @param {string} projectRoot - Project root path
     * @param {Object} paths - Paths configuration
     * @param {string[]} compiledContexts - List of contexts that were compiled in this run
     */
    async updateViewsFile(config, projectRoot, paths, compiledContexts = []) {
        const contexts = config.contexts || {};
        const compiledBasePath = ConfigManager.resolveCompiledPath(projectRoot, paths, '');
        const viewsFilePath = path.join(compiledBasePath, 'views.ts');
        
        console.log(`\n📝 Updating views.ts`);
        
        // Only include registries from compiled contexts
        const registries = [];
        
        for (const contextName of compiledContexts) {
            const contextConfig = contexts[contextName];
            if (!contextConfig) continue;
            
            const compiledConfig = contextConfig.compiled || {};
            if (!compiledConfig.registry) continue;
            
            const registryPath = ConfigManager.resolveCompiledPath(projectRoot, paths, compiledConfig.registry);
            
            // Check if registry exists (could be .ts or .js)
            const registryTsPath = registryPath.replace(/\.(js|ts)$/, '.ts');
            const registryJsPath = registryPath.replace(/\.(js|ts)$/, '.js');
            
            let actualPath = null;
            if (fs.existsSync(registryTsPath)) {
                actualPath = registryTsPath;
            } else if (fs.existsSync(registryJsPath)) {
                actualPath = registryJsPath;
            }
            
            if (actualPath) {
                // Calculate relative path from views.ts to registry
                const relativePath = path.relative(compiledBasePath, actualPath)
                    .replace(/\\/g, '/')
                    .replace(/\.(ts|js)$/, '.js'); // Import .js for runtime
                
                registries.push({
                    contextName,
                    importPath: `./${relativePath}`,
                    varName: `${contextName}Registry`
                });
            }
        }
        
        if (registries.length === 0) {
            console.log('   ℹ️  No registries found, skipping views.ts update');
            return;
        }
        
        // Generate views.ts content
        const imports = registries.map(r => 
            `import ${r.varName} from '${r.importPath}';`
        ).join('\n');
        
        const spreadEntries = registries.map(r => `    ...${r.varName}`).join(',\n');
        
        const content = `/**
 * Auto-generated Views Registry
 * Combines all context registries into a single export
 * Generated at: ${new Date().toISOString()}
 * 
 * This file is auto-updated when compiling any context.
 * Do not edit manually.
 */

${imports}

/**
 * Combined view registry from all contexts
 */
export const views = {
${spreadEntries}
};

export default views;
`;
        
        // Ensure directory exists
        const dir = path.dirname(viewsFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(viewsFilePath, content, 'utf8');
        console.log(`   ✓ Updated views.ts with ${registries.length} context(s): ${registries.map(r => r.contextName).join(', ')}`);
    }
}

// Main execution
if (require.main === module) {
    const compiler = new Compiler();
    const args = process.argv.slice(2);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        compiler.closeWatchers();
        process.exit(0);
    });

    compiler.run(args).catch(error => {
        console.error('Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = Compiler;
