const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateContext, makeHtml, loadDistConfig, resolveRuntimeConfig, exportRuntimeConfig, buildContext } = require('../src/dist');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sao-dist-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = { paths: { saoView: 'resources/saola', bladeView: 'resources/views', compiled: 'resources/compiled' }, contexts: { web: {}, mobile: {} } };
    const cfg = { contexts: { web: { router: { routes: [{ path: '/', component: 'web.home' }] }, assets: [{ from: 'public/brand', to: 'brand' }] }, mobile: { router: { mode: 'hash', routes: [{ path: '/', component: 'mobile.home' }] } } } };
    fs.mkdirSync(path.join(root, 'public/brand'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/brand/logo.svg'), 'logo');
    const compiler = { async buildContext(_, dir, context) { fs.mkdirSync(path.join(dir, 'resources/compiled'), { recursive: true }); fs.writeFileSync(path.join(dir, 'resources/compiled', `app.${context}.js`), 'entry'); } };
    const viteBuild = async vite => { if (vite.build.rollupOptions?.output?.format === 'iife') { fs.writeFileSync(path.join(vite.build.outDir, 'saola-file.js'), 'classic bundle'); return; } fs.mkdirSync(vite.build.outDir); fs.writeFileSync(path.join(vite.build.outDir, 'index.html'), fs.readFileSync(path.join(vite.root, 'index.html'))); fs.writeFileSync(path.join(vite.build.outDir, 'bundle.js'), 'built'); };
    return { root, source, cfg, dependencies: { compiler, viteBuild } };
}

test('validates resolved routes and rejects destructive output paths', t => {
    const { root, source, cfg } = fixture(t);
    for (const outDir of ['.', '..', 'resources', 'public/dist', 'vendor/dist', '/tmp/dist']) assert.throws(() => validateContext({ ...cfg, outDir }, source, 'web', root));
    assert.throws(() => validateContext({ contexts: { web: {} } }, source, 'web', root), /no component routes/);
    assert.throws(() => validateContext(cfg, source, 'admin', root), /Unknown/);
    assert.throws(() => validateContext({ ...cfg, contexts: { web: { ...cfg.contexts.web, includeViews: 'web.dynamic' } } }, source, 'web', root), /includeViews/);
    cfg.contexts.web.assets[0].to = '../../escape';
    assert.throws(() => validateContext(cfg, source, 'web', root), /stay inside/);
});

test('HTML has an empty mount, escaped config, custom id and no Laravel/SSR boot', t => {
    const { root, source, cfg } = fixture(t);
    cfg.contexts.web.html = { title: '<Guide>', containerId: 'docs-root' };
    cfg.contexts.web.view = { systemData: { __layout__: 'web.layouts.', example: '</script><script>bad</script>' } };
    const html = makeHtml(validateContext(cfg, source, 'web', root));
    assert.match(html, /id="docs-root"><\/div>/);
    assert.match(html, /&lt;Guide&gt;/);
    assert.match(html, /\\u003c\/script>/);
    assert.doesNotMatch(html, /data-server-rendered|saola-ssr|@vite|csrf-token/);
});

test('optional JSON/module configuration overrides inline defaults', async t => {
    const { root, source } = fixture(t);
    fs.writeFileSync(path.join(root, 'sao.config.json'), JSON.stringify(source));
    assert.ok((await loadDistConfig(root)).contexts.web);
    await assert.rejects(loadDistConfig(root, 'missing.json'), /Missing/);
    fs.writeFileSync(path.join(root, 'sao.dist.config.json'), '{"contexts":{"web":{}}}');
    assert.ok((await loadDistConfig(root)).contexts.web);
    fs.writeFileSync(path.join(root, 'sao.dist.config.mjs'), 'export default { contexts: { mobile: {} } };');
    assert.ok((await loadDistConfig(root)).contexts.mobile);
});

test('isolates contexts, copies assets, removes stale owned output, retains successful output on failure', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    const web = await buildContext(cfg, source, 'web', root, { ...dependencies, viteBuild: async vite => {
        assert.equal(vite.resolve.alias['@web'], path.join(root, 'resources/saola/web'));
        assert.equal(vite.resolve.alias['@app'], path.join(root, 'resources/saola/_app'));
        await dependencies.viteBuild(vite);
    } });
    const mobile = await buildContext(cfg, source, 'mobile', root, dependencies);
    assert.equal(fs.readFileSync(path.join(web, 'brand/logo.svg'), 'utf8'), 'logo');
    assert.ok(!fs.existsSync(path.join(mobile, 'brand')));
    fs.writeFileSync(path.join(web, 'obsolete.js'), 'obsolete');
    await buildContext(cfg, source, 'web', root, dependencies);
    assert.ok(!fs.existsSync(path.join(web, 'obsolete.js')));
    await assert.rejects(buildContext(cfg, source, 'web', root, { ...dependencies, viteBuild: async () => { throw new Error('bundle failed'); } }), /bundle failed/);
    assert.ok(fs.existsSync(path.join(web, 'bundle.js')));
    assert.ok(fs.existsSync(path.join(mobile, 'index.html')));
    assert.ok(!fs.readdirSync(root).some(name => name.startsWith('.saola-dist-')));
});

