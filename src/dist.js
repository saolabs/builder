/** Standalone SPA packaging. Deliberately independent of Laravel/Vite web config. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const ConfigManager = require('./config-manager');
const Compiler = require('./index');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { registryPlugin, assetPlugin } = require('./dist-dependencies');
const { prerender, staticClientRoutes } = require('./dist-static');
const { prepareFilePreview } = require('./dist-file');
const { loadDistEnv, applyDistEnv } = require('./dist-env');

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const serialize = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const inside = (root, file) => file !== root && file.startsWith(root + path.sep);

function resolveChild(root, relative, label) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw new Error(`${label} must be a relative path`);
    const result = path.resolve(root, relative);
    if (!inside(root, result)) throw new Error(`${label} must stay inside ${root}`);
    return result;
}

// Optional packaging overrides; source contexts remain the single source of truth.
async function loadDistConfig(projectRoot, filename, sourceConfig, mode = 'production') {
    const env = loadDistEnv(projectRoot, mode);
    sourceConfig ||= ConfigManager.loadConfig(projectRoot).config;
    const candidates = filename ? [filename] : ['sao.dist.config.mjs', 'sao.dist.config.json'];
    let extra = {};
    for (const name of candidates) {
        const file = path.resolve(projectRoot, name);
        if (!fs.existsSync(file)) continue;
        extra = file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : (await import(pathToFileURL(file).href)).default;
        if (!extra || typeof extra !== 'object' || !extra.contexts || Array.isArray(extra.contexts)) throw new Error('Dist config requires a contexts object');
        break;
    }
    if (filename && !fs.existsSync(path.resolve(projectRoot, filename))) throw new Error(`Missing dist config: ${filename}`);
    const common = sourceConfig.dist || {};
    const { outDir, staticOutDir, defaultContext, contexts: _, ...defaults } = common;
    const contexts = {};
    for (const [name, source] of Object.entries(sourceConfig.contexts)) {
        contexts[name] = applyDistEnv({
            router: source.router,
            view: source.view,
            ...defaults,
            ...source.dist,
            ...extra.contexts?.[name],
        }, name, env);
    }
    for (const name of Object.keys(extra.contexts || {})) {
        if (!sourceConfig.contexts[name]) throw new Error(`Unknown source context: ${name}`);
    }
    return { outDir, staticOutDir, defaultContext: defaultContext || (contexts.web ? 'web' : Object.keys(contexts)[0]), ...extra, contexts };
}

async function exportRuntimeConfig(projectRoot, contexts) {
    if (!fs.existsSync(path.join(projectRoot, 'bootstrap/app.php'))) {
        throw new Error('No Laravel bootstrap found. For a client-only project, declare router.routes in the existing context configuration.');
    }
    const temporary = fs.mkdtempSync(path.join(projectRoot, '.saola-dist-'));
    const output = path.join(temporary, 'runtime.json');
    try {
        await promisify(execFile)(process.env.SAOLA_PHP_BINARY || 'php', [
            path.join(__dirname, 'export-dist.php'), projectRoot, output, ...contexts,
        ], { cwd: projectRoot, maxBuffer: 4 * 1024 * 1024 });
        return JSON.parse(fs.readFileSync(output, 'utf8'));
    } catch (error) {
        throw new Error(`Unable to export Saola routes/context from Laravel: ${error.stderr || error.message}`);
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

async function resolveRuntimeConfig(config, projectRoot, exporter = exportRuntimeConfig) {
    const missing = Object.keys(config.contexts).filter(name => config.contexts[name].enabled !== false && !config.contexts[name].router?.routes);
    const selected = fs.existsSync(path.join(projectRoot, 'bootstrap/app.php'))
        ? Object.keys(config.contexts).filter(name => config.contexts[name].enabled !== false) : missing;
    const exported = selected.length ? await exporter(projectRoot, selected) : {};
    for (const [name, cfg] of Object.entries(config.contexts)) {
        const explicitDataEndpoint = cfg.view?.dataEndpoint;
        const runtime = exported[name];
        if (runtime) {
            cfg.i18n = { ...runtime.i18n, ...cfg.i18n };
            cfg.router = { mode: 'history', ...cfg.router, routes: cfg.router?.routes || runtime.routes };
            cfg.view = { ...runtime.view, ...cfg.view, systemData: { ...runtime.view?.systemData, ...cfg.view?.systemData } };
        }
        if (cfg.locales !== undefined) {
            if (!Array.isArray(cfg.locales) || cfg.locales.some(code => typeof code !== 'string')) throw new Error(`${name}: locales must be a string array`);
            const codes = new Set([...cfg.locales, cfg.i18n?.locale, cfg.i18n?.fallbackLocale].filter(Boolean));
            cfg.i18n = { ...cfg.i18n, messages: Object.fromEntries(Object.entries(cfg.i18n?.messages || {}).filter(([code]) => codes.has(code))) };
        }
        cfg.base = cfg.baseUrl ?? cfg.base ?? '/';
        if (cfg.apiUrl !== undefined) {
            if (typeof cfg.apiUrl !== 'string') throw new Error(`${name}: apiUrl must be a string`);
            cfg.apiUrl = cfg.apiUrl.replace(/\/+$/, '');
            cfg.api = { ...cfg.api, baseUrl: cfg.apiUrl };
        }
        if (cfg.apiKey !== undefined && typeof cfg.apiKey !== 'string') throw new Error(`${name}: apiKey must be a string`);
        if (cfg.apiKey !== undefined) cfg.api = { ...cfg.api, headers: { ...cfg.api?.headers, [cfg.apiKeyHeader || 'X-API-Key']: cfg.apiKey } };
        if (cfg.apiUrl !== undefined || cfg.apiKey !== undefined) {
            cfg.view = {
                ...cfg.view,
                ...(cfg.apiUrl !== undefined && !explicitDataEndpoint ? { dataEndpoint: cfg.apiUrl } : {}),
                fetchOptions: { ...cfg.view?.fetchOptions, headers: { ...cfg.view?.fetchOptions?.headers, ...cfg.api?.headers } },
            };
        }
    }
    return config;
}

function validateContext(config, sourceConfig, context, projectRoot) {
    if (!/^[\w-]+$/.test(context) || !sourceConfig.contexts[context]) throw new Error(`Unknown source context: ${context}`);
    const cfg = config.contexts[context];
    if (!cfg || cfg.enabled === false) throw new Error(`Dist context is not enabled: ${context}`);
    const outputRoot = resolveChild(projectRoot, config.outDir || 'dist', 'outDir');
    // Packaging must never replace source, installed packages or existing web build output.
    const protectedPaths = ['node_modules', 'vendor', '.git', 'public', 'src', 'app', 'resources', sourceConfig.paths.saoView, sourceConfig.paths.bladeView, sourceConfig.paths.compiled].filter(Boolean);
    for (const relative of protectedPaths) {
        const protectedPath = path.resolve(projectRoot, relative);
        if (outputRoot === protectedPath || inside(protectedPath, outputRoot) || inside(outputRoot, protectedPath)) throw new Error(`Unsafe dist outDir: overlaps ${relative}`);
    }
    const outputDir = path.join(outputRoot, context);
    for (let ancestor = outputDir; ancestor !== projectRoot; ancestor = path.dirname(ancestor)) {
        if (fs.existsSync(ancestor) && fs.lstatSync(ancestor).isSymbolicLink()) throw new Error('Dist output ancestors cannot be symlinks');
    }
    if (fs.existsSync(outputDir)) {
        if (fs.lstatSync(outputDir).isSymbolicLink()) throw new Error('Dist output cannot be a symlink');
        const marker = path.join(outputDir, 'saola-dist.json');
        let previous;
        try { previous = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch (_) { /* Not an owned build. */ }
        if (fs.readdirSync(outputDir).length && (previous?.format !== 'saola-spa' || previous.context !== context)) throw new Error(`Refusing to replace unowned output: ${outputDir}`);
    }
    if (!Array.isArray(cfg.router?.routes) || !cfg.router.routes.length) throw new Error(`${context}: no component routes found; register SPA routes in this context`);
    if (!['history', 'hash'].includes(cfg.router.mode || 'history')) throw new Error(`${context}: router.mode must be history or hash`);
    const routes = cfg.router.routes;
    function checkRoutes(items) {
        for (const route of items) {
            if (typeof route.path !== 'string' || typeof route.component !== 'string' || !route.component) throw new Error(`${context}: each route needs path and component`);
            if (route.children) checkRoutes(route.children);
        }
    }
    checkRoutes(routes);
    if (cfg.includeViews !== undefined && (!Array.isArray(cfg.includeViews) || cfg.includeViews.some(name => typeof name !== 'string' || !name))) throw new Error('includeViews must be an array of view names or namespace prefixes');
    const cssInputs = cfg.css === false ? [] : (cfg.css || (fs.existsSync(path.join(projectRoot, 'resources/css/app.css')) ? ['resources/css/app.css'] : []));
    if (!Array.isArray(cssInputs)) throw new Error('css must be an array of source paths or false');
    const sourceStyles = cssInputs.map(file => resolveChild(projectRoot, file, 'css'));
    for (const file of sourceStyles) if (!fs.existsSync(file)) throw new Error(`Missing CSS source: ${file}`);
    const containerId = cfg.html?.containerId || 'app-root';
    if (!/^[A-Za-z][\w-]*$/.test(containerId)) throw new Error('html.containerId must be a simple HTML id');
    const base = cfg.base || '/';
    if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..') || base.includes('?') || base.includes('#') || base.startsWith('//')) throw new Error('base must be an absolute URL pathname ending in /');
    const entry = resolveChild(projectRoot, cfg.entry || `${sourceConfig.paths.compiled}/app.${context}.js`, 'entry');
    const assets = (cfg.assets || []).map(item => {
        if (!item || typeof item !== 'object') throw new Error('assets entries require { from, to }');
        const from = resolveChild(projectRoot, item.from, 'assets.from');
        const to = resolveChild(outputDir, item.to, 'assets.to');
        if (inside(from, outputRoot) || from === outputRoot || inside(outputRoot, from)) throw new Error('Asset source overlaps dist output');
        return { from, to: path.relative(outputDir, to), skipSymlinks: item.skipSymlinks === true };
    });
    const vite = cfg.vite || {};
    if (vite.root || vite.configFile || vite.publicDir || vite.base || vite.build?.outDir || vite.build?.rollupOptions?.input) throw new Error('Dist owns Vite root, base, publicDir, input and outDir; use the dist fields instead');
    return { ...cfg, staticBuild: !!config.staticBuild, context, base, entry, assets, outputDir, containerId, sourceStyles };
}

