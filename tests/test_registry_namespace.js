/**
 * Registry generator — namespace có dấu chấm (theme).
 *
 * Theme là một namespace của context: `"themes.aurora": "themes/aurora/views"`.
 * Khoá registry phải giữ nguyên dấu chấm (`themes.aurora.modules.ping.index`)
 * vì server sinh đúng chuỗi đó, nhưng ĐỊNH DANH import thì không được mang dấu
 * chấm — `import Themes.auroraModulesPingIndex` làm vỡ cả file registry.
 *
 * Chạy: node tests/test_registry_namespace.js
 */
const { RegistryGenerator } = require('../src/registry-generator');

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}  ${detail}`); failed++; }
};

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

console.log('\n── định danh factory ──');
[
    ['themes.aurora/modules/ping/index.ts', 'ThemesAuroraModulesPingIndex'],
    ['themes.dark-mode/pages/home.ts', 'ThemesDarkModePagesHome'],
    ['web/modules/home/index.ts', 'WebModulesHomeIndex'],
    ['admin/templates/counter.ts', 'AdminTemplatesCounter'],
    ['web/components/code-block.ts', 'WebComponentsCodeBlock'],
].forEach(([input, expected]) => {
    const name = RegistryGenerator._toFactoryName(input);
    check(`${input} → ${expected}`, name === expected, `nhận ${name}`);
    check(`  là định danh JS hợp lệ`, IDENT.test(name), name);
});

console.log('\n── khoá registry giữ nguyên dấu chấm ──');
[
    ['themes.aurora/modules/ping/index.ts', 'themes.aurora.modules.ping.index'],
    ['web/modules/home/index.ts', 'web.modules.home.index'],
].forEach(([input, expected]) => {
    const dot = RegistryGenerator._toDotPath(input);
    check(`${input} → ${expected}`, dot === expected, `nhận ${dot}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
