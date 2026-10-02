const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Compiler = require('../src/index');

(async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sao-typed-output-'));
    try {
        const source = path.join(root, 'card.sao');
        fs.writeFileSync(source, '@state(count: number = 0)<template>{{ count }}</template>');
        const compiler = new Compiler();
        compiler.compiledViews = { web: [] };
        let lang = 'ts';
        // Verify routing of an actual CompileResult shape, independent of PHP discovery.
        compiler.compileWithPhp = async () => ({ lang, blade: '<div></div>', js: "const __VIEW_PATH__ = 'web.card';" });
        const compile = () => compiler.processSaoFile(source, root, 'web', 'web', {
            views: { web: '.' }, blade: { web: 'web' }, compiled: { views: 'views' },
        }, root, { bladeView: 'blade', compiled: 'compiled', public: 'public' });
        await compile();
        assert.ok(fs.existsSync(path.join(root, 'compiled/views/card.ts')));
        assert.equal(compiler.compiledViews.web.at(-1).actualPath, 'card.ts');
        lang = 'js';
        await compile();
        assert.ok(fs.existsSync(path.join(root, 'compiled/views/card.js')));
        assert.ok(!fs.existsSync(path.join(root, 'compiled/views/card.ts')));
        lang = 'ts';
        await compile();
        assert.ok(!fs.existsSync(path.join(root, 'compiled/views/card.js')));
        console.log('typed output extension and transition: passed');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