test('does not overwrite unmanaged output or bundled files with copied assets', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    fs.mkdirSync(path.join(root, 'dist/web'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist/web/important.txt'), 'keep');
    await assert.rejects(buildContext(cfg, source, 'web', root, dependencies), /unowned/);
    fs.rmSync(path.join(root, 'dist/web'), { recursive: true });
    cfg.contexts.web.assets = [{ from: 'public/brand/logo.svg', to: 'index.html' }];
    await assert.rejects(buildContext(cfg, source, 'web', root, dependencies), /overwrite/);
});


test('inline dist overrides reuse application routes and exported namespaces', async t => {
    const { root, source } = fixture(t);
    source.dist = { apiUrl: 'https://server.test/', apiKey: 'public-key' };
    source.contexts.web.dist = { baseUrl: '/portal/' };
    const config = await loadDistConfig(root, undefined, source);
    assert.equal(config.defaultContext, 'web');
    let requested;
    await resolveRuntimeConfig(config, root, async (_, names) => {
        requested = names;
        return Object.fromEntries(names.map(name => [name, {
            routes: [{ path: '/', component: `${name}.home` }],
            view: { contextViews: { base: name }, revision: 'v1', systemData: { __layout__: `${name}.layouts.` } },
        }]));
    });
    assert.deepEqual(requested, ['web', 'mobile']);
    const html = makeHtml(validateContext(config, source, 'web', root));
    assert.match(html, /web.layouts/);
    assert.match(html, /X-API-Key/);
    assert.equal(config.contexts.web.base, '/portal/');
    assert.equal(config.contexts.mobile.base, '/');
    assert.equal(config.contexts.web.view.dataEndpoint, 'https://server.test');
    assert.equal(config.contexts.web.view.fetchOptions.headers['X-API-Key'], 'public-key');
    assert.equal(config.contexts.web.api.baseUrl, 'https://server.test');
    assert.equal(config.contexts.web.assets, undefined);
});

test('client-only configuration reuses context router without requiring Laravel', async t => {
    const { root, source } = fixture(t);
    source.contexts.web.router = { routes: [{ path: '/', component: 'web.home' }] };
    source.contexts.mobile.dist = { enabled: false };
    source.contexts.web.dist = { apiKey: 'key', apiKeyHeader: 'Authorization', view: { dataEndpoint: 'https://pages.test', fetchOptions: { credentials: 'include' } } };
    fs.mkdirSync(path.join(root, 'public/assets'));
    const config = await loadDistConfig(root, undefined, source);
    await resolveRuntimeConfig(config, root, async () => { throw new Error('must not export'); });
    assert.equal(config.contexts.web.router.routes[0].component, 'web.home');
    assert.equal(config.contexts.web.view.dataEndpoint, 'https://pages.test');
    assert.equal(config.contexts.web.view.fetchOptions.credentials, 'include');
    assert.equal(config.contexts.web.api.headers.Authorization, 'key');
    assert.equal(config.contexts.web.assets, undefined);
    await assert.rejects(exportRuntimeConfig(root, ['web']), /No Laravel bootstrap/);
});


test('embeds translation dictionaries into the bundled boot module, never a JSON request', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    cfg.contexts.web.i18n = { locale: 'vi', fallbackLocale: 'en', messages: { vi: { json: { Hello: 'Xin chào </script>' } } } };
    await buildContext(cfg, source, 'web', root, { ...dependencies, viteBuild: async vite => {
        const boot = fs.readFileSync(path.join(vite.root, 'saola-boot.js'), 'utf8');
        assert.match(boot, /Xin chào/);
        assert.match(boot, /\\u003c\/script>/);
        assert.doesNotMatch(boot, /fetch\(|\.json/);
        const html = fs.readFileSync(path.join(vite.root, 'index.html'), 'utf8');
        assert.match(html, /saola-boot.js/);
        assert.doesNotMatch(html, /Xin chào/);
        await dependencies.viteBuild(vite);
    } });
});

test('PHP exporter validates real PHP/JSON sources and preserves namespaces and overrides', t => {
    const { root } = fixture(t);
    const { execFileSync } = require('node:child_process');
    fs.mkdirSync(path.join(root, 'lang/en'), { recursive: true });
    fs.mkdirSync(path.join(root, 'lang/vi'), { recursive: true });
    fs.mkdirSync(path.join(root, 'package/en'), { recursive: true });
    fs.writeFileSync(path.join(root, 'lang/en/messages.php'), "<?php return ['title' => 'Guide', 'nested' => ['label' => 'Label']];");
    fs.writeFileSync(path.join(root, 'package/en/labels.php'), "<?php return ['title' => 'Package'];");
    fs.writeFileSync(path.join(root, 'lang/vi.json'), '{"Hello":"Xin chào"}');
    const runner = path.join(root, 'export.php');
    fs.writeFileSync(runner, `<?php require $argv[1]; echo json_encode(saolaExportTranslations([$argv[2].'/lang'], ['pkg' => $argv[2].'/package'], 'vi', 'en'));`);
    const args = [runner, path.resolve(__dirname, '../src/export-translations.php'), root];
    const result = JSON.parse(execFileSync(process.env.SAOLA_PHP_BINARY || 'php', args, { encoding: 'utf8' }));
    assert.equal(result.messages.vi.json.Hello, 'Xin chào');
    assert.equal(result.messages.en.groups.messages.nested.label, 'Label');
    assert.equal(result.messages.en.groups['pkg::labels'].title, 'Package');
    fs.writeFileSync(path.join(root, 'lang/vi.json'), '{broken');
    assert.throws(() => execFileSync('php', args, { stdio: 'pipe' }), /Command failed/);
    fs.writeFileSync(path.join(root, 'lang/vi.json'), '{"Hello":"Xin chào"}');
    fs.writeFileSync(path.join(root, 'lang/en/messages.php'), "<?php return ['bad' => 42];");
    assert.throws(() => execFileSync('php', args, { stdio: 'pipe' }), /Command failed/);
});


test('includes application source CSS in the Vite HTML input', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    fs.mkdirSync(path.join(root, 'resources/css'), { recursive: true });
    fs.writeFileSync(path.join(root, 'resources/css/app.css'), 'body { color: red; }');
    await buildContext(cfg, source, 'web', root, { ...dependencies, viteBuild: async vite => {
        const html = fs.readFileSync(path.join(vite.root, 'index.html'), 'utf8');
        assert.ok(html.includes(path.join(root, 'resources/css/app.css')));
        await dependencies.viteBuild(vite);
    } });
    cfg.contexts.web.css = false;
    assert.deepEqual(validateContext(cfg, source, 'web', root).sourceStyles, []);
});


