const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Config = require('../src/config-manager');
const Packages = require('../src/context-packages');
const Compiler = require('../src/index');
const vitePlugin = require('../src/vite-plugin');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saola-context-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const put = (file, value) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
        return target;
    };
    const source = 'vendor/acme/panel/resources/saola/admin/';
    put('sao.config.json', {contexts: {admin: {}}});
    put('vendor/composer/installed.json', {packages: [{name: 'acme/panel', 'install-path': '../acme/panel', extra: {saola: {contexts: {admin: 'resources/saola/admin/context.manifest.json'}}}}]});
    put(source + 'context.manifest.json', {package: 'acme/panel', context: 'admin', namespace: 'admin', contract: 1, bootstrap: 'app/bundle.ts', defaultTheme: 'classic', themes: ['classic', 'material'], overridable: ['Admin.Presentation']});
    put(source + 'app/bundle.ts', 'export default {name: "acme/panel", services: {Admin: {factory: () => ({ready: true})}}};');
    for (const name of ['classic', 'material']) {
        put(source + `themes/${name}/theme.manifest.json`, {name, contract: 1, view_context: `admin.${name}`, views: 'views', css: 'assets/css/admin.css'});
        put(source + `themes/${name}/views/pages/home.sao`, `<template>${name} original</template>`);
        put(source + `themes/${name}/assets/css/admin.css`, `.theme {color: ${name === 'classic' ? 'red' : 'blue'}}`);
        put(source + `themes/${name}/assets/logo.svg`, `<svg>${name}</svg>`);
    }
    const load = () => Config.loadConfig(root).config;
    return {root, source, put, load};
}

test('Composer discovery supplies minimal context configuration without source publication', t => {
    const f = fixture(t);
    const config = f.load();
    assert.equal(Config.validateConfig(config), true);
    assert.deepEqual(Object.keys(config.contexts.admin.views), ['admin.classic', 'admin.material']);
    assert.equal(config.contexts.admin.blade['admin.classic'], 'admin/classic');
    assert.equal(fs.existsSync(path.join(f.root, 'resources/saola/admin')), false);
    assert.equal(Packages.aliases(config)[0].find, '@sao/admin');
    assert.ok(Packages.watchRoots(config, f.root, ['admin']).includes(path.resolve(f.root, f.source)));
});

test('legacy client metadata and published source continue through their existing paths', t => {
    const f = fixture(t);
    f.put('resources/saola/admin/.publish-state.json', {});
    assert.equal(f.load().contexts.admin._contextPackage, undefined);
    f.put('vendor/composer/installed.json', [{name: 'acme/legacy', extra: {saola: {client: 'dist/client.js'}}}]);
    assert.equal(Packages.discover(f.root).length, 0);
});

test('custom vendor directory and Composer v1 inventory are supported', t => {
    const f = fixture(t);
    const inventory = JSON.parse(fs.readFileSync(path.join(f.root, 'vendor/composer/installed.json'))).packages;
    fs.renameSync(path.join(f.root, 'vendor'), path.join(f.root, 'dependencies'));
    f.put('composer.json', {config: {'vendor-dir': 'dependencies'}});
    f.put('dependencies/composer/installed.json', inventory);
    assert.equal(f.load().contexts.admin._contextPackage.package, 'acme/panel');
});

test('legacy published theme descriptors are skipped unless package mode is explicit', t => {
    const f = fixture(t);
    f.put('resources/saola/admin/.publish-state.json', {});
    f.put(f.source + 'themes/classic/theme.manifest.json', {
        name: 'classic', contract: 1, view_context: 'admin.themes.classic', views: 'views',
    });
    assert.equal(f.load().contexts.admin._contextPackage, undefined);
    f.put('sao.config.json', {contexts: {admin: {mode: 'package'}}});
    assert.throws(f.load, /Invalid theme manifest/);
});

test('installing a context does not skip normalization of existing legacy contexts', t => {
    const f = fixture(t);
    f.put('sao.config.json', {root: 'resources/saola', contexts: {web: {
        name: 'web', app: ['resources/saola/web/app'], views: {web: 'resources/saola/web/views'}, blade: {web: 'resources/views/web'},
        temp: {views: 'resources/js/saola/web/views', registry: 'resources/js/saola/web/registry.js'},
    }}});
    const config = f.load();
    assert.equal(Config.validateConfig(config), true);
    assert.equal(Config.resolveCompiledPath(f.root, config.paths, config.contexts.web.compiled.registry), path.join(f.root, 'resources/js/saola/web/registry.js'));
    assert.ok(config.contexts.admin._contextPackage);
});

