const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Config = require('../src/config-manager');
const Modes = require('../src/context-modes');
const Sources = require('../src/context-packages');
const Compiler = require('../src/index');
const vite = require('../src/vite-plugin');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saola-modes-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const put = (file, value) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
        return target;
    };
    const local = name => {
        put(`resources/saola/${name}/views/pages/home.sao`, `<template>${name} standalone</template>`);
        put(`resources/saola/${name}/app/bootstrap.ts`, `export default {name: '${name}', services: {CustomService: {ready: true}}};`);
        put(`resources/saola/${name}/assets/mark.svg`, '<svg/>');
        put(`resources/saola/${name}/assets/css/app.css`, 'body {color: black}');
    };
    return {root, put, local, load: () => Config.loadConfig(root).config};
}

test('standalone needs no context package, theme, manifest or sao.config.json', t => {
    const f = fixture(t); f.local('studio'); f.put('.env', 'SAOLA_CONTEXT_MODE=standalone\n');
    const config = f.load();
    assert.equal(Config.validateConfig(config), true);
    assert.equal(Sources.source(config.contexts.studio).kind, 'standalone');
    assert.equal(fs.existsSync(path.join(f.root, 'vendor')), false);
    assert.deepEqual(Object.keys(config.contexts.studio.views), ['studio.views']);
    assert.equal(config.contexts.studio.blade['studio.views'], 'studio/views');
});

test('env loading is isolated, allowlisted and external process values win', t => {
    const f = fixture(t);
    f.put('.env', 'SAOLA_CONTEXT_MODE=theme\nSAOLA_WEB_THEME=default\nDATABASE_PASSWORD=secret\nSAOLA_DIST_API_KEY=secret\n');
    const external = {SAOLA_CONTEXT_MODE: 'standalone', PRIVATE_TOKEN: 'private'};
    assert.deepEqual(Modes.environment(f.root, external), {SAOLA_CONTEXT_MODE: 'standalone', SAOLA_WEB_THEME: 'default'});
    assert.deepEqual(external, {SAOLA_CONTEXT_MODE: 'standalone', PRIVATE_TOKEN: 'private'});
});

test('an explicit namespace remains available and invalid names are rejected', t => {
    const f = fixture(t); f.local('web');
    f.put('resources/saola/web/context.manifest.json', {context: 'web', namespace: 'web'});
    assert.deepEqual(Object.keys(f.load().contexts.web.views), ['web']);
    f.put('resources/saola/web/context.manifest.json', {context: 'web', namespace: '../outside'});
    assert.throws(f.load, /invalid view namespace/);
});

test('per-context env overrides global mode; auto retains an explicit project choice', t => {
    assert.equal(Modes.mode('back-office', {mode: 'theme'}, {SAOLA_CONTEXT_MODE: 'standalone', SAOLA_BACK_OFFICE_MODE: 'package'}), 'package');
    assert.equal(Modes.mode('web', {mode: 'theme'}, {SAOLA_CONTEXT_MODE: 'auto'}), 'theme');
    assert.equal(Modes.mode('web', {mode: 'theme'}, {SAOLA_CONTEXT_MODE: 'standalone'}), 'standalone');
    assert.throws(() => Modes.mode('web', {}, {SAOLA_WEB_MODE: 'typo'}), /invalid mode/);
    assert.throws(() => Modes.theme('web', {}, {SAOLA_WEB_THEME: '../outside'}), /invalid theme/);
});

test('standalone ignores installed context sources and unused themes', t => {
    const f = fixture(t); f.local('admin');
    f.put('.env', 'SAOLA_ADMIN_MODE=standalone\n');
    f.put('vendor/composer/installed.json', {packages: [{name: 'vendor/admin', extra: {saola: {contexts: {admin: 'missing/context.manifest.json'}}}}]});
    f.put('resources/saola/admin/themes/old/app/bundle.ts', 'throw new Error("must not load");');
    const config = f.load();
    Sources.prepare(config.contexts.admin, config, f.root);
    assert.equal(config.contexts.admin._contextPackage, undefined);
    assert.equal(fs.existsSync(path.join(Sources.source(config.contexts.admin).effectiveRoot, 'themes')), false);
});

test('theme mode follows the physical view directory in its namespace', t => {
    const f = fixture(t); f.local('web');
    f.put('.env', 'SAOLA_WEB_MODE=theme\nSAOLA_WEB_THEME=paper\n');
    f.put('resources/saola/web/themes/paper/views/pages/home.sao', '<template>Paper</template>');
    f.put('resources/saola/web/themes/paper/assets/css/app.css', 'body {background: white}');
    const config = f.load();
    assert.equal(config.contexts.web.blade['web.themes.paper.views'], 'web/themes/paper/views');
    assert.match(config.contexts.web.views['web.themes.paper.views'], /themes\/paper\/views$/);
    Sources.prepare(config.contexts.web, config, f.root);
    const effective = Sources.source(config.contexts.web).effectiveRoot;
    assert.equal(fs.existsSync(path.join(effective, 'views')), false);
    assert.match(fs.readFileSync(path.join(effective, 'themes/paper/views/pages/home.sao'), 'utf8'), /Paper/);
});