test('asset graph follows referenced CSS and fonts, excluding unused and other-context output', t => {
    const { root } = fixture(t);
    const { referencedAssets, reachableViews } = require('../src/dist-dependencies');
    fs.mkdirSync(path.join(root, 'public/static/fonts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/static/site.css'), "@import './extra.css'; body { background: url('./logo.svg'); } @font-face { src:url('./fonts/main.woff2') }");
    fs.writeFileSync(path.join(root, 'public/static/extra.css'), 'body { color: red; }');
    fs.writeFileSync(path.join(root, 'public/static/logo.svg'), '<svg/>');
    fs.writeFileSync(path.join(root, 'public/static/fonts/main.woff2'), 'font');
    fs.writeFileSync(path.join(root, 'public/static/unused.js'), 'unused');
    fs.writeFileSync(path.join(root, 'public/static/saola.json'), '{}');
    fs.symlinkSync(path.join(root, 'public/brand'), path.join(root, 'public/static/linked-theme'));
    const result = referencedAssets(root, "const css='/static/site.css'; const linked='/static/linked-theme/logo.svg'");
    assert.deepEqual(result.map(item => item.to).sort(), ['static/extra.css', 'static/fonts/main.woff2', 'static/logo.svg', 'static/site.css']);
    const viewsDir = path.join(root, 'compiled'); fs.mkdirSync(viewsDir);
    const entries = ['home', 'layout', 'card', 'orphan'].map(name => ({ namingPath: `web/${name}.js`, actualPath: `${name}.js` }));
    fs.writeFileSync(path.join(viewsDir, 'home.js'), "const path = `${__layout__ + 'layout'}`; this.include('web.card'); const example = \"__base__ + \\'orphan\\'\";");
    fs.writeFileSync(path.join(viewsDir, 'layout.js'), 'const x=1');
    fs.writeFileSync(path.join(viewsDir, 'card.js'), 'const x=1');
    fs.writeFileSync(path.join(viewsDir, 'orphan.js'), 'const x=1');
    assert.deepEqual(reachableViews(entries, viewsDir, [{ path: '/', component: 'web.home' }], { __layout__: 'web.', __base__: 'web.' }).map(item => item.actualPath), ['home.js', 'layout.js', 'card.js']);
    assert.equal(reachableViews(entries, viewsDir, [{ path: '/', component: 'web.home' }], {}, ['web.orphan']).length, 4);
    fs.writeFileSync(path.join(viewsDir, 'home.js'), 'const path = `${__base__ + selected}`;');
    assert.equal(reachableViews(entries, viewsDir, [{ path: '/', component: 'web.home' }], { __base__: 'web.' }).length, 4);
});

