const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { referencedAssets } = require('./dist-dependencies');

function staticPages(routes, options = {}) {
    for (const field of ['paths', 'exclude']) if (options[field] !== undefined && (!Array.isArray(options[field]) || options[field].some(value => typeof value !== 'string'))) throw new Error(`static.${field} must be a string array`);
    const paths = new Set(options.paths || []);
    const skipped = [];
    function visit(items) {
        for (const route of items) {
            if (/[:{}*?]/.test(route.path)) skipped.push(route.path);
            else paths.add(route.path);
            if (route.children) visit(route.children);
        }
    }
    visit(routes);
    const files = new Map();
    const result = [];
    for (const url of paths) {
        if ((options.exclude || []).includes(url)) continue;
        if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || /[?#\\\x00]/.test(url)) throw new Error(`Invalid static URL: ${url}`);
        const clean = decodeURIComponent(url).replace(/^\/+|\/+$/g, '');
        if (/[?#\\\x00]/.test(clean)) throw new Error(`Invalid static URL: ${url}`);
        if (clean.split('/').some(part => part === '.' || part === '..') || (path.posix.extname(clean) && !clean.endsWith('.html'))) throw new Error(`Static route must use .html or a directory: ${url}`);
        const file = clean ? (clean.endsWith('.html') ? clean : clean + '/index.html') : 'index.html';
        if (files.has(file)) throw new Error(`Static routes collide: ${files.get(file)} and ${url} -> ${file}`);
        files.set(file, url); result.push({ url, file });
    }
    if (!result.length) throw new Error('No concrete static routes to render');
    return { pages: result, skipped };
}

async function renderPage(projectRoot, url, output) {
    if (!fs.existsSync(path.join(projectRoot, 'bootstrap/app.php'))) throw new Error('--static requires Laravel for HTML rendering');
    try {
        await promisify(execFile)(process.env.SAOLA_PHP_BINARY || 'php', [path.join(__dirname, 'render-static.php'), projectRoot, url, output], { cwd: projectRoot, maxBuffer: 4 * 1024 * 1024 });
        return fs.readFileSync(output, 'utf8');
    } catch (error) { throw new Error(`Static render failed: ${error.stderr || error.message}`); }
}

function packageHtml(rendered, shell, origin) {
    if (!/<html\b/i.test(rendered)) throw new Error('Renderer did not return a complete HTML document');
    // The built client boot owns config. Server-specific scripts and session tokens are not exported.
    let html = rendered.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<meta\b[^>]*name=["']csrf-token["'][^>]*>/gi, '')
        .replace(/\sdata-server-rendered=["'][^"']*["']/gi, '')
        .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
    const assets = [...shell.matchAll(/<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)].map(match => match[0]).join('\n');
    html = html.replace(/<\/head\s*>/i, assets + '\n</head>');
    html = html.replace(/<(?:a|img|script|link|source)\b[^>]*>/gi, tag => {
        if (/\brel=["']canonical["']/i.test(tag)) return tag;
        return tag.split(origin + '/').join('/');
    });
    return html;
}

function staticClientRoutes(routes, options) {
    const { pages } = staticPages(routes, options);
    const flat = [];
    const visit = items => items.forEach(route => { flat.push(route); if (route.children) visit(route.children); });
    visit(routes);
    const aliases = [];
    const known = new Set(flat.map(route => route.path));
    for (const page of pages) {
        if (!page.file.endsWith('/index.html') && page.file !== 'index.html') continue;
        const route = flat.find(item => item.path === page.url);
        if (!route) continue;
        for (const alias of ['/' + page.file, page.url.replace(/\/$/, '') + '/']) {
            if (known.has(alias)) continue;
            known.add(alias); aliases.push({ path: alias, component: route.component, meta: route.meta });
        }
    }
    return [...routes, ...aliases];
}

async function prerender(projectRoot, cfg, stage, temporary, renderer = renderPage) {
    const plan = staticPages(cfg.router.routes, cfg.static || {});
    const shell = fs.readFileSync(path.join(stage, 'index.html'), 'utf8');
    const origin = cfg.static?.origin || 'http://localhost';
    const parsedOrigin = new URL(origin);
    if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) throw new Error('static.origin must be an HTTP origin');
    const pages = [];
    for (const page of plan.pages) {
        const rendered = await renderer(projectRoot, new URL(page.url, origin).href, path.join(temporary, 'render.html'));
        const html = packageHtml(rendered, shell, origin.replace(/\/$/, ''));
        const target = path.join(stage, page.file);
        if (page.file !== 'index.html' && fs.existsSync(target)) throw new Error(`Static HTML would overwrite an asset: ${page.file}`);
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html);
        pages.push(html);
    }
    cfg.referencedAssets = [...new Map([...(cfg.referencedAssets || []), ...referencedAssets(projectRoot, pages.join('\n'), cfg.base)].map(asset => [asset.to, asset])).values()];
    if (plan.skipped.length) console.log(`Saola static skipped parameter routes: ${plan.skipped.join(', ')} (use static.paths for concrete URLs)`);
    console.log(`Saola static pages: ${plan.pages.length}`);
    return plan;
}
module.exports = { staticPages, staticClientRoutes, packageHtml, prerender };
