/** Composer context sources. Authored files stay in the package/project;
 * the effective overlay is disposable build output, never a source publish. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Modes = require('./context-modes');
const source = context => context?._contextSource || context?._contextPackage;

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const slash = value => value.split(path.sep).join('/');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const inside = (root, file) => file === root || file.startsWith(root + path.sep);

function localPath(root, relative, label) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw new Error(`${label}: expected a relative path`);
    const resolved = path.resolve(root, relative);
    if (!inside(path.resolve(root), resolved)) throw new Error(`${label}: path escapes its source root`);
    if (fs.existsSync(resolved) && !inside(fs.realpathSync(root), fs.realpathSync(resolved))) throw new Error(`${label}: symlink escapes its source root`);
    return resolved;
}

function discover(projectRoot, accept = () => true) {
    const composerFile = path.join(projectRoot, 'composer.json');
    const composer = fs.existsSync(composerFile) ? read(composerFile) : {};
    const vendor = path.resolve(projectRoot, composer.config?.['vendor-dir'] || 'vendor');
    const installedFile = path.join(vendor, 'composer/installed.json');
    if (!fs.existsSync(installedFile)) return [];
    const installed = read(installedFile);
    const packages = Array.isArray(installed) ? installed : installed.packages;
    if (!Array.isArray(packages)) throw new Error(`Invalid Composer inventory: ${installedFile}`);
    const found = [];
    for (const pkg of [...packages].sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
        const contexts = pkg.extra?.saola?.contexts;
        if (!contexts) continue; // extra.saola.client continues through the existing runtime loader.
        if (!pkg.name || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(pkg.name) || typeof contexts !== 'object' || Array.isArray(contexts)) throw new Error(`Invalid extra.saola.contexts in ${pkg.name}`);
        const root = path.resolve(vendor, 'composer', pkg['install-path'] || `../${pkg.name}`);
        for (const [context, relative] of Object.entries(contexts)) {
            if (!accept(context)) continue;
            if (!/^[a-z][a-z0-9_-]*$/.test(context)) throw new Error(`Invalid context in ${pkg.name}: ${context}`);
            const file = localPath(root, relative, pkg.name);
            const manifest = read(file);
            if (manifest.package !== pkg.name || manifest.context !== context || manifest.namespace !== context || manifest.contract !== 1) throw new Error(`Invalid context manifest for ${pkg.name}/${context}`);
            if (!Array.isArray(manifest.themes) || !manifest.themes.includes(manifest.defaultTheme)) throw new Error(`Invalid themes in ${file}`);
            if ((manifest.requires?.output || 1) > 2) throw new Error(`${pkg.name} requires a newer output contract`);
            const source = path.dirname(file);
            localPath(source, manifest.bootstrap, pkg.name);
            if (manifest.types) localPath(source, manifest.types, pkg.name);
            for (const name of manifest.themes) {
                if (!/^[a-z][a-z0-9_-]*$/.test(name)) throw new Error(`Invalid theme in ${file}`);
                const theme = read(localPath(source, `themes/${name}/theme.manifest.json`, pkg.name));
                if (theme.name !== name || theme.view_context !== `${context}.${name}` || theme.contract !== 1) throw new Error(`Invalid theme manifest: ${pkg.name}/${name}`);
                localPath(source, `themes/${name}/${theme.views || 'views'}`, pkg.name);
                if (theme.css) localPath(source, `themes/${name}/${theme.css}`, pkg.name);
            }
            found.push({ package: pkg.name, context, source, file, manifest });
        }
    }
    return found;
}

function configure(config, projectRoot) {
    const env = Modes.environment(projectRoot);
    const packages = discover(projectRoot, name => {
        const mode = Modes.mode(name, config.contexts?.[name], env);
        if (!['auto', 'package'].includes(mode)) return false;
        // Published integrations may use the older theme namespace contract.
        // Do not inspect package descriptors until the project opts into package mode.
        const published = path.resolve(projectRoot, config.paths?.saoView || 'resources/saola', name, '.publish-state.json');
        return mode === 'package' || !fs.existsSync(published);
    });
    if (packages.length) Modes.defaults(config);
    for (const pkg of packages) {
        const name = pkg.context;
        const host = config.contexts[name] || {};
        const hostRoot = path.resolve(projectRoot, config.paths.saoView, name);
        // Existing managed publications keep their integration until explicitly migrated.
        if (Modes.mode(name, host, env) !== 'package' && fs.existsSync(path.join(hostRoot, '.publish-state.json'))) continue;
        if (config.contexts[name]?._contextPackage) throw new Error(`Two packages supply context ${name}: ${config.contexts[name]._contextPackage.package}, ${pkg.package}`);
        const effectiveRoot = path.resolve(projectRoot, config.paths.compiled, '_sources', name);
        const themeNames = new Set(pkg.manifest.themes);
        const hostThemes = path.join(hostRoot, 'themes');
        if (fs.existsSync(hostThemes)) for (const entry of fs.readdirSync(hostThemes, {withFileTypes: true})) {
            if (entry.isDirectory() && fs.existsSync(path.join(hostThemes, entry.name, 'theme.manifest.json'))) themeNames.add(entry.name);
        }
        pkg.manifest = {...pkg.manifest, themes: [...themeNames]};
        const views = {};
        const blade = {};
        const css = {};
        for (const themeName of pkg.manifest.themes) {
            const hostManifest = path.join(hostThemes, themeName, 'theme.manifest.json');
            const theme = read(fs.existsSync(hostManifest) ? hostManifest : path.join(pkg.source, 'themes', themeName, 'theme.manifest.json'));
            if (!/^[a-z][a-z0-9_-]*$/.test(themeName) || theme.name !== themeName || theme.view_context !== `${name}.${themeName}` || theme.contract !== 1) throw new Error(`Invalid project theme: ${name}/${themeName}`);
            // All descriptor paths are scoped to the effective theme root.
            const themeRoot = fs.existsSync(hostManifest) ? path.dirname(hostManifest) : path.join(pkg.source, 'themes', themeName);
            localPath(themeRoot, theme.views || 'views', `${name}/${themeName}`);
            if (theme.css) localPath(themeRoot, theme.css, `${name}/${themeName}`);
            const namespace = `${name}.${themeName}`;
            views[namespace] = path.join(effectiveRoot, 'themes', themeName, theme.views || 'views');
            blade[namespace] = `${name}/${themeName}`;
            if (theme.css) {
                const relative = `themes/${themeName}/${theme.css}`;
                css[slash(path.relative(projectRoot, path.join(hostRoot, relative)))] = slash(path.relative(projectRoot, path.join(effectiveRoot, relative)));
                css[`resources/saola/${name}/${slash(relative)}`] = slash(path.relative(projectRoot, path.join(effectiveRoot, relative)));
            }
        }
        // Namespace roots of authored overrides remain configurable. Per-file overrides
        // at the conventional paths are staged over the package automatically.
        const app = [path.join(effectiveRoot, 'app')];
        config.contexts[name] = {
            name, ...host,
            app: [...app, ...(host.app || []).filter(p => path.resolve(projectRoot, config.paths.saoView, p) !== path.join(hostRoot, 'app'))],
            views: { ...views, ...host.views }, blade: { ...blade, ...host.blade },
            compiled: { views: `${name}/views`, registry: `${name}/registry.js`, ...host.compiled, app: null },
            _contextPackage: { ...pkg, kind: 'package', hostRoot, effectiveRoot, css },
        };
    }
    return Modes.localContexts(config, projectRoot, env);
}

function files(root, out = new Map(), prefix = '') {
    if (!fs.existsSync(root)) return out;
    for (const item of fs.readdirSync(root, { withFileTypes: true })) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        const relative = path.join(prefix, item.name);
        const file = path.join(root, item.name);
        if (item.isSymbolicLink()) throw new Error(`Symlink in context source is not supported: ${file}`);
        if (item.isDirectory()) files(file, out, relative);
        else if (item.isFile()) out.set(relative, file);
    }
    return out;
}

/** Write only builder-owned files. Preflight the entire batch before changing anything. */
function writeOwned(inventoryFile, roots, content, anchor = path.dirname(inventoryFile)) {
    const previous = fs.existsSync(inventoryFile) ? read(inventoryFile) : {};
    const permitted = file => roots.some(root => inside(path.resolve(root), path.resolve(file)));
    for (const file of new Set([...Object.keys(previous), ...content.keys()])) {
        if (!permitted(file)) throw new Error(`Generated output escapes its scope: ${file}`);
        if (!inside(path.resolve(anchor), path.resolve(file))) throw new Error(`Generated output escapes its project: ${file}`);
        let ancestor = file;
        while (true) {
            if (fs.existsSync(ancestor) && fs.lstatSync(ancestor).isSymbolicLink()) throw new Error(`Generated output crosses a symlink: ${file}`);
            if (path.resolve(anchor) === ancestor) break;
            ancestor = path.dirname(ancestor);
            if (ancestor === path.dirname(ancestor)) throw new Error(`Invalid output root: ${file}`);
        }
        if (!fs.existsSync(file)) continue;
        const current = hash(fs.readFileSync(file));
        if (previous[file] ? previous[file] !== current : (!content.has(file) || current !== hash(content.get(file)))) throw new Error(`Generated file was customized or is unowned: ${file}`);
    }
    for (const [file, data] of content) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, data);
    }
    for (const file of Object.keys(previous)) if (!content.has(file) && fs.existsSync(file)) fs.unlinkSync(file);
    fs.mkdirSync(path.dirname(inventoryFile), { recursive: true });
    fs.writeFileSync(inventoryFile, JSON.stringify(Object.fromEntries([...content].map(([file, data]) => [file, hash(data)])), null, 2));
}