test('asset graph ignores modules removed from the output bundle', t => {
    const { root } = fixture(t);
    const { assetPlugin } = require('../src/dist-dependencies');
    fs.mkdirSync(path.join(root, 'public/static'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/static/live.svg'), '<svg/>');
    fs.writeFileSync(path.join(root, 'public/static/dead.svg'), '<svg/>');
    fs.writeFileSync(path.join(root, 'public/static/shell.css'), 'body {}');
    const cfg = { base: '/' }; const plugin = assetPlugin(root, cfg, '<link rel="stylesheet" href="/static/shell.css">');
    plugin.transform("const logo='/static/live.svg'", 'live.js');
    plugin.transform("const logo='/static/dead.svg'", 'dead.js');
    plugin.generateBundle({}, { 'app.js': { type: 'chunk', code: '', modules: { 'live.js': { renderedLength: 10 }, 'dead.js': { renderedLength: 0 } } } });
    assert.deepEqual(cfg.referencedAssets.map(item => item.to).sort(), ['static/live.svg', 'static/shell.css']);
});

test('dist registry redirects extensionless custom registry imports and excludes orphan views', async t => {
    const { root, source } = fixture(t);
    const { registryPlugin } = require('../src/dist-dependencies');
    source.contexts.web.compiled = { views: 'web/views', registry: 'web/view-map.ts' };
    const viewsDir = path.join(root, 'resources/compiled/web/views');
    fs.mkdirSync(viewsDir, { recursive: true });
    for (const name of ['home', 'orphan']) fs.writeFileSync(path.join(viewsDir, `${name}.js`), 'export default class View {}');
    const entries = ['home', 'orphan'].map(name => ({ namingPath: `web/${name}.js`, actualPath: `${name}.js` }));
    const temporary = path.join(root, 'staging'); fs.mkdirSync(temporary);
    const plugin = registryPlugin({ compiledViews: { web: entries } }, source, { context: 'web', router: { routes: [{ path: '/', component: 'web.home' }] } }, temporary, root);
    const original = path.join(root, 'resources/compiled/web/view-map.ts');
    const result = await plugin.resolveId.call({ resolve: async () => ({ id: original }) }, './view-map', 'entry.ts');
    const code = fs.readFileSync(result, 'utf8');
    assert.match(code, /web\.home/);
    assert.doesNotMatch(code, /orphan/);
    assert.ok(!fs.existsSync(original));
});

test('static route discovery maps directories and HTML, skips parameters and rejects collisions', () => {
    const { staticPages } = require('../src/dist-static');
    const plan = staticPages([{ path: '/', children: [{ path: '/vn' }, { path: '/vn/guide.html' }, { path: '/post/{slug}' }] }], { paths: ['/post/hello.html'] });
    assert.deepEqual(plan.pages.map(page => page.file), ['post/hello.html', 'index.html', 'vn/index.html', 'vn/guide.html']);
    assert.deepEqual(plan.skipped, ['/post/{slug}']);
    assert.throws(() => staticPages([{ path: '/vn' }, { path: '/vn/' }]), /collide/);
    assert.throws(() => staticPages([{ path: '/%2e%2e/escape' }]), /Static route/);
    assert.throws(() => staticPages([{ path: '/file.json' }]), /\.html/);
    const { staticClientRoutes } = require('../src/dist-static');
    const aliases = staticClientRoutes([{ path: '/', component: 'web.home' }, { path: '/vn', component: 'web.vi' }]);
    assert.equal(aliases.find(route => route.path === '/vn/index.html').component, 'web.vi');
    assert.equal(aliases.find(route => route.path === '/vn/').component, 'web.vi');
    assert.equal(aliases.find(route => route.path === '/index.html').component, 'web.home');
});

test('static build exports actual HTML and preserves both prior static output and SPA on render failure', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    const { packageHtml } = require('../src/dist-static');
    const sanitized = packageHtml('<html><head><meta name="csrf-token" content="secret"><script>window.APP_CONFIGS={secret:1}</script></head><body><div id="app-root" data-server-rendered="true"><h1>Rendered</h1></div></body></html>', '<script type="module" src="/assets/boot.js"></script>', 'http://localhost');
    assert.match(sanitized, /<h1>Rendered/);
    assert.match(sanitized, /\/assets\/boot.js/);
    assert.doesNotMatch(sanitized, /secret|data-server-rendered/);
    const metadata = packageHtml('<html><head><link rel="canonical" href="https://neverseo.com/vn"><meta property="og:url" content="https://neverseo.com/vn"></head><body><img src="https://neverseo.com/assets/logo.svg"></body></html>', '', 'https://neverseo.com');
    assert.match(metadata, /href="https:\/\/neverseo.com\/vn"/);
    assert.match(metadata, /content="https:\/\/neverseo.com\/vn"/);
    assert.match(metadata, /src="\/assets\/logo.svg"/);
    await buildContext(cfg, source, 'web', root, dependencies);
    cfg.contexts.web.router.routes.push({ path: '/vn', component: 'web.home' }, { path: '/guide.html', component: 'web.home' });
    const staticCfg = { ...cfg, staticBuild: true, outDir: 'dist-static' };
    const renderPage = async (_, url) => `<html><head><title>${new URL(url).pathname}</title></head><body><div id="app-root"><h1>Page ${new URL(url).pathname}</h1></div></body></html>`;
    const output = await buildContext(staticCfg, source, 'web', root, { ...dependencies, renderPage });
    assert.match(fs.readFileSync(path.join(output, 'vn/index.html'), 'utf8'), /Page \/vn/);
    assert.match(fs.readFileSync(path.join(output, 'guide.html'), 'utf8'), /Page \/guide.html/);
    const previous = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    await assert.rejects(buildContext(staticCfg, source, 'web', root, { ...dependencies, renderPage: async () => { throw new Error('render failed'); } }), /render failed/);
    assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), previous);
    assert.ok(fs.existsSync(path.join(root, 'dist/web/bundle.js')));
});

