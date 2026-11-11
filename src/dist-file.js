/** Browser file preview: no fetches or ES modules are required for static pages. */
const fs = require('node:fs');
const path = require('node:path');

function filePreview(options) {
    if (location.protocol !== 'file:') return;
    const root = new URL(options.root, location.href);
    const pages = new Map((options.pages || []).flatMap(page => [[page.url.replace(/\/$/, '') || '/', page.file], ['/' + page.file, page.file]]));
    const message = () => {
        const vi = document.documentElement.lang.startsWith('vi') || document.documentElement.lang === 'vn';
        window.alert(vi
            ? 'Không thể truy cập route có tham số trong chế độ xem file. Vui lòng chạy bản build qua HTTP để sử dụng trang này.'
            : 'Parameterized routes are unavailable in file preview. Serve this build over HTTP to access this page.');
    };
    window.__SAOLA_FILE_PREVIEW__ = { root: root.href, message };
    const resource = value => value.startsWith('/') && !value.startsWith('//') ? new URL((value.startsWith(options.base) ? value.slice(options.base.length) : value.slice(1)), root).href : value;
    const repair = element => {
        if (!(element instanceof Element)) return;
        for (const attr of ['src', 'poster']) if (element.hasAttribute(attr)) {
            const value = element.getAttribute(attr); const next = resource(value);
            if (value !== next) element.setAttribute(attr, next);
        }
        if (element.matches('link[href],image[href],use[href]')) {
            const value = element.getAttribute('href'); const next = resource(value);
            if (value !== next) element.setAttribute('href', next);
        }
        const css = value => value.replace(/url\(\s*(["']?)(\/[^\s)"']+)\1\s*\)/g, (_, quote, url) => `url(${quote}${resource(url)}${quote})`);
        if (element.hasAttribute('style')) {
            const value = element.getAttribute('style'); const next = css(value);
            if (value !== next) element.setAttribute('style', next);
        }
        if (element.tagName === 'STYLE') {
            const next = css(element.textContent);
            if (next !== element.textContent) element.textContent = next;
        }
        if (element.hasAttribute('srcset')) {
            const value = element.getAttribute('srcset');
            const next = value.replace(/(^|,\s*)(\/[^\s,]+)/g, (_, prefix, url) => prefix + resource(url));
            if (value !== next) element.setAttribute('srcset', next);
        }
        if (element.matches('a[href]')) {
            const value = element.getAttribute('href');
            if (value.startsWith('/') && !value.startsWith('//')) {
                const url = new URL(value, 'https://preview.invalid');
                const file = pages.get(url.pathname.replace(/\/$/, '') || '/');
                if (file) element.setAttribute('href', new URL(file + url.search + url.hash, root).href);
            }
        }
    };
    const scan = element => { repair(element); element.querySelectorAll?.('[src],[poster],[srcset],[style],style,a[href],link[href],image[href],use[href]').forEach(repair); };
    new MutationObserver(records => records.forEach(record => {
        if (record.type === 'attributes') repair(record.target);
        else record.addedNodes.forEach(scan);
    })).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'poster', 'srcset', 'href', 'style'] });
    document.addEventListener('DOMContentLoaded', () => scan(document.documentElement));
    document.addEventListener('click', event => {
        const link = event.target.closest?.('a[href],[data-navigate],[data-route]');
        if (!link || link.hasAttribute('download')) return;
        if (!options.static && link.hasAttribute('data-route')) return;
        const raw = link.getAttribute('data-navigate') || link.getAttribute('href') || '';
        if (!options.static && raw.startsWith('#/')) {
            event.preventDefault(); event.stopImmediatePropagation();
            window.App?.Router?.navigate(raw.slice(1)); return;
        }
        if (raw.startsWith('//') || (raw.startsWith('#') && !raw.startsWith('#/'))) return;
        let url;
        try { url = new URL(raw, location.href); } catch { return; }
        if (url.protocol !== 'file:' && !raw.startsWith('/')) return;
        const pathname = raw.startsWith('/') ? new URL(raw, 'https://preview.invalid').pathname : '/' + url.pathname.slice(root.pathname.length);
        if (options.static) {
            const file = pages.get(pathname.replace(/\/$/, '') || '/');
            if (file && !link.hasAttribute('data-route')) {
                const destination = new URL(file + url.search + url.hash, root).href;
                if (link.hasAttribute('data-navigate')) { event.preventDefault(); event.stopImmediatePropagation(); location.href = destination; }
                else link.setAttribute('href', destination);
                return;
            }
            event.preventDefault(); event.stopImmediatePropagation(); message();
        } else {
            event.preventDefault(); event.stopImmediatePropagation();
            window.App?.Router?.navigate(pathname + url.search + url.hash);
        }
    }, true);
}

function previewHtml(html, file, cfg, pages) {
    const root = '../'.repeat(file.split('/').length - 1) || './';
    const options = JSON.stringify({ root, base: cfg.base, static: !!pages, pages }).replace(/</g, '\\u003c');
    // A base keeps relative resources anchored to the package root, including nested HTML.
    const setup = `<script>(function(){var base=location.protocol==='file:'?new URL(${JSON.stringify(root)},location.href).href:${JSON.stringify(cfg.base)};document.write('<base href="'+base.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">');})();(${filePreview.toString()})(${options});</script>`;
    html = html.replace(/<head\b[^>]*>/i, match => match + (pages ? `<script>(${filePreview.toString()})(${options});</script>` : setup));
    html = html.replace(/<(?:script|link|img|source|video|audio)\b[^>]*>/gi, tag => {
        if (/\brel=["']canonical["']/i.test(tag)) return tag;
        tag = tag.replace(/\bsrcset=["']([^"']*)["']/gi, (_, value) => `srcset="${value.replace(/(^|,\s*)(\/[^\s,]+)/g, (match, prefix, url) => url.startsWith('//') ? match : prefix + (pages ? root : './') + (url.startsWith(cfg.base) ? url.slice(cfg.base.length) : url.slice(1)))}"`);
        return tag.replace(/\b(src|href|poster)=["'](\/[^"']*)["']/gi, (match, attr, value) => {
            if (value.startsWith('//')) return match;
            const clean = value.startsWith(cfg.base) ? value.slice(cfg.base.length) : value.slice(1);
            return `${attr}="${pages ? root : './'}${clean}"`;
        });
    });
    // Browser file origins reject module scripts/preloads even if their paths exist.
    html = html.replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script\s*>|<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, tag => `<script>if(location.protocol!=='file:')document.write(${JSON.stringify(tag).replace(/</g, '\\u003c')});</script>`);
    if (!pages) html = html.replace(/<\/body>/i, '<script>if(location.protocol===\'file:\'){var s=document.createElement(\'script\');s.src=\'./saola-file.js\';document.body.appendChild(s);}</script></body>');
    return html;
}

function prepareFilePreview(stage, cfg, plan) {
    for (const page of plan?.pages || [{ file: 'index.html' }]) {
        const filename = path.join(stage, page.file);
        fs.writeFileSync(filename, previewHtml(fs.readFileSync(filename, 'utf8'), page.file, cfg, plan?.pages));
    }
    // CSS resolves URLs relative to its own file, not the document's base.
    function visit(directory) {
        for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
            const filename = path.join(directory, item.name);
            if (item.isDirectory()) visit(filename);
            else if (item.name.endsWith('.css')) {
                const relative = value => {
                    if (!value.startsWith('/') || value.startsWith('//')) return value;
                    const target = value.startsWith(cfg.base) ? value.slice(cfg.base.length) : value.slice(1);
                    return path.posix.relative(path.relative(stage, directory).split(path.sep).join('/'), target) || '.';
                };
                const css = fs.readFileSync(filename, 'utf8').replace(/url\(\s*(["']?)(\/[^\s)"']+)\1\s*\)/g, (_, quote, url) => `url(${quote}${relative(url)}${quote})`).replace(/(@import\s+["'])(\/[^"']+)(["'])/g, (_, before, url, after) => before + relative(url) + after);
                fs.writeFileSync(filename, css);
            }
        }
    }
    visit(stage);
}
module.exports = { filePreview, previewHtml, prepareFilePreview };
