const fs = require('fs');
const path = require('path');
const {parse} = require('dotenv');
const {expand} = require('dotenv-expand');

const valid = new Set(['auto', 'standalone', 'theme', 'package', 'published']);
const key = context => context.replace(/-/g, '_').toUpperCase();
const allowed = name => /^SAOLA_(?:CONTEXT_MODE|[A-Z0-9_]+_(?:MODE|THEME))$/.test(name) && !name.startsWith('SAOLA_DIST_');

/** Match Laravel's .env selection; never mutate process.env or export application secrets. */
function environmentFile(root, processEnv = process.env) {
    const specialized = processEnv.APP_ENV && /^[a-zA-Z0-9_-]+$/.test(processEnv.APP_ENV) ? path.join(root, `.env.${processEnv.APP_ENV}`) : null;
    return specialized && fs.existsSync(specialized) ? specialized : path.join(root, '.env');
}

function environment(root, processEnv = process.env) {
    const file = environmentFile(root, processEnv);
    const parsed = fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};
    const selected = Object.fromEntries(Object.entries(parsed).filter(([name]) => allowed(name)));
    const external = Object.fromEntries(Object.entries(processEnv).filter(([name]) => allowed(name)));
    return {...expand({parsed: selected, processEnv: {...external}}).parsed, ...external};
}

function mode(context, host = {}, env = {}) {
    const selected = env[`SAOLA_${key(context)}_MODE`]
        ?? (env.SAOLA_CONTEXT_MODE && env.SAOLA_CONTEXT_MODE !== 'auto' ? env.SAOLA_CONTEXT_MODE : undefined)
        ?? host.mode ?? host.source ?? 'auto';
    if (!valid.has(selected)) throw new Error(`Context ${context}: invalid mode ${selected}; expected auto, standalone, theme, package or published`);
    return selected;
}

function theme(context, host = {}, env = {}) {
    const selected = env[`SAOLA_${key(context)}_THEME`] ?? host.theme ?? 'default';
    if (typeof selected !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(selected)) throw new Error(`Context ${context}: invalid theme name`);
    return selected;
}

function defaults(config) {
    config.paths = {resources: 'resources', saoView: 'resources/saola', bladeView: 'resources/views', compiled: 'resources/js/saola', public: 'public/static/saola', ...config.paths};
    config.contexts ||= {};
    return config;
}

function localContexts(config, root, env) {
    const sourceRoot = path.resolve(root, config.paths?.saoView ?? 'resources/saola');
    if (fs.existsSync(sourceRoot)) for (const item of fs.readdirSync(sourceRoot, {withFileTypes: true})) {
        if (!item.isDirectory() || !/^[a-z][a-z0-9_-]*$/.test(item.name)) continue;
        if (['views', 'app', 'themes'].some(dir => fs.existsSync(path.join(sourceRoot, item.name, dir)))) {
            config.contexts ||= {};
            config.contexts[item.name] ||= {};
        }
    }
    for (const [name, host] of Object.entries(config.contexts || {})) {
        if (host._contextPackage || name === 'default') continue;
        const hostRoot = path.join(sourceRoot, name);
        const manifestFile = path.join(hostRoot, 'context.manifest.json');
        const local = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
        if (local.context && local.context !== name) throw new Error(`Context ${name}: local manifest belongs to another context`);
        const settings = {...(local.mode ? {mode: local.mode} : {}), ...(local.defaultTheme ? {theme: local.defaultTheme} : {}), ...host};
        let selected = mode(name, settings, env);
        if (selected === 'published') continue;
        if (selected === 'auto' && fs.existsSync(path.join(sourceRoot, name, '.publish-state.json'))) continue;
        if (selected === 'package') throw new Error(`Context ${name}: package mode requires an installed context package`);
        if (selected === 'auto') {
            if (['name', 'app', 'views', 'blade', 'compiled'].every(field => host[field] !== undefined)) continue;
            if (fs.existsSync(path.join(hostRoot, 'views'))) selected = 'standalone';
            else if (fs.existsSync(path.join(hostRoot, 'themes'))) selected = 'theme';
            else continue;
        }
        if (!['standalone', 'theme'].includes(selected)) continue;
        defaults(config);
        const selectedTheme = selected === 'theme' ? theme(name, settings, env) : null;
        const viewRelative = selectedTheme ? `themes/${selectedTheme}/views` : 'views';
        if (!fs.existsSync(path.join(hostRoot, viewRelative))) throw new Error(`Context ${name}: ${selected} mode requires ${path.join(hostRoot, viewRelative)}`);
        const namespace = host.namespace ?? local.namespace ?? `${name}.${viewRelative.replaceAll('/', '.')}`;
        if (typeof namespace !== 'string' || !/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/.test(namespace)) throw new Error(`Context ${name}: invalid view namespace`);
        const effectiveRoot = path.resolve(root, config.paths.compiled, '_sources', name);
        const css = {};
        const cssRelative = selectedTheme ? `themes/${selectedTheme}/assets/css/app.css` : 'assets/css/app.css';
        if (fs.existsSync(path.join(hostRoot, cssRelative))) {
            css[path.relative(root, path.join(hostRoot, cssRelative)).split(path.sep).join('/')] = path.relative(root, path.join(effectiveRoot, cssRelative)).split(path.sep).join('/');
        }
        const metadata = {kind: selected, context: name, namespace, source: hostRoot, hostRoot, effectiveRoot, css, selectedTheme,
            manifest: {context: name, contract: 1, bootstrap: 'app/bootstrap.ts', types: local.types, themes: [], overridable: []}};
        if (local.types && (typeof local.types !== 'string' || path.isAbsolute(local.types) || local.types.split(/[\\/]/).includes('..'))) throw new Error(`Context ${name}: invalid types path`);
        config.contexts[name] = {...host, name: host.name || name, mode: selected,
            app: [path.join(effectiveRoot, 'app')],
            views: {[namespace]: path.join(effectiveRoot, viewRelative)}, blade: {[namespace]: namespace.replaceAll('.', '/')},
            compiled: {views: `${name}/views`, registry: `${name}/registry.js`, ...host.compiled, app: null},
            _contextSource: metadata};
    }
    return config;
}

module.exports = {environmentFile, environment, mode, theme, defaults, localContexts};