test('file preview packages nested assets and CSS without changing canonical metadata', t => {
    const { root } = fixture(t);
    const { prepareFilePreview } = require('../src/dist-file');
    const stage = path.join(root, 'output'); fs.mkdirSync(path.join(stage, 'vn'), { recursive: true });
    fs.mkdirSync(path.join(stage, 'assets/css'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'assets/css/site.css'), '@import "/assets/css/other.css"; .hero{background:url(/assets/img/hero.svg)}');
    fs.writeFileSync(path.join(stage, 'vn/guide.html'), '<html><head><link rel="canonical" href="https://example.test/vn/guide.html"><link rel="stylesheet" href="/assets/css/site.css"><script type="module" src="/assets/boot.js"></script></head><body><img src="/assets/img/hero.svg"><a href="#topic">Topic</a></body></html>');
    prepareFilePreview(stage, { base: '/' }, { pages: [{ url: '/vn/guide.html', file: 'vn/guide.html' }] });
    const html = fs.readFileSync(path.join(stage, 'vn/guide.html'), 'utf8');
    assert.match(html, /href="\.\.\/assets\/css\/site.css"/);
    assert.match(html, /src="\.\.\/assets\/img\/hero.svg"/);
    assert.match(html, /href="#topic"/);
    assert.match(html, /href="https:\/\/example.test\/vn\/guide.html"/);
    assert.doesNotMatch(html, /<base /);
    assert.match(html, /if\(location.protocol!=='file:'\)/);
    assert.equal(fs.readFileSync(path.join(stage, 'assets/css/site.css'), 'utf8'), '@import "other.css"; .hero{background:url(../img/hero.svg)}');
});