function makeBootConfig(cfg) {
    return {
        container: `#${cfg.containerId}`,
        router: { mode: 'history', ...cfg.router, ...(cfg.staticBuild ? { routes: staticClientRoutes(cfg.router.routes, cfg.static) } : {}) },
        view: { ...cfg.view, systemData: { __context__: cfg.context, ...cfg.view?.systemData } },
        api: cfg.api || {},
        bundles: cfg.bundles || [],
        i18n: cfg.i18n || undefined,
    };
}

function makeHtml(cfg) {
    const url = value => /^(?:[a-z]+:|\/\/|#)/i.test(value) ? value : cfg.base + value.replace(/^\/+/, '');
    const sourceStyles = (cfg.sourceStyles || []).map(src => `<link rel="stylesheet" href="${escapeHtml(src)}">`).join('\n');
    const styles = sourceStyles + '\n' + (cfg.styles || []).map(src => `<link rel="stylesheet" href="${escapeHtml(url(src))}">`).join('\n');
    const scripts = (cfg.scripts || []).map(src => `<script src="${escapeHtml(url(src))}"></script>`).join('\n');
    const boot = cfg.bootEntry ? `<script type="module" src="${escapeHtml(cfg.bootEntry)}"></script>` : `<script>window.APP_CONFIGS=${serialize(makeBootConfig(cfg))};</script>\n<script type="module" src="${escapeHtml(cfg.entry)}"></script>`;
    const head = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(cfg.html?.title || 'Saola')}</title>\n${styles}`;
    if (cfg.templateSource) {
        const template = cfg.templateSource;
        if (!template.includes('<!-- saola:head -->') || !template.includes('<!-- saola:boot -->') || !template.includes(`id="${cfg.containerId}"`)) throw new Error('HTML template needs <!-- saola:head -->, <!-- saola:boot --> and the configured container id');
        return template.replace('<!-- saola:head -->', head).replace('<!-- saola:boot -->', scripts + '\n' + boot);
    }
    return `<!doctype html>\n<html lang="${escapeHtml(cfg.html?.lang || 'en')}"><head>${head}</head><body class="${escapeHtml(cfg.html?.bodyClass || '')}"><div id="${cfg.containerId}"></div>\n${scripts}\n${boot}\n</body></html>\n`;
}

function copyAsset(from, to, skipSymlinks = false) {
    const stat = fs.lstatSync(from);
    if (stat.isSymbolicLink()) {
        if (skipSymlinks) return; // Automatic public-directory discovery does not include external theme links.
        throw new Error(`Asset symlinks are not supported: ${from}`);
    }
    if (stat.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        for (const name of fs.readdirSync(from)) copyAsset(path.join(from, name), path.join(to, name), skipSymlinks);
    } else if (stat.isFile()) {
        if (fs.existsSync(to)) throw new Error(`Asset would overwrite another output: ${to}`);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
    } else throw new Error(`Unsupported asset: ${from}`);
}

async function buildContext(distConfig, sourceConfig, context, projectRoot, dependencies = {}) {
    const cfg = validateContext(distConfig, sourceConfig, context, projectRoot);
    // Validate resources BEFORE compilation or replacing any output.
    for (const asset of cfg.assets) if (!fs.existsSync(asset.from)) throw new Error(`Missing asset: ${asset.from}`);
    if (cfg.html?.template) cfg.templateSource = fs.readFileSync(resolveChild(projectRoot, cfg.html.template, 'html.template'), 'utf8');
    const html = makeHtml({ ...cfg, bootEntry: './saola-boot.js' });
    let viteBuild = dependencies.viteBuild;
    let cssPlugins = [];
    if (!viteBuild) {
        const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
        let viteEntry;
        try { viteEntry = projectRequire.resolve('vite'); } catch (_) { throw new Error('sao-dist requires Vite installed in the consuming project'); }
        viteBuild = (await import(pathToFileURL(viteEntry).href)).build;
        // Reuse the installed Tailwind processor for source CSS, without Laravel's output hooks.
        if (cfg.sourceStyles.length && !cfg.vite?.plugins) {
            let tailwindEntry;
            try { tailwindEntry = projectRequire.resolve('@tailwindcss/vite'); } catch (_) { /* Plain CSS needs no plugin. */ }
            if (tailwindEntry) cssPlugins = [(await import(pathToFileURL(tailwindEntry).href)).default()];
        }
    }
    const compiler = dependencies.compiler || new Compiler();
    await compiler.buildContext(sourceConfig, projectRoot, context);
    if (!fs.existsSync(cfg.entry)) throw new Error(`Missing compiled entry: ${cfg.entry}`);
    const temporary = fs.mkdtempSync(path.join(projectRoot, '.saola-dist-'));
    const stage = path.join(temporary, 'output');
    try {
        fs.writeFileSync(path.join(temporary, 'index.html'), html);
        fs.writeFileSync(path.join(temporary, 'saola-boot.js'), `window.APP_CONFIGS=${serialize(makeBootConfig(cfg))};\nimport(${JSON.stringify(cfg.entry)});\n`);
        await viteBuild({
            ...cfg.vite,
            plugins: [registryPlugin(compiler, sourceConfig, cfg, temporary, projectRoot), assetPlugin(projectRoot, cfg, html), ...(cfg.vite?.plugins || cssPlugins)].filter(Boolean),
            configFile: false,
            root: temporary,
            base: cfg.base,
            publicDir: false,
            resolve: {
                ...cfg.vite?.resolve,
                alias: {
                    '@': path.join(projectRoot, 'resources/js'),
                    '@sao': path.resolve(projectRoot, sourceConfig.paths.saoView),
                    '@compiled': path.resolve(projectRoot, sourceConfig.paths.compiled),
                    '@app': path.resolve(projectRoot, sourceConfig.paths.saoView, sourceConfig.paths.sharedApp || '_app'),
                    '@views': path.resolve(projectRoot, sourceConfig.paths.compiled, context),
                    ...Object.fromEntries(Object.keys(sourceConfig.contexts).map(name => [`@${name}`, path.resolve(projectRoot, sourceConfig.paths.saoView, name)])),
                    ...cfg.vite?.resolve?.alias,
                },
            },
            build: { ...cfg.vite?.build, outDir: stage, emptyOutDir: false, sourcemap: cfg.sourcemap ?? false },
        });
        const staticPlan = distConfig.staticBuild ? await prerender(projectRoot, cfg, stage, temporary, dependencies.renderPage) : undefined;
        const copied = new Set();
        for (const asset of cfg.referencedAssets || []) {
            if (cfg.assets.some(explicit => asset.to === explicit.to || asset.to.startsWith(explicit.to + '/'))) continue;
            copyAsset(asset.from, path.join(stage, asset.to));
            copied.add(asset.to);
        }
        for (const asset of cfg.assets) copyAsset(asset.from, path.join(stage, asset.to), asset.skipSymlinks);
        if (!staticPlan) {
            const bootConfig = makeBootConfig(cfg);
            bootConfig.router = { ...bootConfig.router, mode: 'hash', base: '' };
            const fileEntry = path.join(temporary, 'saola-file-entry.js');
            fs.writeFileSync(fileEntry, `window.APP_CONFIGS=${serialize(bootConfig)};\nwindow.APP_CONFIGS.router.beforeEach=function(to){if(/[:{}*?]/.test(to.path)){window.__SAOLA_FILE_PREVIEW__.message();return false;}return true;};\nimport(${JSON.stringify(cfg.entry)});\n`);
            await viteBuild({
                ...cfg.vite,
                configFile: false, root: temporary, base: './', publicDir: false,
                plugins: [registryPlugin(compiler, sourceConfig, cfg, temporary, projectRoot), ...(cfg.vite?.plugins || cssPlugins)].filter(Boolean),
                resolve: { ...cfg.vite?.resolve, alias: {
                    '@': path.join(projectRoot, 'resources/js'),
                    '@sao': path.resolve(projectRoot, sourceConfig.paths.saoView),
                    '@compiled': path.resolve(projectRoot, sourceConfig.paths.compiled),
                    '@app': path.resolve(projectRoot, sourceConfig.paths.saoView, sourceConfig.paths.sharedApp || '_app'),
                    '@views': path.resolve(projectRoot, sourceConfig.paths.compiled, context),
                    ...Object.fromEntries(Object.keys(sourceConfig.contexts).map(name => [`@${name}`, path.resolve(projectRoot, sourceConfig.paths.saoView, name)])),
                    ...cfg.vite?.resolve?.alias,
                } },
                build: { outDir: stage, emptyOutDir: false, sourcemap: cfg.sourcemap ?? false,
                    rollupOptions: { input: fileEntry, output: { format: 'iife', name: 'SaolaFilePreview', inlineDynamicImports: true, entryFileNames: 'saola-file.js' } } },
            });
        }
        prepareFilePreview(stage, cfg, staticPlan);
        console.log(`Saola dist assets: ${copied.size} referenced files + ${cfg.assets.length} explicit includes`);
        fs.writeFileSync(path.join(stage, 'saola-dist.json'), JSON.stringify({ format: 'saola-spa', version: 1, context, mode: staticPlan ? 'static' : 'spa', pages: staticPlan?.pages, skipped: staticPlan?.skipped, base: cfg.base, router: cfg.router.mode || 'history', entry: 'index.html' }, null, 2) + '\n');
        fs.mkdirSync(path.dirname(cfg.outputDir), { recursive: true });
        // Only replace an owned context directory after a complete, successful build.
        const backup = path.join(temporary, 'previous');
        if (fs.existsSync(cfg.outputDir)) fs.renameSync(cfg.outputDir, backup);
        try { fs.renameSync(stage, cfg.outputDir); } catch (error) {
            if (fs.existsSync(backup)) fs.renameSync(backup, cfg.outputDir);
            throw error;
        }
        console.log(`Saola ${staticPlan ? 'static' : 'SPA'}: ${path.relative(projectRoot, cfg.outputDir)}`);
        return cfg.outputDir;
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

async function run(args = []) {
    const modeIndex = args.indexOf('--mode');
    if (modeIndex >= 0 && (!args[modeIndex + 1] || args[modeIndex + 1].startsWith('-'))) throw new Error('--mode requires a name');
    const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'production';
    const filenameIndex = args.indexOf('--config');
    if (filenameIndex >= 0 && !args[filenameIndex + 1]) throw new Error('--config requires a filename');
    const filename = filenameIndex >= 0 ? args[filenameIndex + 1] : undefined;
    const staticBuild = args.includes('--static');
    const contextArgs = args.filter((arg, i) => arg !== '--static' && ![filenameIndex, filenameIndex >= 0 ? filenameIndex + 1 : -1, modeIndex, modeIndex >= 0 ? modeIndex + 1 : -1].includes(i));
    if (contextArgs.length > 1 || contextArgs.some(x => x.startsWith('-'))) throw new Error('Usage: sao-dist [context|all] [--static] [--config filename] [--mode name]');
    const { config: sourceConfig, projectRoot } = ConfigManager.loadConfig(process.cwd());
    ConfigManager.validateConfig(sourceConfig);
    if (sourceConfig.theme) throw new Error('Use the theme build for theme packages; sao-dist packages applications');
    const config = await loadDistConfig(projectRoot, filename, sourceConfig, mode);
    if (staticBuild) { config.staticBuild = true; config.outDir = config.staticOutDir || 'dist-static'; }
    const enabled = Object.keys(config.contexts).filter(name => config.contexts[name].enabled !== false);
    const selected = contextArgs[0] || config.defaultContext || (enabled.length === 1 ? enabled[0] : undefined);
    if (!selected) throw new Error('Choose a context, configure defaultContext, or run sao-dist all');
    const contexts = selected === 'all' ? enabled : [selected];
    if (!contexts.length) throw new Error('No dist contexts enabled');
    // Export only selected contexts, so unrelated contexts need no distribution setup.
    const selectedConfig = { ...config, contexts: Object.fromEntries(contexts.map(name => [name, config.contexts[name]])) };
    for (const name of contexts) if (!selectedConfig.contexts[name]) throw new Error(`Unknown source context: ${name}`);
    await resolveRuntimeConfig(selectedConfig, projectRoot);
    // Preflight all outputs before building any context.
    for (const context of contexts) validateContext(config, sourceConfig, context, projectRoot);
    const compiler = new Compiler();
    for (const context of contexts) await buildContext(config, sourceConfig, context, projectRoot, { compiler });
    if (contexts.length > 1) await compiler.updateViewsFile(sourceConfig, projectRoot, sourceConfig.paths, contexts);
}

const defineDistConfig = config => config;
module.exports = { defineDistConfig, run, buildContext, loadDistConfig, resolveRuntimeConfig, exportRuntimeConfig, validateContext, makeBootConfig, makeHtml, copyAsset };
