const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Compiler = require('../src/index');
const {RegistryGenerator} = require('../src/registry-generator');
const {pathToFileURL} = require('node:url');

// Directive của app/thư viện phải tới được saoc ở CẢ hai đường: compile một lần
// và worker của watch mode. Trước đây builder không truyền --directives nên
// sao.directives.php không bao giờ được nạp lúc build.
const DIRECTIVES = `<?php
use Saola\\Compiler\\Directive\\Sao;
return [Sao::directive('twice', fn (string $e) => "{{ ({$e}) * 2 }}")];
`;
const SOURCE = "@states({ n: 2 })\n<template><p>@twice(n)</p></template>\n";
const OPTIONS = { viewPath: 't.v', functionName: 'V', factoryName: 'VF' };

async function project(withDirectives) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'saola-directives-'));
    if (withDirectives) await fs.writeFile(path.join(root, 'sao.directives.php'), DIRECTIVES);
    const compiler = new Compiler();
    compiler.projectRoot = root;
    // saoc thật của workspace: thư mục tạm không có vendor/.
    process.env.SAOLA_PHP_COMPILER = path.resolve(__dirname, '../../compiler/bin/saoc');
    return { root, compiler };
}

test('compile một lần nạp sao.directives.php của project', async () => {
    const { root, compiler } = await project(true);
    try {
        assert.equal(compiler.resolveDirectivesRoot(), root);
        const result = await compiler.compileWithPhp(SOURCE, OPTIONS);
        assert.match(result.blade, /\{\{ \(\$n\) \* 2 \}\}/);
        assert.match(result.js, /this\.output\(`[^`]+`[^\n]*\(n\) \* 2/);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('worker watch mode cũng nhận directives', async () => {
    const { root, compiler } = await project(true);
    try {
        compiler.startPhpWorker();
        const result = await compiler.compileWithPhp(SOURCE, OPTIONS);
        assert.match(result.blade, /\{\{ \(\$n\) \* 2 \}\}/);
    } finally {
        compiler.closeWatchers();
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('project không khai báo gì thì không truyền cờ (compiler cũ vẫn build được)', async () => {
    const { root, compiler } = await project(false);
    try {
        assert.equal(compiler.resolveDirectivesRoot(), null);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('middleware directive survives real compilation and is available before loading a lazy view', async () => {
    const {root, compiler} = await project(false);
    try {
        const result = await compiler.compileWithPhp("@middleware('auth', 'role:admin,editor')<template><p>Private</p></template>", OPTIONS);
        assert.match(result.js, /Object\.assign\(VF, \{middleware: __SAOLA_MIDDLEWARE__\}\)/);
        assert.doesNotMatch(result.blade, /@middleware/);
        await fs.writeFile(path.join(root, 'guarded.js'), result.js);
        const registry = path.join(root, 'registry.mjs');
        RegistryGenerator.generate('web', [{namingPath:'web/guarded.js',actualPath:'guarded.js'}], registry, root, {lazy:true});
        // Only import the registry. Its protected chunk imports the client package,
        // which is intentionally unavailable here; importing it would fail this test.
        const {ViewRegistry} = await import(pathToFileURL(registry).href);
        assert.equal(typeof ViewRegistry['web.guarded'], 'function');
        assert.deepEqual(ViewRegistry['web.guarded'].middleware, ['auth','role:admin,editor']);
    } finally {
        await fs.rm(root, {recursive:true,force:true});
    }
});