test('file mode repairs resources, allows built pages and blocks unavailable routes; HTTP is untouched', () => {
    const vm = require('node:vm'); const { filePreview } = require('../src/dist-file');
    class Element {
        constructor(tag, attrs = {}) { this.tag = tag; this.attrs = attrs; }
        hasAttribute(name) { return name in this.attrs; }
        getAttribute(name) { return this.attrs[name] || ''; }
        setAttribute(name, value) { this.attrs[name] = value; }
        matches(selector) { return selector.startsWith(this.tag); }
        querySelectorAll() { return []; }
        closest() { return this; }
    }
    const listeners = {}; const alerts = []; const navigations = [];
    const image = new Element('img', { src: '/assets/logo.svg' });
    const pageLink = new Element('a', { href: '/vn' });
    const context = { location: new URL('file:///package/vn/guide.html'), URL, Element,
        MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
        document: { documentElement: { lang: 'vi', querySelectorAll() { return [image, pageLink]; } }, addEventListener(name, handler) { listeners[name] = handler; } },
        window: { alert(value) { alerts.push(value); }, App: { Router: { navigate(value) { navigations.push(value); } } } } };
    vm.runInNewContext(`(${filePreview.toString()})({root:'../',base:'/',static:true,pages:[{url:'/vn',file:'vn/index.html'}]})`, context);
    listeners.DOMContentLoaded();
    assert.equal(image.attrs.src, 'file:///package/assets/logo.svg');
    assert.equal(pageLink.attrs.href, 'file:///package/vn/index.html');
    const click = attrs => { let blocked = false; listeners.click({ target: new Element('a', attrs), preventDefault() { blocked = true; }, stopImmediatePropagation() {} }); return blocked; };
    assert.equal(click({ href: '/products/demo.html' }), true);
    assert.match(alerts[0], /Không thể truy cập route có tham số/);
    assert.equal(click({ href: '/vn' }), false);
    assert.equal(click({ href: '#topic' }), false);
    assert.equal(click({ href: 'https://app.example.test/login' }), false);
    vm.runInNewContext(`(${filePreview.toString()})({root:'../',base:'/',static:false})`, context);
    assert.equal(click({ href: '#/about.html' }), true);
    assert.equal(navigations[0], '/about.html');
    const http = { location: new URL('https://example.test/vn') };
    vm.runInNewContext(`(${filePreview.toString()})({})`, http);
    assert.equal(http.window, undefined);
});

