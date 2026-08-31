/**
 * Test preprocessor with actual example files
 * Run: node src/preprocessor/test-examples.js
 */

const fs = require('fs');
const path = require('path');
const SaolaPreprocessor = require('./index');

const preprocessor = new SaolaPreprocessor();
const examplesDir = path.join(__dirname, '../../examples/sao');

// Key files to test
const testFiles = [
    'counter.sao',
    'test-directives.sao',
    'demo3.sao',
    'todo-list.sao',
    'demo2.sao',
];

for (const file of testFiles) {
    const filePath = path.join(examplesDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file}: NOT FOUND`);
        continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('='.repeat(60));
    console.log(`📄 ${file}`);
    console.log('='.repeat(60));
    
    try {
        const result = preprocessor.preprocessRaw(content);
        
        // Show just the declarations and first few template lines
        const lines = result.split('\n');
        const preview = lines.slice(0, 25).join('\n');
        console.log(preview);
        if (lines.length > 25) {
            console.log(`  ... (${lines.length - 25} more lines)`);
        }
        console.log('✅ OK\n');
    } catch (err) {
        console.log(`❌ ERROR: ${err.message}`);
        console.log(err.stack);
        console.log('');
    }
}
