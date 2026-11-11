/** Distribution dependency graph; no directory-wide public asset copying. */
const fs = require('node:fs');
const path = require('node:path');
const { RegistryGenerator } = require('./registry-generator');

// Ignore documentation/example strings while keeping executable template interpolations.
function dependencyCode(source) {
    let cursor = 0;
    function read(stopAtBrace = false) {
        let result = '';
        while (cursor < source.length) {
            const char = source[cursor++];
            if (char === '}' && stopAtBrace) return result;
            if (char === '{') { result += '{' + read(true) + '}'; continue; }
            if (char === '/' && source[cursor] === '/') {
                while (cursor < source.length && source[cursor] !== '\n') cursor++;
                result += '\n'; continue;
            }
            if (char === '/' && source[cursor] === '*') {
                const end = source.indexOf('*/', cursor + 1);
                cursor = end < 0 ? source.length : end + 2;
                result += ' '; continue;
            }
            if (char === "'" || char === '"') {
                let value = '';
                while (cursor < source.length) {
                    const next = source[cursor++];
                    if (next === char) break;
                    if (next === '\\') { value += next + (source[cursor++] || ''); } else value += next;
                }
                result += /^[\w.-]+$/.test(value) ? char + value + char : '""';
                continue;
            }
            if (char === '`') {
                let value = '', expressions = '';
                while (cursor < source.length) {
                    const next = source[cursor++];
                    if (next === '`') break;
                    if (next === '\\') { cursor++; value += ' '; }
                    else if (next === '$' && source[cursor] === '{') { cursor++; expressions += '(' + read(true) + ')'; }
                    else value += next;
                }
                result += expressions || (/^[\w.-]+$/.test(value) ? '"' + value + '"' : '""');
                continue;
            }
            result += char;
        }
        return result;
    }
    return read();
}

function reachableViews(entries, viewsDir, routes, systemData = {}, keep = []) {
    const key = entry => entry.namingPath.replace(/\.(?:js|ts)$/, '').replace(/[\\/]/g, '.');
    const byKey = new Map(entries.map(entry => [key(entry), entry]));
    const selected = new Set();
    const queue = [];
    const add = name => { if (byKey.has(name) && !selected.has(name)) { selected.add(name); queue.push(name); } };
    const addRoutes = items => items.forEach(route => { add(route.component); if (route.children) addRoutes(route.children); });
    addRoutes(routes);
    for (const pattern of keep) for (const name of byKey.keys()) if (name === pattern || name.startsWith(pattern.replace(/\.$/, '') + '.')) add(name);
    while (queue.length) {
        const code = dependencyCode(fs.readFileSync(path.join(viewsDir, byKey.get(queue.shift()).actualPath), 'utf8'));
        // Compiled include/layout/component paths retain their literals, even when combined with namespaces.
        for (const match of code.matchAll(/['"]([\w.-]+)['"]/g)) {
            const literal = match[1];
            for (const name of byKey.keys()) if (name === literal || name.endsWith('.' + literal)) add(name);
        }
        // A namespace followed by a computed name cannot be narrowed safely: keep that family.
        for (const match of code.matchAll(/(__\w+__)\s*\+\s*([^\n;,]+)/g)) {
            const expression = match[2].trim();
            const prefix = systemData[match[1]];
            if (typeof prefix !== 'string' || /^(['"])[^'"]+\1\s*(?:$|[}),\];`])/.test(expression)) continue;
            for (const name of byKey.keys()) if (name.startsWith(prefix)) add(name);
        }
    }
    return entries.filter(entry => selected.has(key(entry)));
}

function registryPlugin(compiler, sourceConfig, cfg, temporary, projectRoot) {
    const entries = compiler.compiledViews?.[cfg.context];
    const context = sourceConfig.contexts[cfg.context];
    if (!entries?.length || !context.compiled?.registry) return null;
    const viewsDir = path.resolve(projectRoot, sourceConfig.paths.compiled, context.compiled.views);
    const included = reachableViews(entries, viewsDir, cfg.router.routes, cfg.view?.systemData, cfg.includeViews || []);
    const registry = path.resolve(projectRoot, sourceConfig.paths.compiled, context.compiled.registry).replace(/\.(?:js|ts)$/, '');
    const target = path.join(temporary, 'registry.js');
    RegistryGenerator.generate(cfg.context, included, target, viewsDir, context.registry || {});
    const generated = fs.existsSync(target) ? target : target.replace(/\.js$/, '.ts');
    console.log(`Saola dist views: ${included.length}/${entries.length} reachable`);
    return {
        name: 'saola-dist-view-graph', enforce: 'pre',
        async resolveId(source, importer) {
            const resolved = await this.resolve(source, importer, { skipSelf: true });
            if (resolved?.id.replace(/\.(?:js|ts)$/, '') === registry) return generated;
            return null;
        },
    };
}

function referencedAssets(projectRoot, code, base = '/') {
    const publicRoot = path.join(projectRoot, 'public');
    const selected = new Map();
    const queue = [];
    const add = (url, parent = '/') => {
        if (!url || /^(?:[a-z]+:|\/\/|#)/i.test(url)) return;
        url = url.split(/[?#]/)[0];
        if (base !== '/' && url.startsWith(base)) url = '/' + url.slice(base.length);
        const relative = path.posix.normalize(url.startsWith('/') ? url.slice(1) : path.posix.join(path.posix.dirname(parent), url));
        if (relative === '..' || relative.startsWith('../')) return;
        const from = path.join(publicRoot, relative);
        if (!from.startsWith(publicRoot + path.sep) || !fs.existsSync(from)) return;
        // Do not follow links to resources owned by other packages/themes.
        for (let current = from; current !== publicRoot; current = path.dirname(current)) if (fs.lstatSync(current).isSymbolicLink()) return;
        if (!fs.statSync(from).isFile() || selected.has(relative)) return;
        selected.set(relative, { from, to: relative }); queue.push(relative);
    };
    const scan = (text, parent = '/') => {
        for (const match of text.matchAll(/['"`]((?:\/?(?:static|assets)\/)[^'"`\s<>\\]+)['"`]/g)) add(match[1], '/');
        for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) add(match[1], parent);
        for (const match of text.matchAll(/url\(\s*['"]?([^\s)'";]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) add(match[1] || match[2], parent);
        for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?from\s*)?['"](\.[^'"]+)['"]/g)) add(match[1], parent);
        for (const match of text.matchAll(/\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)) add(match[1], parent);
    };
    scan(code);
    while (queue.length) {
        const relative = queue.shift();
        if (/\.(?:css|js|mjs|html|svg)$/i.test(relative)) scan(fs.readFileSync(selected.get(relative).from, 'utf8'), relative);
    }
    return [...selected.values()];
}

function assetPlugin(projectRoot, cfg, html = '') {
    const sources = new Map();
    return {
        name: 'saola-dist-asset-graph',
        transform(code, id) { sources.set(id, code); return null; },
        generateBundle(_, bundle) {
            const included = [html];
            for (const item of Object.values(bundle)) {
                included.push(item.type === 'chunk' ? item.code : String(item.source));
                if (item.type === 'chunk') for (const id of Object.keys(item.modules)) {
                    if (item.modules[id].renderedLength && sources.has(id)) included.push(sources.get(id));
                }
            }
            cfg.referencedAssets = referencedAssets(projectRoot, included.join('\n'), cfg.base);
        },
    };
}
module.exports = { reachableViews, registryPlugin, referencedAssets, assetPlugin };
