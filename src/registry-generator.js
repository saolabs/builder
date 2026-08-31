/**
 * Registry Generator - Generate view registry for each context
 * Registry file imports all views and exports a mapping object
 */

const fs = require('fs');
const path = require('path');

class RegistryGenerator {
    /**
     * Generate registry file for a context
     * @param {string} contextName - Context name (admin, web, mobile)
     * @param {Array} viewEntries - Array of view entry objects:
     *   - namingPath: path with namespace for factory name (admin/templates/counter.ts)
     *   - actualPath: actual file path relative to viewsDir (templates/counter.ts or admin/templates/counter.ts)
     * @param {string} outputPath - Output path for registry.js/ts
     * @param {string} viewsDir - Base views directory (for calculating relative imports)
     */
    static generate(contextName, viewEntries, outputPath, viewsDir, options = {}) {
        const imports = [];
        const exports = [];

        // Detect if any view is TypeScript
        const hasTypeScript = viewEntries.some(entry => {
            const p = typeof entry === 'string' ? entry : entry.namingPath;
            return p.endsWith('.ts');
        });
        const registryExt = hasTypeScript ? '.ts' : '.js';

        // Update output path extension
        outputPath = outputPath.replace(/\.(js|ts)$/, registryExt);

        // Lazy tắt mặc định → giữ nguyên hành vi eager của mọi app hiện có.
        const lazyEnabled = options.lazy === true;
        const eagerSet = lazyEnabled
            ? this._resolveEagerSet(viewEntries, viewsDir, options.eager || [])
            : null;

        viewEntries.forEach(entry => {
            // Support both old format (string) and new format (object)
            const namingPath = typeof entry === 'string' ? entry : entry.namingPath;
            const actualPath = typeof entry === 'string' ? entry : entry.actualPath;

            // namingPath format: always includes namespace
            // - "admin/templates/counter.ts", "web/pages/home.ts"
            // Factory function name uses namespace from namingPath
            const factoryName = this._toFactoryName(namingPath);
            const dotPath = this._toDotPath(namingPath);

            // Calculate relative path from registry to view file
            // Use actualPath which reflects real file location
            const registryDir = path.dirname(outputPath);
            const fullViewPath = path.join(viewsDir, actualPath);
            const relativePath = path.relative(registryDir, fullViewPath)
                .replace(/\\/g, '/')
                .replace(/\.(ts|js)$/, '.js'); // Always import .js for runtime

            if (lazyEnabled && !eagerSet.has(dotPath)) {
                // Bundler cắt thành chunk riêng; ViewManager.view() await + unwrap .default
                exports.push(`    '${dotPath}': () => import('./${relativePath}')`);
            } else {
                imports.push(`import ${factoryName} from './${relativePath}';`);
                exports.push(`    '${dotPath}': ${factoryName}`);
            }
        });

        // Add types for TypeScript
        const typeImport = hasTypeScript 
            ? `import type { View } from '@saolabs/client';\n\n` 
            : '';
        
        // Lazy entries trả Promise<module> → nới type, nếu không tsc của app sẽ đỏ.
        const registryType = hasTypeScript
            ? (lazyEnabled
                ? ': Record<string, (data?: any, systemData?: any) => View | Promise<any>>'
                : ': Record<string, (data?: any, systemData?: any) => View>')
            : '';

        const content = `/**
 * Auto-generated View Registry for ${contextName} context
 * Generated at: ${new Date().toISOString()}
 * 
 * This file imports all compiled views and exports them as a registry object.
 * Usage in app.ts:
 * 
 * import registry from './one/${contextName}/registry.js';
 * App.View.registerViews(registry);
 */

${typeImport}${imports.join('\n')}

export const ViewRegistry${registryType} = {
${exports.join(',\n')}
};

export default ViewRegistry;
`;

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`   ✓ Generated registry: ${path.basename(outputPath)}`);
    }

    /**
     * Tập view BẮT BUỘC eager khi bật lazy.
     *
     * `@include`/`@extends` resolve ĐỒNG BỘ trong render tree
     * (ViewManager.resolveViewSync) — không await được, nên mọi view làm
     * layout/partial phải có sẵn. Thiên lệch an toàn: KHÔNG CHẮC → EAGER
     * (chỉ mất tối ưu; đoán sai chiều kia là vỡ runtime).
     *
     * @returns {Set<string>} dot-path của các view phải eager
     */
    static _resolveEagerSet(viewEntries, viewsDir, userEager) {
        const dotPaths = viewEntries.map(e => this._toDotPath(typeof e === 'string' ? e : e.namingPath));
        const eager = new Set();

        // 1. Layout (@extends) — theo quy ước thư mục
        dotPaths.forEach(dp => {
            if (/(^|\.)layouts?\./.test(dp)) eager.add(dp);
        });

        // 2. User chỉ định: khớp chính xác hoặc theo tiền tố ('web.modules.home')
        dotPaths.forEach(dp => {
            if (userEager.some(p => dp === p || dp.startsWith(p.endsWith('.') ? p : p + '.'))) {
                eager.add(dp);
            }
        });

        // 3. Quét output đã compile: view nào bị @include/@extends thì eager.
        //    Đường dẫn trong output có tiền tố runtime (__template__ + 'partials.card')
        //    nên chỉ so khớp phần literal theo HẬU TỐ — khớp thừa thì chỉ eager dư.
        const referenced = new Set();
        viewEntries.forEach(entry => {
            const actualPath = typeof entry === 'string' ? entry : entry.actualPath;
            let code;
            try {
                code = fs.readFileSync(path.join(viewsDir, actualPath), 'utf8');
            } catch {
                return; // chưa compile / đã bị xoá → bỏ qua, không chặn build
            }
            // Lấy MỌI string literal trong vùng tham số — tham số đầu của
            // this.include() là element id ("c1"), view path nằm ở tham số sau.
            // Gom hết rồi so khớp; literal thừa (id, tên block) gần như không
            // trùng dot-path nào, mà trùng thì cũng chỉ eager dư.
            const callRe = /\b(?:include|includeIf|includeWhen|extendView)\s*\(/g;
            let call;
            while ((call = callRe.exec(code)) !== null) {
                const args = code.slice(call.index, call.index + 400);
                const litRe = /['"`]([^'"`\n]+)['"`]/g;
                let lit;
                while ((lit = litRe.exec(args)) !== null) referenced.add(lit[1]);
            }
        });
        referenced.forEach(ref => {
            dotPaths.forEach(dp => {
                if (dp === ref || dp.endsWith('.' + ref)) eager.add(dp);
            });
        });

        return eager;
    }

    /**
     * Convert view path to factory function name (PascalCase)
     * Uses namespace from path, NOT context name
     * Giữ nguyên internal capitals (useState → UseState)
     * @param {string} viewPath - View path with namespace (admin/templates/counter.ts, web/pages/home.ts)
     * @returns {string} Factory name (AdminTemplatesCounter, WebPagesHome)
     */
    static _toFactoryName(viewPath) {
        // Remove extension first
        const pathWithoutExt = viewPath.replace(/\.(ts|js)$/, '');
        
        // Split path: admin/templates/counter -> ['admin', 'templates', 'counter']
        const parts = pathWithoutExt.split('/');
        
        // Convert all parts to PascalCase, preserve internal capitals
        return parts.map(part => {
            // Convert part to PascalCase (handle hyphens/underscores)
            // Preserve internal capitals: useState → UseState
            return part.split(/[-_]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');
        }).join('');
    }

    /**
     * Convert file path to dot notation view path
     * "admin/templates/counter.ts" -> "admin.templates.counter"
     */
    static _toDotPath(viewPath) {
        const parts = viewPath
            .replace(/\.(ts|js)$/, '')
            .split(/[\/\\]/)
            .filter(p => p);
        
        return parts.join('.');
    }
}

module.exports = { RegistryGenerator };
