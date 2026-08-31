#!/usr/bin/env node

/**
 * Saola Builder - Test Suite
 * Tests the Node orchestration and PHP compiler integration
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const Compiler = require('./index');
const ConfigManager = require('./config-manager');

class CompilerTests {
    constructor() {
        this.testsPassed = 0;
        this.testsFailed = 0;
        this.errors = [];
    }

    log(message) {
        console.log(`  ${message}`);
    }

    test(name, fn) {
        try {
            fn();
            this.log(`✅ ${name}`);
            this.testsPassed++;
        } catch (error) {
            this.log(`❌ ${name}`);
            this.log(`   Error: ${error.message}`);
            this.testsFailed++;
            this.errors.push({ test: name, error: error.message });
        }
    }

    async run() {
        console.log('\n🧪 Running Saola Builder Tests\n');
        console.log('Testing Core Functionality:');

        this.testConfigManager();
        this.testPhpCompilerPath();
        this.testFileDiscovery();
        this.testSsrStylesheets();

        console.log('\n📊 Test Results:');
        console.log(`   Passed: ${this.testsPassed}`);
        console.log(`   Failed: ${this.testsFailed}`);
        console.log(`   Total:  ${this.testsPassed + this.testsFailed}`);

        if (this.testsFailed > 0) {
            console.log('\n❌ Failures:');
            for (const { test, error } of this.errors) {
                console.log(`   - ${test}: ${error}`);
            }
            process.exit(1);
        } else {
            console.log('\n✨ All tests passed!\n');
            process.exit(0);
        }
    }

    /**
     * Test config manager
     */
    testConfigManager() {
        console.log('\n1. Configuration Manager:');

        this.test('ConfigManager is defined', () => {
            if (!ConfigManager) throw new Error('ConfigManager not found');
        });

        this.test('ConfigManager has loadConfig method', () => {
            if (typeof ConfigManager.loadConfig !== 'function') {
                throw new Error('loadConfig method not found');
            }
        });

        this.test('ConfigManager has validateConfig method', () => {
            if (typeof ConfigManager.validateConfig !== 'function') {
                throw new Error('validateConfig method not found');
            }
        });

        // Test with example config
        this.test('Can load example config', () => {
            try {
                const configPath = path.join(__dirname, 'sao.config.example.json');
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    ConfigManager.validateConfig(config);
                }
            } catch (error) {
                throw new Error(`Failed to load example config: ${error.message}`);
            }
        });
    }

    /**
     * Test PHP compiler detection.
     *
     * Trước đây test này dò `pythonPath` / `main_compiler.py`. index.js đã
     * chuyển sang gọi `php bin/saoc`, nên hai test cũ hỏng vì field không còn
     * tồn tại — không phải lỗi thật, chỉ là test bị bỏ lại phía sau.
     */
    testPhpCompilerPath() {
        console.log('\n2. PHP Compiler Detection:');

        this.test('Compiler class is defined', () => {
            if (!Compiler) throw new Error('Compiler not found');
        });

        this.test('Builder resolves the PHP compiler path', () => {
            const compiler = new Compiler();
            const binary = compiler.resolvePhpCompilerPath(path.resolve(__dirname, '../..'));
            if (!binary) throw new Error('PHP compiler path is empty');
        });

        this.test('PHP compiler binary exists', () => {
            const compiler = new Compiler();
            const binary = compiler.resolvePhpCompilerPath(path.resolve(__dirname, '../..'));
            if (!binary) throw new Error('PHP compiler path is empty');
            if (!binary.endsWith('saoc')) {
                throw new Error(`Path does not point to bin/saoc: ${binary}`);
            }
            if (!fs.existsSync(binary)) {
                throw new Error(`PHP compiler not found at: ${binary}`);
            }
        });

        this.test('PHP is available', () => {
            const result = spawnSync(process.env.SAOLA_PHP_BINARY || 'php', ['--version']);
            if (result.error) throw new Error('PHP not found in PATH');
            if (result.status !== 0) throw new Error('PHP not available');
        });
    }

    /**
     * Test file discovery
     */
    testFileDiscovery() {
        console.log('\n3. File Discovery:');

        this.test('Compiler has findSaoFiles method', () => {
            const compiler = new Compiler();
            if (typeof compiler.findSaoFiles !== 'function') {
                throw new Error('findSaoFiles method not found');
            }
        });

        this.test('Can find .sao files', () => {
            const compiler = new Compiler();
            const tempDir = path.join(__dirname, '.test-files');
            
            // Create test directory
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            try {
                // Create test files
                fs.writeFileSync(path.join(tempDir, 'test.sao'), '@useState($count, 0)\n<blade></blade>\n<script></script>');
                fs.writeFileSync(path.join(tempDir, 'other.txt'), 'not a sao file');

                // Find files
                const files = compiler.findSaoFiles(tempDir);
                if (files.length !== 1) {
                    throw new Error(`Expected 1 .sao file, found ${files.length}`);
                }

                if (!files[0].endsWith('.sao')) {
                    throw new Error('Found file is not a .sao file');
                }
            } finally {
                // Cleanup
                try {
                    fs.unlinkSync(path.join(tempDir, 'test.sao'));
                    fs.unlinkSync(path.join(tempDir, 'other.txt'));
                    fs.rmdirSync(tempDir);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        });

        this.test('Returns empty array for non-existent directory', () => {
            const compiler = new Compiler();
            const files = compiler.findSaoFiles('/non/existent/path/12345');
            if (!Array.isArray(files)) throw new Error('Result is not an array');
            if (files.length !== 0) throw new Error('Should return empty array for non-existent directory');
        });
    }

    testSsrStylesheets() {
        console.log('\n4. SSR Stylesheets:');

        this.test('Injects stylesheet after @extends with stable @once key', () => {
            const compiler = new Compiler();
            const link = '<link rel="preload stylesheet" href="/shared.css" media="screen">';
            const output = compiler.injectSsrStylesheets('@extends("layout")\n<div>Page</div>', [link, link]);
            if (!output.startsWith('@extends("layout")\n@once(\'saola-css-')) {
                throw new Error('Stylesheet was not inserted after @extends');
            }
            if ((output.match(/<link\b/g) || []).length !== 1) {
                throw new Error('Duplicate stylesheet was not removed');
            }
            if (!output.includes('@endonce')) throw new Error('@once block is incomplete');
        });

        this.test('SSR stylesheet does not mutate compiled hydration marker IDs', () => {
            const compiler = new Compiler();
            const compiled = "@pageStart\n@startMarker('blockoutlet', 'd9c86768')\n@useBlock('shell')\n@endMarker('blockoutlet', 'd9c86768')\n@pageEnd";
            const output = compiler.injectSsrStylesheets(compiled, [
                '<link rel="stylesheet" href="/shared.css">',
            ]);
            if ((output.match(/d9c86768/g) || []).length !== 2) {
                throw new Error('Existing hydration IDs changed while inserting SSR assets');
            }
            if (output.includes('<link @class(')) {
                throw new Error('SSR asset was incorrectly converted into a hydrated View node');
            }
        });
    }
}

// Run tests
if (require.main === module) {
    const tests = new CompilerTests();
    tests.run().catch(error => {
        console.error('Test runner error:', error.message);
        process.exit(1);
    });
}

module.exports = CompilerTests;

module.exports = CompilerTests;
