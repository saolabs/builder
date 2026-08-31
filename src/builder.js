#!/usr/bin/env node

/**
 * Saola Builder - Compile + Bundle
 * Compiles .sao files and bundles app.ts into distributable JS
 */

const fs = require('fs');
const path = require('path');
const ConfigManager = require('./config-manager');
const Compiler = require('./index');
const { htmlTemplateMinifyPlugin } = require('./html-minify-plugin');
const { aliasPlugin, resolveAliases } = require('./alias-plugin');

class Builder {
    constructor() {
        this.compiler = new Compiler();
        this.esbuild = null; // Lazy loaded
    }

    /**
     * Main entry point
     */
    async run(args = []) {
        try {
            const { config, projectRoot } = ConfigManager.loadConfig(process.cwd());
            ConfigManager.validateConfig(config);

            const context = this.parseContext(args);
            const options = this.parseOptions(args);

            if (context === 'all') {
                await this.buildAllContexts(config, projectRoot, options);
            } else {
                await this.buildContext(config, projectRoot, context, options);
            }

            if (options.watch) {
                await this.setupWatcher(config, projectRoot, context, options);
            }

        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }

    /**
     * Parse context from args
     */
    parseContext(args) {
        const nonOptionArgs = args.filter(arg => !arg.startsWith('--'));
        return nonOptionArgs[0] || 'default';
    }

    /**
     * Parse options from args
     */
    parseOptions(args) {
        return {
            minify: args.includes('--minify'),
            watch: args.includes('--watch'),
            sourcemap: args.includes('--sourcemap'),
            minifyHtml: !args.includes('--no-html-minify'), // HTML minify enabled by default
        };
    }

    /**
     * Load esbuild (lazy)
     */
    async loadEsbuild() {
        if (!this.esbuild) {
            try {
                this.esbuild = require('esbuild');
            } catch (error) {
                console.error('❌ esbuild is required for building. Install it with:');
                console.error('   npm install esbuild --save-dev');
                process.exit(1);
            }
        }
        return this.esbuild;
    }

    /**
     * Build single context
     */
    async buildContext(config, projectRoot, contextName, options = {}) {
        const contextConfig = config.contexts[contextName];
        if (!contextConfig) {
            throw new Error(`Context "${contextName}" not found in configuration`);
        }

        console.log(`\n🔨 Building context: ${contextName}`);
        console.log('━'.repeat(50));

        // Step 1: Compile .sao files
        console.log('\n📝 Step 1: Compiling views...');
        await this.compiler.buildContextWithoutViewsUpdate(config, projectRoot, contextName);

        // Step 2: Bundle with esbuild
        console.log('\n📦 Step 2: Bundling...');
        await this.bundle(config, projectRoot, contextName, options);

        console.log(`\n✅ Build complete for context: ${contextName}`);
    }

    /**
     * Build all contexts
     */
    async buildAllContexts(config, projectRoot, options = {}) {
        const contexts = Object.keys(config.contexts).filter(c => c !== 'default');

        console.log(`\n🚀 Building ${contexts.length} contexts: ${contexts.join(', ')}`);
        console.log('═'.repeat(50));

        for (const contextName of contexts) {
            await this.buildContext(config, projectRoot, contextName, options);
        }

        // Update views.ts with all contexts
        const paths = config.paths || {};
        await this.compiler.updateViewsFile(config, projectRoot, paths, contexts);

        console.log(`\n🎉 All ${contexts.length} contexts built successfully!`);
    }

    /**
     * Bundle app.ts with esbuild
     */
    async bundle(config, projectRoot, contextName, options = {}) {
        const esbuild = await this.loadEsbuild();
        const paths = config.paths || {};
        const contextConfig = config.contexts[contextName];

        // Entry point is app.ts at the root of temp directory (shared entry point)
        // Or context-specific entry point in context/app folder
        const compiledRoot = path.join(projectRoot, paths.compiled);
        const contextAppDir = path.join(compiledRoot, contextConfig.compiled.app || 'app');
        
        // Look for entry point: first in context app dir, then in temp root
        let entryPoint = this.findEntryPoint(contextAppDir);
        if (!entryPoint) {
            entryPoint = this.findEntryPoint(compiledRoot);
        }

        if (!entryPoint) {
            console.log('   ⚠ No entry point found (app.ts or app.js), skipping bundle');
            return;
        }

        // Determine output path
        const outputDir = this.getOutputDir(config, projectRoot, contextName);
        this.ensureDir(outputDir);

        // Output filename based on context
        const outputName = this.getOutputName(contextName);
        const outputPath = path.join(outputDir, `${outputName}.js`);

        console.log(`   Entry: ${path.relative(projectRoot, entryPoint)}`);
        console.log(`   Output: ${path.relative(projectRoot, outputPath)}`);

        // Resolve path aliases from tsconfig.json and sao.config.json
        // Pass contextName to rewrite aliases for temp directory
        const aliases = resolveAliases(config, projectRoot, contextName);
        const hasAliases = Object.keys(aliases).length > 0;
        
        if (hasAliases) {
            console.log(`   📦 Path aliases: ${Object.keys(aliases).join(', ')}`);
        }

        // Build plugins
        const plugins = [];
        if (hasAliases) plugins.push(aliasPlugin(aliases));
        if (options.minifyHtml) plugins.push(htmlTemplateMinifyPlugin());

        // Build with esbuild
        const buildOptions = {
            entryPoints: [entryPoint],
            bundle: true,
            outfile: outputPath,
            format: 'esm',
            platform: 'browser',
            target: ['es2020'],
            sourcemap: options.sourcemap ? 'linked' : false,
            minify: false, // Regular build is not minified
            metafile: true,
            external: [], // Bundle everything
            define: {
                'process.env.NODE_ENV': '"production"'
            },
            loader: {
                '.ts': 'ts',
                '.js': 'js'
            },
            plugins
        };

        try {
            const result = await esbuild.build(buildOptions);
            
            // Show bundle size
            const stats = fs.statSync(outputPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`   ✓ ${outputName}.js (${sizeKB} KB)`);

            // Build minified version if requested
            if (options.minify) {
                const minPath = path.join(outputDir, `${outputName}.min.js`);
                await esbuild.build({
                    ...buildOptions,
                    outfile: minPath,
                    minify: true,
                    sourcemap: options.sourcemap ? 'linked' : false,
                });

                const minStats = fs.statSync(minPath);
                const minSizeKB = (minStats.size / 1024).toFixed(2);
                console.log(`   ✓ ${outputName}.min.js (${minSizeKB} KB)`);
            }

            return result;
        } catch (error) {
            console.error(`   ✗ Bundle failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find entry point file in directory
     */
    findEntryPoint(dir) {
        const candidates = ['app.ts', 'app.js', 'index.ts', 'index.js', 'main.ts', 'main.js'];
        
        for (const file of candidates) {
            const fullPath = path.join(dir, file);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }

    /**
     * Get output directory for a context
     * Format: paths.public/output.contexts[contextName]/
     */
    getOutputDir(config, projectRoot, contextName) {
        const publicPath = config.paths.public || 'public';
        const contextOutput = config.output?.contexts?.[contextName] 
            || config.output?.default 
            || contextName;

        return path.join(projectRoot, publicPath, contextOutput);
    }

    /**
     * Get output filename for context
     */
    getOutputName(contextName) {
        // Could be configurable, using context name for now
        // admin -> admin, web -> web, default -> app
        if (contextName === 'default') {
            return 'app';
        }
        return contextName;
    }

    /**
     * Ensure directory exists
     */
    ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Setup file watcher for rebuild
     */
    async setupWatcher(config, projectRoot, context, options) {
        console.log('\n👀 Watching for changes...');
        console.log('   Press Ctrl+C to stop\n');

        const chokidar = require('chokidar');
        const paths = config.paths || {};
        const saolaViewPath = path.join(projectRoot, paths.saoView || paths.saolaView || 'resources/sao');

        // Determine which directories to watch
        const watchDirs = [];
        const contexts = context === 'all' 
            ? Object.keys(config.contexts).filter(c => c !== 'default')
            : [context];

        for (const ctx of contexts) {
            const ctxConfig = config.contexts[ctx];
            if (ctxConfig?.views) {
                for (const [namespace, viewPath] of Object.entries(ctxConfig.views)) {
                    const fullPath = path.join(saolaViewPath, viewPath);
                    if (fs.existsSync(fullPath)) {
                        watchDirs.push(fullPath);
                    }
                }
            }
        }

        // Also watch app directories
        for (const ctx of contexts) {
            const ctxConfig = config.contexts[ctx];
            if (ctxConfig?.app) {
                for (const appPath of ctxConfig.app) {
                    const fullPath = path.join(saolaViewPath, appPath);
                    if (fs.existsSync(fullPath)) {
                        watchDirs.push(fullPath);
                    }
                }
            }
        }

        const watcher = chokidar.watch(watchDirs, {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true
        });

        let debounceTimer = null;
        const rebuild = async (changedPath) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                console.log(`\n🔄 File changed: ${path.relative(projectRoot, changedPath)}`);
                try {
                    if (context === 'all') {
                        await this.buildAllContexts(config, projectRoot, options);
                    } else {
                        await this.buildContext(config, projectRoot, context, options);
                    }
                } catch (error) {
                    console.error(`❌ Rebuild failed: ${error.message}`);
                }
            }, 300);
        };

        watcher.on('change', rebuild);
        watcher.on('add', rebuild);
        watcher.on('unlink', rebuild);
    }
}

module.exports = Builder;
