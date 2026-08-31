/**
 * Comprehensive edge-case test for the preprocessor
 * Run: node src/preprocessor/test-edge-cases.js
 */

const SaolaPreprocessor = require('./index');
const ExpressionTransformer = require('./expression-transformer');
const SymbolCollector = require('./symbol-collector');

// Test helper
function testExpr(label, input, expected, symbols) {
    const sc = new SymbolCollector();
    if (symbols) {
        symbols.forEach(s => sc.addSymbol(s.name, s.type, s.source));
    }
    const et = new ExpressionTransformer(sc);
    const result = et.transformExpression(input);
    const pass = result.trim() === expected.trim();
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
    if (!pass) {
        console.log(`     Input:    ${input}`);
        console.log(`     Expected: ${expected}`);
        console.log(`     Got:      ${result}`);
    }
    return pass;
}

function testDecl(label, input, expected, symbols) {
    const sc = new SymbolCollector();
    if (symbols) {
        symbols.forEach(s => sc.addSymbol(s.name, s.type, s.source));
    }
    const et = new ExpressionTransformer(sc);
    const result = et.transformDeclaration(input);
    const pass = result.trim() === expected.trim();
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
    if (!pass) {
        console.log(`     Input:    ${input}`);
        console.log(`     Expected: ${expected}`);
        console.log(`     Got:      ${result}`);
    }
    return pass;
}

function testTemplate(label, input, expected, symbols) {
    const sc = new SymbolCollector();
    if (symbols) {
        symbols.forEach(s => sc.addSymbol(s.name, s.type, s.source));
    }
    const et = new ExpressionTransformer(sc);
    const result = et.transformTemplate(input);
    const pass = result.trim() === expected.trim();
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
    if (!pass) {
        console.log(`     Input:    ${input}`);
        console.log(`     Expected: ${expected}`);
        console.log(`     Got:      ${result}`);
    }
    return pass;
}

let total = 0, passed = 0;
function test(fn) { total++; if (fn) passed++; }

const baseSymbols = [
    { name: 'count', type: 'state', source: '@state' },
    { name: 'setCount', type: 'setter', source: '@state' },
    { name: 'message', type: 'state', source: '@state' },
    { name: 'setMessage', type: 'setter', source: '@state' },
    { name: 'users', type: 'var', source: '@vars' },
    { name: 'status', type: 'state', source: '@state' },
    { name: 'setStatus', type: 'setter', source: '@state' },
    { name: 'items', type: 'state', source: '@state' },
    { name: 'demoList', type: 'var', source: '@vars' },
    { name: 'user', type: 'state', source: '@const' },
    { name: 'posts', type: 'state', source: '@const' },
];

console.log('='.repeat(60));
console.log('EDGE CASE TESTS');
console.log('='.repeat(60));

// 1. Template Literals
console.log('\n📋 Template Literals:');
test(testExpr('Basic template literal',
    '`Hello ${count}`',
    "'Hello ' . $count",
    baseSymbols
));
test(testExpr('Multi-part template literal',
    '`${message} Count is ${count}`',
    "$message . ' Count is ' . $count",
    baseSymbols
));
test(testExpr('Template literal text only',
    '`Hello World`',
    "'Hello World'",
    baseSymbols
));

// 2. Colon → => conversion
console.log('\n📋 Colon → arrow (: → =>):');
test(testExpr('Object literal colon',
    "{name: 'test', age: 30}",
    "['name' => 'test', 'age' => 30]",
    baseSymbols
));
test(testExpr('Array with conditional class',
    "['active': status, 'highlight']",
    "['active' => $status, 'highlight']",
    baseSymbols
));
test(testExpr('Ternary operator preserved',
    "status ? 'On' : 'Off'",
    "$status ? 'On' : 'Off'",
    baseSymbols
));

// 3. @props with object
console.log('\n📋 @props declarations:');
test(testDecl('@props simple list',
    "@props(a, b, c)",
    "@props($a, $b, $c)",
    []
));
test(testDecl('@props with defaults',
    "@props(a = 0, b = 'test')",
    "@props($a = 0, $b = 'test')",
    []
));
test(testDecl('@props object form',
    "@props({title: 'test', count: 0})",
    "@props(['title' => 'test', 'count' => 0])",
    []
));

// 4. @class directive
console.log('\n📋 @class directive:');
test(testTemplate('@class with conditional',
    '<div @class([\'active\': status])>',
    '<div @class([\'active\' => $status])>',
    baseSymbols
));

// 5. @attr directive
console.log('\n📋 @attr directive:');
test(testTemplate('@attr with object',
    '<div @attr({dataCount: count(demoList)})>',
    '<div @attr([\'dataCount\' => count($demoList)])>',
    baseSymbols
));

// 6. console.log preservation
console.log('\n📋 JS globals:');
test(testExpr('console.log',
    'console.log(count)',
    'console.log($count)',
    baseSymbols
));
test(testExpr('Math.floor',
    'Math.floor(count)',
    'Math.floor($count)',
    baseSymbols
));

// 7. Nested dot access
console.log('\n📋 Dot access:');
test(testExpr('Simple dot',
    'user.name',
    '$user->name',
    baseSymbols
));
test(testExpr('Nested dot',
    'user.company.name',
    '$user->company->name',
    baseSymbols
));
test(testExpr('Dot with array',
    'users[0].name',
    '$users[0]->name',
    baseSymbols
));

// 8. String concatenation with +
console.log('\n📋 String concatenation:');
test(testExpr('String + var',
    "count + ' items'",
    "$count . ' items'",
    baseSymbols
));
test(testExpr('Mixed arithmetic in parens + string',
    "(count + 1) + ' items'",
    "($count + 1) . ' items'",
    baseSymbols
));

// 9. `:attr="expr"` shorthand for dynamic attributes
console.log('\n📋 :attr shorthand:');
function testAttr(label, input, expected, imports) {
    const sc = new SymbolCollector();
    baseSymbols.forEach(s => sc.addSymbol(s.name, s.type, s.source));
    const et = new ExpressionTransformer(sc);
    et.importAliases = new Map((imports || []).map(n => [n, 'x.' + n]));
    const result = et.transformTemplate(input);
    const pass = result.trim() === expected.trim();
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
    if (!pass) console.log(`     Expected: ${expected}\n     Got:      ${result}`);
    return pass;
}
test(testAttr('plain element → {{ }} echo',
    '<div :data-id="count" :title="message + \'!\'">x</div>',
    '<div data-id="{{ $count }}" title="{{ $message . \'!\' }}">x</div>'));
test(testAttr('ternary value',
    '<a :href="count > 0 ? \'/y\' : \'/n\'">x</a>',
    '<a href="{{ $count > 0 ? \'/y\' : \'/n\' }}">x</a>'));
test(testAttr('component tag keeps :prop for tag resolver',
    '<statcard label="hi" :value="count" />',
    '<statcard label="hi" :value="$count" />', ['statcard']));
test(testAttr('::attr escapes to literal :attr',
    '<div ::data-x="raw" :data-y="count">x</div>',
    '<div :data-x="raw" data-y="{{ $count }}">x</div>'));
test(testAttr('@event handler is left untouched',
    '<button @click="setCount(count + 1)" :aria-busy="status">go</button>',
    '<button @click="setCount(count + 1)" aria-busy="{{ $status }}">go</button>'));

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed}/${total} passed`);
console.log('='.repeat(60));
