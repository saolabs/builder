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

test('package source watch rebuilds TypeScript changes under vendor', {timeout: 10000}, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'saola-package-watch-'));
    const source = path.join(root, 'vendor/acme/panel/resources/saola/admin');
    const hostRoot = path.join(root, 'resources/saola/admin');
    const compiler = new Compiler();
    compiler.startPhpWorker = () => {};
    let rebuilt;
    compiler.buildContext = async () => rebuilt?.();
    try {
        await fs.mkdir(path.join(source, 'app'), {recursive: true});
        await fs.writeFile(path.join(source, 'app/service.ts'), 'export const version = 1;');
        await compiler.setupWatcher({paths: {saoView: 'resources/saola'}, contexts: {admin: {_contextPackage: {source, hostRoot}}}}, root, 'admin');
        await once(compiler.watcherInstances[0], 'ready');
        const completed = new Promise(resolve => {rebuilt = resolve;});
        await fs.writeFile(path.join(source, 'app/service.ts'), 'export const version = 2;');
        await completed;
    } finally {
        compiler.closeWatchers();
        await fs.rm(root, {recursive: true, force: true});
    }
});

test('conventional context watch reloads .env and serializes edits during a build', {timeout: 15000}, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'saola-local-watch-'));
    const Config = require('../src/config-manager');
    const source = path.join(root, 'resources/saola/studio');
    const compiler = new Compiler();
    compiler.startPhpWorker = () => {};
    let running = 0; let peak = 0; const modes = []; let finish;
    compiler.buildContext = async config => {
        peak = Math.max(peak, ++running);
        modes.push(config.contexts.studio._contextSource.kind);
        await new Promise(resolve => setTimeout(resolve, 850));
        running--;
        if (modes.length >= 2 && running === 0) finish?.();
    };
    try {
        await fs.mkdir(path.join(source, 'views'), {recursive: true});
        await fs.mkdir(path.join(source, 'themes/default/views'), {recursive: true});
        await fs.writeFile(path.join(source, 'views/home.sao'), '<template>Flat</template>');
        await fs.writeFile(path.join(source, 'themes/default/views/home.sao'), '<template>Themed</template>');
        await fs.writeFile(path.join(root, '.env'), 'SAOLA_STUDIO_MODE=standalone\n');
        await compiler.setupWatcher(Config.loadConfig(root).config, root, 'studio');
        await once(compiler.watcherInstances[0], 'ready');
        const finished = new Promise(resolve => {finish = resolve;});
        await fs.writeFile(path.join(root, '.env'), 'SAOLA_STUDIO_MODE=theme\n');
        // Wait for the first compilation to enter, then edit while it is busy.
        for (let i = 0; i < 35 && !running; i++) await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(running, 1, '.env must trigger a compile without sao.config.json');
        await fs.writeFile(path.join(source, 'themes/default/views/home.sao'), '<template>Changed during build</template>');
        await finished;
        assert.deepEqual(modes, ['theme', 'theme']);
        assert.equal(peak, 1, 'two edits must never share one compiler concurrently');
    } finally {
        await compiler.closeWatchers();
        await fs.rm(root, {recursive: true, force: true});
    }
});
