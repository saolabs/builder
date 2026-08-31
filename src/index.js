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
const ConfigManager = require('./config-manager');
const { RegistryGenerator } = require('./registry-generator');
const SaolaPreprocessor = require('./preprocessor');

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
        this.preprocessor = new SaolaPreprocessor();
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
        
        // Process all namespace views
        const namespaces = Object.keys(contextConfig.views || {});
        
        if (namespaces.length === 0) {
            console.log('ℹ️  No views namespaces configured\n');
            return;
        }

        let totalFiles = 0;
        const processPromises = [];

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

        console.log(`\n✅ Successfully compiled ${totalFiles} files for context: ${contextName}`);
        
        // Copy app files to compiled.app
        await this.copyAppFiles(contextConfig, projectRoot, paths, contextName);
        
        // Generate registry after all views compiled
        await this.generateRegistry(contextConfig, projectRoot, paths, contextName);
        
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
        const assetPrefix = `${publicUrlBase.replace(/\/?$/, '')}/${contextName}/assets/`;
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
        const jsFileExt = isTypeScript ? '.ts' : '.js';
        const jsFileName = fileNameNoExt + jsFileExt;
        const jsPath = path.join(compiledViewsDir, jsRelativeDir, jsFileName);

        const result = await this.compileWithPhp(fileContent, {
            viewPath,
            functionName: this.generateComponentName(viewPath),
            factoryName: this.generateFactoryFunctionName(viewPath),
            namespace: `${namespace}.`,
            emit: 'both',
            lang: isTypeScript ? 'ts' : 'js',
            idMode: process.env.SAOLA_ID_MODE || 'terse',
            assetPrefix
        });

        this.ensureDir(path.dirname(bladePath));
        this.ensureDir(path.dirname(jsPath));
        fs.writeFileSync(bladePath, result.blade, 'utf-8');
        fs.writeFileSync(jsPath, result.js, 'utf-8');
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
            style: '',
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

        // Extract style (only from content WITHOUT wrappers)
        const styleMatch = matchOutsideComments(/<style[^>]*>([\s\S]*?)<\/style>/i, content);
        if (styleMatch) {
            parts.style = styleMatch[1].trim();
        }
        
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
                ignored: ['node_modules', '.git', '.*'],
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