function prepare(context, config, projectRoot) {
    const pkg = source(context);
    if (!pkg) return;
    let staged = files(pkg.source);
    if (pkg.kind !== 'package') staged = new Map([...staged].filter(([relative]) => {
        const name = slash(relative);
        return name.startsWith('app/') || name.startsWith('assets/') || (pkg.kind === 'standalone' ? name.startsWith('views/') : name.startsWith(`themes/${pkg.selectedTheme}/`));
    }));
    for (const [relative, file] of pkg.kind === 'package' ? files(pkg.hostRoot) : []) {
        if (relative === path.join('app', 'bootstrap.ts')) continue;
        staged.set(relative, file);
    }
    const content = new Map([...staged].map(([relative, source]) => [path.join(pkg.effectiveRoot, relative), fs.readFileSync(source)]));
    const inventory = path.resolve(projectRoot, config.paths.compiled, `.context-source-${pkg.context}.json`);
    writeOwned(inventory, [pkg.effectiveRoot], content, projectRoot);
    for (const name of pkg.manifest.themes) {
        const theme = read(path.join(pkg.effectiveRoot, 'themes', name, 'theme.manifest.json'));
        for (const renderer of Object.values(pkg.manifest.renderers || {})) {
            if (typeof renderer !== 'string' || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(renderer)) throw new Error(`Invalid renderer in ${pkg.package}`);
            const file = path.join(pkg.effectiveRoot, 'themes', name, theme.views || 'views', renderer.replace(/\./g, '/') + '.sao');
            if (!fs.existsSync(file)) throw new Error(`Missing required renderer ${pkg.context}.${name}.${renderer}`);
        }
    }
    pkg.projectBootstrap = pkg.kind === 'package' ? path.join(pkg.hostRoot, 'app/bootstrap.ts') : null;
}