test('SPA file bundle uses hash routing and rejects parameter navigation before mounting', async t => {
    const { root, source, cfg, dependencies } = fixture(t);
    cfg.contexts.web.router.routes.push({ path: '/products/{name}', component: 'web.product' });
    let classic = false;
    await buildContext(cfg, source, 'web', root, { ...dependencies, viteBuild: async options => {
        if (options.build.rollupOptions?.output?.format === 'iife') {
            classic = true;
            const boot = fs.readFileSync(options.build.rollupOptions.input, 'utf8').replace(/import\([^;]+\);/, '');
            let messages = 0;
            const window = { __SAOLA_FILE_PREVIEW__: { message() { messages++; } } };
            require('node:vm').runInNewContext(boot, { window });
            assert.equal(window.APP_CONFIGS.router.mode, 'hash');
            assert.equal(window.APP_CONFIGS.router.beforeEach({ path: '/products/{name}' }), false);
            assert.equal(window.APP_CONFIGS.router.beforeEach({ path: '/' }), true);
            assert.equal(messages, 1);
        }
        await dependencies.viteBuild(options);
    } });
    assert.equal(classic, true);
    assert.equal(cfg.contexts.web.router.mode, undefined);
});

test('dist env selects mode, expands variables, preserves process env and filters unrelated secrets', t => {
    const { root } = fixture(t); const { loadDistEnv } = require('../src/dist-env');
    fs.writeFileSync(path.join(root, '.env'), 'BACKEND=https://backend.test\nDB_PASSWORD=private\nSAOLA_DIST_API_URL=${BACKEND}/api\nSAOLA_DIST_BASE_URL=/initial/\n');
    fs.writeFileSync(path.join(root, '.env.local'), 'SAOLA_DIST_BASE_URL=/local/\n');
    fs.writeFileSync(path.join(root, '.env.production'), 'SAOLA_DIST_BASE_URL=/production/\nSAOLA_DIST_DATA_URL=${BACKEND}\n');
    fs.writeFileSync(path.join(root, '.env.production.local'), 'SAOLA_DIST_BASE_URL=/production-local/\n');
    fs.writeFileSync(path.join(root, '.env.staging'), 'SAOLA_DIST_BASE_URL=/staging/\n');
    const processEnv = { SAOLA_DIST_WEB_API_KEY: 'public-key', BACKEND: 'https://shell.test', SERVER_SECRET: 'hidden' };
    const original = { ...processEnv };
    const env = loadDistEnv(root, 'production', processEnv);
    assert.equal(env.SAOLA_DIST_API_URL, 'https://shell.test/api');
    assert.equal(env.SAOLA_DIST_DATA_URL, 'https://shell.test');
    assert.equal(env.SAOLA_DIST_BASE_URL, '/production-local/');
    assert.equal(env.DB_PASSWORD, undefined);
    assert.equal(env.SERVER_SECRET, undefined);
    assert.deepEqual(processEnv, original);
    assert.equal(loadDistEnv(root, 'staging', {}).SAOLA_DIST_BASE_URL, '/staging/');
    assert.equal(loadDistEnv(root, 'production', { SAOLA_DIST_BASE_URL: '/shell/' }).SAOLA_DIST_BASE_URL, '/shell/');
    assert.throws(() => loadDistEnv(root, '../bad'), /Invalid dist mode/);
    assert.throws(() => loadDistEnv(root, 'local'), /reserved/);
});

