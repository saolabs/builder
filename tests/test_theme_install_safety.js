/**
 * Theme đã cài sống trong cây Blade sinh ra (`resources/views/{context}/{slug}`).
 * Build KHÔNG được quét nó như Blade mồ côi.
 *
 * Chạy: node tests/test_theme_install_safety.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Compiler = require('../src/index.js');

let failed = 0;
const check = (name, cond) => { console.log(`  ${cond ? '✅' : '❌'} ${name}`); if (!cond) failed++; };

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saola-theme-'));
const write = (rel, body = 'x') => {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
    return f;
};

const kept = write('resources/views/web/aurora/layouts/app.blade.php');
write('resources/views/web/aurora/.saola-theme', 'web.aurora\n');
const orphan = write('resources/views/web/modules/old.blade.php');
const fresh = write('resources/views/web/modules/new.blade.php');

const c = Object.create(Compiler.prototype);
c.writtenBlade = new Set([path.resolve(fresh)]);
c.sweepOrphanBlade(
    { blade: { web: 'web' } },
    root,
    { resources: 'resources', bladeView: 'resources/views' }
);

console.log('\n── sweepOrphanBlade ──');
check('Blade mồ côi của build bị quét', !fs.existsSync(orphan));
check('Blade mới ghi trong lượt này còn', fs.existsSync(fresh));
check('Blade của theme đã cài (có .saola-theme) còn nguyên', fs.existsSync(kept));

fs.rmSync(root, { recursive: true, force: true });
if (failed) { console.log(`\n${failed} lỗi`); process.exit(1); }
console.log('\nOK');