test('context manifest paths cannot escape their package', t => {
    const f = fixture(t);
    const inventory = JSON.parse(fs.readFileSync(path.join(f.root, 'vendor/composer/installed.json')));
    inventory.packages[0].extra.saola.contexts.admin = '../../../outside.json';
    f.put('vendor/composer/installed.json', inventory);
    assert.throws(f.load, /escapes/);
});

test('per-file project overrides survive package upgrades and removal restores package defaults', t => {
    const f = fixture(t);
    const relative = 'themes/classic/views/pages/home.sao';
    f.put('resources/saola/admin/' + relative, '<template>project override</template>');
    let config = f.load();
    Packages.prepare(config.contexts.admin, config, f.root);
    const staged = path.join(config.contexts.admin._contextPackage.effectiveRoot, relative);
    assert.match(fs.readFileSync(staged, 'utf8'), /project override/);
    f.put(f.source + relative, '<template>package upgrade</template>');
    config = f.load();
    Packages.prepare(config.contexts.admin, config, f.root);
    assert.match(fs.readFileSync(staged, 'utf8'), /project override/);
    fs.unlinkSync(path.join(f.root, 'resources/saola/admin', relative));
    Packages.prepare(config.contexts.admin, config, f.root);
    assert.match(fs.readFileSync(staged, 'utf8'), /package upgrade/);
});

test('overlay never overwrites customized generated files or symlink destinations', t => {
    const f = fixture(t);
    const config = f.load();
    const ctx = config.contexts.admin;
    Packages.prepare(ctx, config, f.root);
    fs.writeFileSync(path.join(ctx._contextPackage.effectiveRoot, 'app/bundle.ts'), 'customization');
    assert.throws(() => Packages.prepare(ctx, config, f.root), /customized/);
    const linked = path.join(f.root, 'linked');
    fs.symlinkSync(path.join(f.root, 'vendor'), linked);
    assert.throws(() => Packages.writeOwned(path.join(f.root, 'inventory.json'), [linked], new Map([[path.join(linked, 'new.txt'), 'x']])), /symlink/);
});

