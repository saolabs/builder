/**
 * Test file for Saola Preprocessor
 * Run: node src/preprocessor/test.js
 */

const SaolaPreprocessor = require('./index');

const preprocessor = new SaolaPreprocessor();

// ============================================================
// Test 1: Full .sao file with new Saola Syntax
// ============================================================
console.log('='.repeat(60));
console.log('TEST 1: Full .sao file preprocessing');
console.log('='.repeat(60));

const saoContent = `@vars(users, posts)
@state(count = 0, isOpen = false)
@state(
    todos = [
        {id: 1, task: 'Buy groceries', completed: false},
        {id: 2, task: 'Walk the dog', completed: true},
    ],
    newTodo = ''
)
@const([items, setItems] = useState([]))
@let(handler = function(e) { console.log(e) })
@const(MAX = 100)
@let(total = count * 2)

<blade>
    <div class="container">
        <h1>{{ \`Hello \${users[0].name}!\` }}</h1>
        <p>Count: {{ count }} / {{ MAX }}</p>
        <p>Total users: {{ count(users) }}</p>
        
        <button @click(setCount(count + 1))>+</button>
        <button @click(setIsOpen(!isOpen))>Toggle</button>
        
        @if(count > MAX)
            <span class="warning">Over limit!</span>
        @endif
        
        @foreach(users as user)
            <li>{{ user.name }} - {{ strlen(user.email) }} chars</li>
        @endforeach
        
        @foreach(todos as index => todo)
            <li @class(['todo-item', completed: todo.completed])>
                <input type="checkbox" @checked(todo.completed) />
                {{ todo.task }}
                <button @click(setItems([...items, todo]))>Save</button>
            </li>
        @endforeach
        
        @for(i = 0; i < count(todos); i++)
            <span>{{ i + 1 }}</span>
        @endfor
        
        @exec(total = count + 1)
        
        {{-- String concatenation test --}}
        <p>{{ \`\${count} items, total \${total}\` }}</p>
        
        {{-- Plus operator: arithmetic (no string literal) --}}
        <p>{{ count + MAX + 1 }}</p>
        
        {{-- Plus operator: concatenation (has string literal) --}}
        <p>{{ count + ' items' }}</p>
        <p>{{ 'Page ' + count + ' of ' + MAX }}</p>
        
        {{-- Mixed: parens separate arithmetic from concat --}}
        <p>{{ (count + MAX) + ' total' }}</p>
    </div>
</blade>
<script setup lang="ts">
export default {
    methods: {
        reset() {
            this.setCount(0);
        }
    }
}
</script>
<style scoped>
.container { padding: 20px; }
.warning { color: red; }
</style>`;

const result = preprocessor.preprocessRaw(saoContent);

console.log('--- INPUT ---');
console.log(saoContent.split('\n').slice(0, 15).join('\n'));
console.log('...');
console.log('\n--- OUTPUT ---');
console.log(result);

// ============================================================
// Test 2: Legacy syntax detection (should pass through)
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 2: Legacy PHP syntax detection');
console.log('='.repeat(60));

const legacyContent = `@vars($users, $posts)
@useState($count, 0)
<blade>
    <p>{{ $count }}</p>
    @foreach($users as $user)
        <li>{{ $user->name }}</li>
    @endforeach
</blade>`;

const legacyResult = preprocessor.preprocessRaw(legacyContent);
const isPassthrough = legacyResult === legacyContent;
console.log(`Legacy syntax pass-through: ${isPassthrough ? '✅ PASS' : '❌ FAIL'}`);
if (!isPassthrough) {
    console.log('--- EXPECTED ---');
    console.log(legacyContent);
    console.log('--- GOT ---');
    console.log(legacyResult);
}

// ============================================================
// Test 3: Symbol Table
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 3: Symbol Table');
console.log('='.repeat(60));

const SymbolCollector = require('./symbol-collector');
const collector = new SymbolCollector();
const symbols = collector.collect(`
@state(count = 0, isOpen = false)
@vars(users, posts)
@const([items, setItems] = useState([]))
@let(handler = function(e) {})
@const(MAX = 100)
@let(total = 0)
`);

console.log('Collected symbols:');
for (const [name, info] of symbols) {
    console.log(`  ${name.padEnd(15)} → type: ${info.type.padEnd(10)} source: ${info.source}`);
}

// ============================================================
// Test 4: Expression transformer edge cases
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 4: Expression Transformer');
console.log('='.repeat(60));

const ExpressionTransformer = require('./expression-transformer');
const transformer = new ExpressionTransformer(collector);

const testCases = [
    // [input, expected description]
    ['count', '$count — state variable'],
    ['setCount(count + 1)', '$setCount($count + 1) — setter call'],
    ['count(users)', 'count($users) — PHP built-in, not variable'],
    ['handler(event)', '$handler($event) — declared function call'],
    ['MAX', '$MAX — constant'],
    ['strlen(users[0].name)', 'strlen($users[0]->name) — PHP func + dot notation'],
    ['isOpen', '$isOpen — state'],
    ['setIsOpen(!isOpen)', '$setIsOpen(!$isOpen) — setter with negation'],
    ['count + MAX + 1', '$count + $MAX + 1 — arithmetic (no string)'],
    ["count + ' items'", "$count . ' items' — concat (has string)"],
    ["'Page ' + count", "'Page ' . $count — concat (has string)"],
];

for (const [input, desc] of testCases) {
    const output = transformer.transformExpression(input);
    console.log(`  ${input.padEnd(30)} → ${output.padEnd(35)} (${desc.split('—')[0].trim()})`);
}

console.log('\n✅ All tests completed.');
