#!/usr/bin/env node

/** Contract regression cho metadata app/theme do builder đóng dấu. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const Compiler = require('../src/index');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saola-manifest-'));
let failed = 0;

function check(name, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${name}`);
        return;
    }
    failed++;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

try {
    const runtimeDir = path.join(root, 'node_modules', '@saolabs', 'client');
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(path.join(runtimeDir, 'package.json'), JSON.stringify({ version: '9.8.7' }));

    const compiler = new Compiler();

    // fuseRows: chỉ bật khi client của dự án có FusedRow (≥ 1.10); theme mặc định tắt.
    {
        const probe = new Compiler();
        probe.projectRoot = root;
        const withClient = (version) => fs.writeFileSync(path.join(runtimeDir, 'package.json'), JSON.stringify({ version }));
        withClient('1.9.0'); check('fuseRows tắt với client 1.9', probe.fuseRowsEnabled() === false);
        withClient('1.10.0'); check('fuseRows bật với client 1.10', probe.fuseRowsEnabled() === true);
        withClient('2.0.1'); check('fuseRows bật với client 2.x', probe.fuseRowsEnabled() === true);
        probe.themeConfig = { slug: 'x' }; check('fuseRows tắt khi build gói theme', probe.fuseRowsEnabled() === false);
        probe.compilerOptions = { fuseRows: true }; check('compiler.fuseRows ghi đè', probe.fuseRowsEnabled() === true);
        probe.themeConfig = null; probe.compilerOptions = { fuseRows: false }; check('compiler.fuseRows=false ghi đè', probe.fuseRowsEnabled() === false);
        fs.rmSync(path.join(runtimeDir, 'package.json')); probe.compilerOptions = {};
        check('fuseRows tắt khi không thấy client', probe.fuseRowsEnabled() === false);
        withClient('9.8.7');
    }
    compiler.compilerOptions = { idMode: 'compact' };
    compiler.themeConfig = {
        slug: 'aurora',
        name: 'Aurora',
        version: '1.2.3',
        context: 'web',
        dist: 'theme-dist',
    };

    compiler.writeThemeManifest(root, {}, {});
    compiler.themeConfig = null;
    compiler.writeBuildManifest(root, { public: 'public/saola' });

    const theme = JSON.parse(fs.readFileSync(path.join(root, 'theme-dist', 'theme.json'), 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(root, 'public', 'saola', 'saola.json'), 'utf8'));

    check('app/theme dùng cùng output contract mới', app.contract === theme.contract && app.contract === 2);
    check('app/theme dùng cùng idMode', app.idMode === 'compact' && theme.idMode === 'compact');
    check('theme giữ đúng context', theme.context === 'web');
    check('theme có revision không rỗng', typeof theme.revision === 'string' && theme.revision.length === 16);
    check('app có revision không rỗng', typeof app.revision === 'string' && app.revision.length === 16);
    check('theme ghi phiên bản builder', typeof theme.builder === 'string' && theme.builder.length > 0);
    check('app/theme ghi cùng runtime chẩn đoán', app.runtime === '9.8.7' && theme.runtime === '9.8.7');
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}

console.log(`\n${7 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
