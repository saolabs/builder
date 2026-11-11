import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const root = process.argv[2];
const require = createRequire(path.join(root, 'package.json'));
const {JSDOM} = require('jsdom');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'ssr.html'), 'utf8'), {url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true});
const {window} = dom;
window.scrollTo = () => {};
// Browser-owned intervals must be released when this isolated document closes.
globalThis.setInterval = window.setInterval.bind(window);
globalThis.clearInterval = window.clearInterval.bind(window);
for (const key of ['window', 'document', 'navigator', 'location', 'history', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLButtonElement', 'Node', 'Element', 'DocumentFragment', 'Comment', 'Text', 'Event', 'CustomEvent', 'PopStateEvent', 'MutationObserver', 'AbortController', 'AbortSignal', 'DOMParser', 'NodeFilter', 'localStorage', 'sessionStorage', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    if (window[key] !== undefined) Object.defineProperty(globalThis, key, {configurable: true, value: typeof window[key] === 'function' && /^[a-z]/.test(key) ? window[key].bind(window) : window[key]});
}
const original = document.getElementById('value');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/static/saola/studio/manifest.json')));
const entry = manifest['resources/js/saola/app.studio.js'].file;
const until = async check => {for (let i = 0; i < 120; i++) {if (check()) return; await new Promise(resolve => setTimeout(resolve, 25));} throw new Error('Hydration/event deadline exceeded');};
let app;
try {
    const loaded = await import(pathToFileURL(path.join(root, 'public/static/saola/studio', entry)).href);
    app = loaded.App;
    await until(() => app.Demo && app.View && app.Router);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(document.getElementById('value'), original, 'SSR node must be claimed, not replaced');
    assert.equal(document.querySelectorAll('#value').length, 1);
    document.getElementById('inc').click();
    await until(() => document.getElementById('value').textContent === '1');
    assert.equal(app.Demo.next(5), 6);
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/static/saola/contexts.json'))).studio;
    await app.View.mountView(`${metadata.namespace}.pages.home`, {});
    await until(() => document.getElementById('value')?.textContent === '0');
    document.getElementById('inc').click();
    await until(() => document.getElementById('value').textContent === '1');
    assert.equal(document.querySelectorAll('#inc').length, 1, 'CSR mount must not duplicate controls');
    console.log('SSR claimed + event via App.Demo + fresh CSR mount: PASS');
} finally {
    app?.Router?.destroy();
    app?.View?.destroy();
    app?.Store?.destroy();
    app?.destroy();
    window.close();
}