test('compile produces coherent SSR/CSR, isolated theme assets, types and package registration', async t => {
    const f = fixture(t);
    f.put('resources/saola/admin/app/bootstrap.ts', 'export default {name: "project", services: {Custom: {enabled: true}}};');
    const config = f.load();
    const compiler = new Compiler();
    compiler.resolvePhpCompilerPath = () => 'test-compiler';
    const prefixes = [];
    compiler.compileWithPhp = async (source, opts) => {
        prefixes.push(opts.assetPrefix);
        return {lang: 'js', blade: source, js: `export default function View() {}; // ${source}`};
    };
    await compiler.buildContext(config, f.root, 'admin');
    assert.match(fs.readFileSync(path.join(f.root, 'resources/views/admin/classic/pages/home.blade.php'), 'utf8'), /classic original/);
    const entry = fs.readFileSync(path.join(f.root, 'resources/js/saola/app.admin.js'), 'utf8');
    assert.match(entry, /import packageBundle/);
    assert.match(entry, /import projectBundle/);
    assert.match(entry, /"strict":true/);
    assert.match(entry, /saola\.context\.admin/);
    assert.match(entry, /registry\.classic\.js/);
    assert.ok(entry.indexOf('await themeLoaders[selectedTheme]()') < entry.indexOf('await App.start('));
    const baseRegistry = fs.readFileSync(path.join(f.root, 'resources/js/saola/admin/registry.js'), 'utf8');
    assert.doesNotMatch(baseRegistry, /admin\.classic\.pages/);
    assert.match(prefixes.join('\n'), /admin\/themes\/classic\/assets\//);
    assert.match(prefixes.join('\n'), /admin\/themes\/material\/assets\//);
    assert.ok(fs.existsSync(path.join(f.root, 'resources/js/saola/types/contexts.d.ts')));
    assert.ok(fs.existsSync(path.join(f.root, 'resources/js/saola/tsconfig.contexts.json')));
    assert.equal(fs.existsSync(path.join(f.root, 'resources/saola/admin/app/bundle.ts')), false);
    const metadata = JSON.parse(fs.readFileSync(path.join(f.root, 'public/static/saola/contexts.json')));
    assert.equal(metadata.admin.css['resources/saola/admin/themes/classic/assets/css/admin.css'], 'resources/js/saola/_sources/admin/themes/classic/assets/css/admin.css');
    // Deleting an upstream view removes only the previously generated output.
    const customBlade = f.put('resources/views/admin/classic/pages/custom.blade.php', 'handwritten');
    const installed = f.put('resources/views/admin/classic/addon/.saola-theme', 'installed');
    f.put('resources/views/admin/classic/addon/page.blade.php', 'installed content');
    fs.unlinkSync(path.join(f.root, f.source, 'themes/classic/views/pages/home.sao'));
    await compiler.buildContext(f.load(), f.root, 'admin');
    assert.equal(fs.existsSync(path.join(f.root, 'resources/views/admin/classic/pages/home.blade.php')), false);
    assert.equal(fs.readFileSync(customBlade, 'utf8'), 'handwritten');
    assert.equal(fs.existsSync(installed), true);
});

test('an unowned compiled view is preserved and stops the output batch', async t => {
    const f = fixture(t);
    f.put('resources/views/admin/classic/pages/home.blade.php', 'handwritten collision');
    const compiler = new Compiler();
    compiler.resolvePhpCompilerPath = () => 'test-compiler';
    compiler.compileWithPhp = async () => ({lang: 'js', blade: 'generated', js: 'export default {};'});
    await assert.rejects(() => compiler.buildContext(f.load(), f.root, 'admin'), /unowned/);
    assert.equal(fs.readFileSync(path.join(f.root, 'resources/views/admin/classic/pages/home.blade.php'), 'utf8'), 'handwritten collision');
    assert.equal(fs.existsSync(path.join(f.root, 'resources/views/admin/material/pages/home.blade.php')), false);
});

test('Vite receives package aliases, both CSS entries and separate raw assets automatically', async t => {
    const f = fixture(t);
    const plugin = vitePlugin({context: 'admin'});
    const result = plugin.config({root: f.root, build: {rollupOptions: {input: ['resources/js/saola/app.admin.js']}}}, {command: 'build'});
    assert.equal(result.resolve.alias[0].find, '@sao/admin');
    assert.equal(result.build.rollupOptions.input.length, 3);
    const config = f.load();
    Packages.prepare(config.contexts.admin, config, f.root);
    const assets = [];
    plugin.generateBundle.call({emitFile: asset => assets.push(asset)});
    assert.match(assets.find(a => a.fileName === 'themes/classic/assets/logo.svg').source.toString(), /classic/);
    assert.match(assets.find(a => a.fileName === 'themes/material/assets/logo.svg').source.toString(), /material/);
});

test('a project theme is discovered without repeating view or CSS mappings', t => {
    const f = fixture(t);
    const source = path.join(f.root, f.source, 'themes/classic');
    const target = path.join(f.root, 'resources/saola/admin/themes/graphite');
    fs.cpSync(source, target, {recursive: true});
    f.put('resources/saola/admin/themes/graphite/theme.manifest.json', {name: 'graphite', contract: 1, view_context: 'admin.graphite', views: 'views', css: 'assets/css/admin.css'});
    const config = f.load();
    assert.ok(config.contexts.admin.views['admin.graphite']);
    assert.ok(config.contexts.admin._contextPackage.css['resources/saola/admin/themes/graphite/assets/css/admin.css']);
    Packages.prepare(config.contexts.admin, config, f.root);
    assert.ok(fs.existsSync(path.join(config.contexts.admin._contextPackage.effectiveRoot, 'themes/graphite/views/pages/home.sao')));
});

test('switching package -> standalone -> package cleans only owned views and keeps both sources', async t => {
    const f = fixture(t);
    f.put('resources/saola/admin/views/pages/home.sao', '<template>Independent</template>');
    const handwritten = f.put('resources/views/admin/manual.blade.php', 'keep me');
    const installed = f.put('resources/views/admin/addon/.saola-theme', 'installed');
    const compiler = new Compiler();
    compiler.resolvePhpCompilerPath = () => 'test-compiler';
    compiler.compileWithPhp = async source => ({lang: 'js', blade: source, js: `export default () => {}; // ${source}`});
    for (const mode of ['package', 'standalone', 'package']) {
        f.put('.env', `SAOLA_ADMIN_MODE=${mode}\n`);
        await compiler.buildContext(f.load(), f.root, 'admin');
        assert.equal(fs.existsSync(path.join(f.root, 'resources/views/admin/views/pages/home.blade.php')), mode === 'standalone');
        assert.equal(fs.existsSync(path.join(f.root, 'resources/views/admin/classic/pages/home.blade.php')), mode === 'package');
        assert.equal(fs.readFileSync(handwritten, 'utf8'), 'keep me');
        assert.ok(fs.existsSync(installed));
        assert.ok(fs.existsSync(path.join(f.root, 'resources/saola/admin/views/pages/home.sao')));
        assert.ok(fs.existsSync(path.join(f.root, f.source, 'themes/classic/views/pages/home.sao')));
    }
});