function aliases(config) {
    const managed = Object.values(config.contexts || {}).filter(ctx => source(ctx));
    const resolved = managed.flatMap(ctx => {
        const pkg = source(ctx);
        return [{ find: `@sao/${pkg.context}`, replacement: pkg.effectiveRoot }, { find: `@${pkg.context}`, replacement: pkg.effectiveRoot }];
    });
    if (managed.length) {
        const first = source(managed[0]);
        const root = path.dirname(first.hostRoot);
        resolved.push({find: '@sao', replacement: root}, {find: '@app', replacement: path.join(root, config.paths.sharedApp || '_app')},
            {find: '@compiled', replacement: path.dirname(path.dirname(first.effectiveRoot))});
    }
    return resolved;
}

function watchRoots(config, projectRoot, names) {
    return [...new Set(names.flatMap(name => {
        const ctx = config.contexts?.[name];
        if (!ctx) return [];
        const ctxSource = source(ctx);
        if (ctxSource) return [ctxSource.source, ctxSource.hostRoot,
            path.resolve(projectRoot, config.paths?.saoView || 'resources/saola', config.paths?.sharedApp || '_app')];
        return [...Object.values(ctx.views || {}), ...(ctx.app || [])].map(p => path.resolve(projectRoot, config.paths.saoView || '', p));
    }))];
}

module.exports = { discover, configure, prepare, aliases, watchRoots, files, writeOwned, slash, source };
