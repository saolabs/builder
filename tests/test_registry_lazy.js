/**
 * Registry generator — chế độ lazy (GAP-01 Phần B).
 *
 * Bất biến:
 *   1. Mặc định (không config) → eager 100%, KHÔNG đổi hành vi app hiện có
 *   2. lazy:true → view thường thành `() => import(...)`
 *   3. layout LUÔN eager (@extends resolve đồng bộ)
 *   4. view bị @include LUÔN eager (quét output đã compile)
 *   5. registry.eager[] của user được tôn trọng (khớp đúng + theo tiền tố)
 *
 * Chạy: node tests/test_registry_lazy.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { RegistryGenerator } = require('../src/registry-generator');

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}  ${detail}`); failed++; }
};

/** Dựng cây view giả + generate registry, trả nội dung registry. */
function generate(options) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sao-registry-'));
    const viewsDir = path.join(dir, 'views');

    const files = {
        'web/layouts/base.js': 'export default function WebLayoutsBase(){}',
        'web/modules/home/index.js':
            // page dùng layout + include một partial
            `this.extendView(__layout__ + 'web.layouts.base', {});\n` +
            `this.include("c1", __template__ + 'web.partials.card', parentElement, [], () => ({}));\n` +
            'export default function WebModulesHomeIndex(){}',
        'web/modules/posts/list.js': 'export default function WebModulesPostsList(){}',
        'web/partials/card.js': 'export default function WebPartialsCard(){}',
    };
    const entries = [];
    for (const [rel, code] of Object.entries(files)) {
        const full = path.join(viewsDir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, code, 'utf8');
        entries.push({ namingPath: rel, actualPath: rel });
    }

    const outputPath = path.join(dir, 'registry.js');
    RegistryGenerator.generate('web', entries, outputPath, viewsDir, options);
    return fs.readFileSync(outputPath, 'utf8');
}

const isLazy = (js, dotPath) =>
    new RegExp(`'${dotPath.replace(/\./g, '\\.')}':\\s*\\(\\)\\s*=>\\s*import\\(`).test(js);
const isEager = (js, dotPath) =>
    new RegExp(`'${dotPath.replace(/\./g, '\\.')}':\\s*[A-Z]\\w*\\s*(,|\\n|\\})`).test(js);

console.log('\n── 1. Mặc định: eager 100% (không đổi hành vi app hiện có) ──');
{
    const js = generate({});
    check('posts.list eager', isEager(js, 'web.modules.posts.list'));
    check('không có () => import(...) nào', !/=>\s*import\(/.test(js));
}

console.log('\n── 2. lazy:true — view thường thành lazy ──');
{
    const js = generate({ lazy: true });
    check('posts.list → lazy', isLazy(js, 'web.modules.posts.list'));
    check('layout base → VẪN eager (@extends đồng bộ)', isEager(js, 'web.layouts.base'));
    check('partials.card → VẪN eager (bị @include)', isEager(js, 'web.partials.card'));
    check('type nới cho Promise', /View \| Promise<any>/.test(js) || !/: Record</.test(js));
}

console.log('\n── 3. registry.eager[] của user ──');
{
    const js = generate({ lazy: true, eager: ['web.modules.posts.list'] });
    check('khớp chính xác → eager', isEager(js, 'web.modules.posts.list'));
}
{
    const js = generate({ lazy: true, eager: ['web.modules'] });
    check('tiền tố → cả nhánh eager', isEager(js, 'web.modules.posts.list'));
}
{
    const js = generate({ lazy: true, eager: ['web.modules.post'] });
    check('tiền tố KHÔNG khớp nửa chừng tên segment', isLazy(js, 'web.modules.posts.list'));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
