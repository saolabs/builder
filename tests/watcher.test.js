const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const Compiler = require('../src/index');

test('watch mode rebuilds nested views and excludes hidden and dependency directories', { timeout: 10000 }, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'saola-watch-'));
    const views = path.join(root, 'views');
    const compiler = new Compiler();
    compiler.startPhpWorker = () => {};
    let rebuilt;
    compiler.buildContext = async () => { if (rebuilt) rebuilt(); };
    try {
        for (const directory of ['nested', '.hidden', 'node_modules']) {
            await fs.mkdir(path.join(views, directory), { recursive: true });
            await fs.writeFile(path.join(views, directory, 'home.sao'), '<p>Original</p>');
        }
        await compiler.setupWatcher({ paths: { saoView: 'views' } }, root, 'web');
        const watcher = compiler.watcherInstances[0];
        assert.ok(watcher, 'watcher must start with the installed dependency');
        await once(watcher, 'ready');
        const watched = Object.keys(watcher.getWatched());
        assert.ok(watched.includes(path.join(views, 'nested')));
        assert.ok(!watched.some(directory => directory.includes('.hidden') || directory.includes('node_modules')));
        const completed = new Promise(resolve => { rebuilt = resolve; });
        await fs.writeFile(path.join(views, 'nested', 'home.sao'), '<p>Updated</p>');
        await completed;
    } finally {
        await compiler.closeWatchers();
        await fs.rm(root, { recursive: true, force: true });
    }
});