test('flat and local theme builds register bootstrap once and can switch without deleting either source', async t => {
    const f = fixture(t); f.local('web');
    f.put('resources/saola/web/themes/default/views/pages/home.sao', '<template>Themed</template>');
    f.put('.env', 'SAOLA_WEB_MODE=standalone\n');
    const compiler = new Compiler(); compiler.resolvePhpCompilerPath = () => 'test compiler';
    const prefixes = [];
    compiler.compileWithPhp = async (source, opts) => {
        prefixes.push(opts.assetPrefix);
        return {lang: 'js', blade: source, js: `export default () => {}; // ${source}`};
    };
    await compiler.buildContext(f.load(), f.root, 'web');
    let entry = fs.readFileSync(path.join(f.root, 'resources/js/saola/app.web.js'), 'utf8');
    assert.equal((entry.match(/import contextBundle from/g) || []).length, 1);
    assert.doesNotMatch(entry, /packageBundle|projectBundle|themeLoaders|strictBundles: true/);
    f.put('.env', 'SAOLA_WEB_MODE=theme\n');
    await compiler.buildContext(f.load(), f.root, 'web');
    assert.match(fs.readFileSync(path.join(f.root, 'resources/views/web/themes/default/views/pages/home.blade.php'), 'utf8'), /Themed/);
    const metadata = JSON.parse(fs.readFileSync(path.join(f.root, 'public/static/saola/contexts.json')));
    assert.equal(metadata.web.mode, 'theme'); assert.equal(metadata.web.theme, 'default');
    assert.equal(metadata.web.namespace, 'web.themes.default.views');
    assert.match(prefixes[0], /web\/assets\//); assert.match(prefixes[1], /web\/themes\/default\/assets\//);
    assert.ok(fs.existsSync(path.join(f.root, 'resources/saola/web/views/pages/home.sao')));
    assert.ok(fs.existsSync(path.join(f.root, 'resources/saola/web/themes/default/views/pages/home.sao')));
});

test('bootstrap is optional and Vite fills aliases, entry, CSS and output for a plain context', async t => {
    const f = fixture(t); f.local('web'); fs.unlinkSync(path.join(f.root, 'resources/saola/web/app/bootstrap.ts'));
    const compiler = new Compiler(); compiler.resolvePhpCompilerPath = () => 'test compiler';
    compiler.compileWithPhp = async () => ({lang: 'js', blade: '<p>Plain</p>', js: 'export default () => {};'});
    await compiler.buildContext(f.load(), f.root, 'web');
    assert.doesNotMatch(fs.readFileSync(path.join(f.root, 'resources/js/saola/app.web.js'), 'utf8'), /import contextBundle/);
    const result = vite({context: 'web'}).config.handler({root: f.root}, {command: 'build'});
    assert.equal(result.build.rollupOptions.input.length, 2);
    assert.ok(result.resolve.alias.some(alias => alias.find === '@app'));
    assert.equal(result.build.manifest, 'manifest.json');
});

test('explicit directory namespaces keep relative assets under the theme asset root', async t => {
    const f = fixture(t);
    const source = f.put('resources/saola/web/themes/paper/views/home.sao', '<img src="logo.svg">');
    const namespace = 'web.themes.paper.views';
    const compiler = new Compiler();
    compiler.compileWithPhp = async (_source, options) => {
        assert.equal(options.viewPath, namespace + '.home');
        assert.equal(options.assetPrefix, 'static/saola/web/themes/paper/assets/');
        return {lang: 'js', blade: '<img>', js: 'export default () => {};'};
    };
    await compiler.processSaoFile(source, path.dirname(source), namespace, 'web', {
        views: {[namespace]: path.dirname(source)}, blade: {[namespace]: 'web/themes/paper/views'},
        compiled: {views: 'web/views'},
    }, f.root, {public: 'public/static/saola', bladeView: 'resources/views', compiled: 'resources/js/saola'});
});

test('explicit missing package or local theme fails clearly rather than falling back', t => {
    const f = fixture(t); f.local('web');
    f.put('.env', 'SAOLA_WEB_MODE=package\n');
    assert.throws(f.load, /requires an installed context package/);
    f.put('.env', 'SAOLA_WEB_MODE=theme\nSAOLA_WEB_THEME=missing\n');
    assert.throws(f.load, /theme mode requires/);
});

test('theme mode keeps view namespaces shared from outside the context and drops its other themes', t => {
    const f = fixture(t); f.local('web');
    f.put('resources/saola/web/themes/paper/views/pages/home.sao', '<template>Paper</template>');
    f.put('resources/saola/web/themes/default/views/pages/home.sao', '<template>Default</template>');
    f.put('resources/saola/_shared/views/editor.sao', '<template>Shared</template>');
    f.put('sao.config.json', {contexts: {web: {mode: 'theme', theme: 'paper',
        views: {'web.themes.default.views': 'web/themes/default/views', 'shared.ui': '_shared/views'},
        blade: {'web.themes.default.views': 'web/themes/default/views', 'shared.ui': 'shared/ui'}}}});
    const web = f.load().contexts.web;
    assert.deepEqual(Object.keys(web.views), ['web.themes.paper.views', 'shared.ui']);
    assert.equal(web.views['shared.ui'], '_shared/views');
    assert.equal(web.blade['shared.ui'], 'shared/ui');
    assert.equal(web.blade['web.themes.default.views'], undefined);
});