test('env overrides dist config per context and reaches both API and await boot configuration', async t => {
    const { root, source } = fixture(t);
    source.contexts.web.router = { routes: [{ path: '/', component: 'web.home' }] };
    source.contexts.mobile.router = { routes: [{ path: '/', component: 'mobile.home' }] };
    source.contexts.web.dist = { apiUrl: 'https://configured.test', view: { systemData: { keep: true }, fetchOptions: { credentials: 'include' } } };
    fs.writeFileSync(path.join(root, '.env.production'), 'SAOLA_DIST_BASE_URL=/portal/\nSAOLA_DIST_API_URL=https://global.test/api\nSAOLA_DIST_DATA_URL=https://global.test\nSAOLA_DIST_API_KEY=public-global\nSAOLA_DIST_WEB_API_URL=https://web.test/api\nSAOLA_DIST_WEB_DATA_URL=https://web.test\nSAOLA_DIST_WEB_API_KEY=public-web\nSAOLA_DIST_WEB_API_KEY_HEADER=X-Client-Key\nSAOLA_DIST_MOBILE_BASE_URL=/mobile/\n');
    const config = await loadDistConfig(root, undefined, source);
    await resolveRuntimeConfig(config, root);
    const web = config.contexts.web; const mobile = config.contexts.mobile;
    assert.equal(web.base, '/portal/');
    assert.equal(web.api.baseUrl, 'https://web.test/api');
    assert.equal(web.view.dataEndpoint, 'https://web.test');
    assert.equal(web.api.headers['X-Client-Key'], 'public-web');
    assert.equal(web.view.fetchOptions.headers['X-Client-Key'], 'public-web');
    assert.equal(web.view.fetchOptions.credentials, 'include');
    assert.equal(web.view.systemData.keep, true);
    assert.equal(mobile.base, '/mobile/');
    assert.equal(mobile.api.baseUrl, 'https://global.test/api');
    assert.equal(mobile.view.dataEndpoint, 'https://global.test');
    const boot = require('../src/dist').makeBootConfig(validateContext(config, source, 'web', root));
    assert.equal(boot.api.baseUrl, 'https://web.test/api');
    assert.equal(boot.view.dataEndpoint, 'https://web.test');
});

test('dist api URL replaces exported default await endpoint, preserving explicitly configured endpoint', async t => {
    const { root, source } = fixture(t);
    const config = { contexts: { web: { apiUrl: 'https://build.test' }, mobile: { apiUrl: 'https://build.test/api', view: { dataEndpoint: 'https://data.test' } } } };
    await resolveRuntimeConfig(config, root, async () => Object.fromEntries(['web', 'mobile'].map(name => [name, { routes: [{ path: '/', component: name + '.home' }], view: { dataEndpoint: 'https://old-server.test' } }])));
    assert.equal(config.contexts.web.view.dataEndpoint, 'https://build.test');
    assert.equal(config.contexts.mobile.view.dataEndpoint, 'https://data.test');
});
