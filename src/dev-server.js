#!/usr/bin/env node

/**
 * Saola Dev Server
 * Development server with:
 * - PHP artisan serve
 * - File watching
 * - Auto rebuild
 * - Browser live reload
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');
const ConfigManager = require('./config-manager');
const Compiler = require('./index');
const { aliasPlugin, resolveAliases } = require('./alias-plugin');

class DevServer {
    constructor() {
        this.compiler = new Compiler();
        this.phpProcess = null;
        this.watcher = null;
        this.reloadServer = null;
        this.reloadClients = [];
        this.projectRoot = null;
        this.config = null;
        this.options = {};
        this.isRebuilding = false;
        this.rebuildQueued = false;
    }

    /**
     * Main entry point
     */
    async run(args = []) {
        // Parse arguments
        this.options = this.parseArgs(args);
        
        // Load config
        const result = ConfigManager.loadConfig(process.cwd());
        this.projectRoot = result.projectRoot;
        this.config = result.config;
        ConfigManager.validateConfig(this.config);

        const contextName = this.options.context;
        const contextConfig = this.config.contexts[contextName];
        
        if (!contextConfig) {
            throw new Error(`Context "${contextName}" not found in configuration`);
        }

        console.log('\n🚀 Saola Dev Server');
        console.log('═'.repeat(50));
        console.log(`   Context: ${contextName}`);
        console.log(`   Port: ${this.options.port}`);
        console.log(`   Host: ${this.options.host}`);
        console.log('═'.repeat(50));

        // Setup graceful shutdown
        this.setupShutdown();

        // Step 1: Initial build
        console.log('\n📦 Initial build...');
        await this.buildDev(contextName);

        // Step 2: Start reload server (WebSocket-like for browser reload)
        if (this.options.reload) {
            await this.startReloadServer();
        }

        // Step 3: Start PHP artisan serve
        await this.startPhpServer();

        // Step 4: Setup file watcher
        this.setupWatcher(contextName);

        // Step 5: Open browser
        if (this.options.browser) {
            setTimeout(() => {
                this.openBrowser(`http://${this.options.host}:${this.options.port}`);
            }, 1500);
        }

        console.log('\n✅ Dev server ready!');
        console.log(`   🌐 http://${this.options.host}:${this.options.port}`);
        console.log('\n   Press Ctrl+C to stop\n');
    }

    /**
     * Parse command line arguments
     */
    parseArgs(args) {
        const options = {
            context: 'default',
            port: 8000,
            host: 'localhost',
            browser: true,
            reload: true,
        };

        for (const arg of args) {
            if (arg.startsWith('--port=')) {
                options.port = parseInt(arg.split('=')[1], 10);
            } else if (arg.startsWith('--host=')) {
                options.host = arg.split('=')[1];
            } else if (arg === '--no-browser') {
                options.browser = false;
            } else if (arg === '--no-reload') {
                options.reload = false;
            } else if (!arg.startsWith('--')) {
                options.context = arg;
            }
        }

        return options;
    }

    /**
     * Build in dev mode (no minification, with sourcemaps)
     */
    async buildDev(contextName) {
        const paths = this.config.paths || {};
        const contextConfig = this.config.contexts[contextName];

        // Step 1: Compile .sao files
        await this.compiler.buildContextWithoutViewsUpdate(this.config, this.projectRoot, contextName);

        // Step 2: Bundle with esbuild (dev mode - no minify, with sourcemap)
        const esbuild = require('esbuild');
        const { htmlTemplateMinifyPlugin } = require('./html-minify-plugin');

        // Find entry point
        const compiledRoot = path.join(this.projectRoot, paths.compiled);
        const contextAppDir = path.join(compiledRoot, contextConfig.compiled.app || 'app');
        
        let entryPoint = this.findEntryPoint(contextAppDir);
        if (!entryPoint) {
            entryPoint = this.findEntryPoint(compiledRoot);
        }

        if (!entryPoint) {
            console.log('   ⚠ No entry point found, skipping bundle');
            return;
        }

        // Output to dev directory
        const devPath = paths.dev || paths.public;
        const contextOutput = this.config.dev?.contexts?.[contextName] 
            || this.config.output?.contexts?.[contextName]
            || contextName;
        const outputDir = path.join(this.projectRoot, devPath, contextOutput);
        
        this.ensureDir(outputDir);

        const outputName = contextName === 'default' ? 'app' : contextName;
        const outputPath = path.join(outputDir, `${outputName}.js`);

        // Inject reload script for live reload
        const reloadScript = this.options.reload ? this.getReloadScript() : '';
        
        // Resolve path aliases from tsconfig.json and sao.config.json
        // Pass contextName to rewrite aliases for temp directory
        const aliases = resolveAliases(this.config, this.projectRoot, contextName);
        const hasAliases = Object.keys(aliases).length > 0;
        
        // Build plugins
        const plugins = [];
        if (hasAliases) plugins.push(aliasPlugin(aliases));
        plugins.push(htmlTemplateMinifyPlugin());
        
        try {
            await esbuild.build({
                entryPoints: [entryPoint],
                bundle: true,
                outfile: outputPath,
                format: 'esm',
                platform: 'browser',
                target: ['es2020'],
                sourcemap: 'inline',
                minify: false,
                define: {
                    'process.env.NODE_ENV': '"development"'
                },
                loader: {
                    '.ts': 'ts',
                    '.js': 'js'
                },
                banner: {
                    js: reloadScript
                },
                plugins
            });

            const stats = fs.statSync(outputPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`   ✓ ${outputName}.js (${sizeKB} KB) → ${path.relative(this.projectRoot, outputDir)}`);
        } catch (error) {
            console.error(`   ✗ Bundle failed: ${error.message}`);
        }
    }

    /**
     * Find entry point file
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
     * Get reload script to inject into bundle
     */
    getReloadScript() {
        return `
// Saola Dev Server - Live Reload
(function() {
    if (typeof window === 'undefined') return;
    
    const RELOAD_PORT = ${this.options.port + 1000};
    let retryCount = 0;
    const maxRetries = 10;
    
    function connect() {
        const es = new EventSource('http://localhost:' + RELOAD_PORT + '/events');
        
        es.onmessage = function(e) {
            if (e.data === 'reload') {
                console.log('[Saola] Reloading...');
                window.location.reload();
            }
        };
        
        es.onerror = function() {
            es.close();
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(connect, 2000);
            }
        };
        
        es.onopen = function() {
            retryCount = 0;
            console.log('[Saola] Dev server connected');
        };
    }
    
    connect();
})();
`;
    }

    /**
     * Start Server-Sent Events server for browser reload
     */
    async startReloadServer() {
        const port = this.options.port + 1000;
        
        this.reloadServer = http.createServer((req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.url === '/events') {
                // SSE endpoint
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // Send initial connection message
                res.write('data: connected\n\n');

                // Keep connection alive
                const keepAlive = setInterval(() => {
                    res.write(': keepalive\n\n');
                }, 15000);

                // Store client
                this.reloadClients.push(res);

                // Remove on close
                req.on('close', () => {
                    clearInterval(keepAlive);
                    this.reloadClients = this.reloadClients.filter(c => c !== res);
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        return new Promise((resolve, reject) => {
            this.reloadServer.listen(port, () => {
                console.log(`   🔄 Reload server: http://localhost:${port}`);
                resolve();
            });

            this.reloadServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`   ⚠ Reload server port ${port} in use, disabling auto-reload`);
                    this.options.reload = false;
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Trigger browser reload
     */
    triggerReload() {
        for (const client of this.reloadClients) {
            try {
                client.write('data: reload\n\n');
            } catch (e) {
                // Client disconnected
            }
        }
    }

    /**
     * Start PHP artisan serve
     */
    async startPhpServer() {
        return new Promise((resolve, reject) => {
            const { port, host } = this.options;
            
            console.log(`   🐘 Starting PHP server...`);

            this.phpProcess = spawn('php', ['artisan', 'serve', `--port=${port}`, `--host=${host}`], {
                cwd: this.projectRoot,
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let started = false;

            this.phpProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (!started && output.includes('started')) {
                    started = true;
                    console.log(`   ✓ PHP server started on port ${port}`);
                    resolve();
                }
                // Log PHP output (filter noise)
                if (!output.includes('Development Server')) {
                    process.stdout.write(`   ${output}`);
                }
            });

            this.phpProcess.stderr.on('data', (data) => {
                const output = data.toString();
                // Filter out normal request logs in dev
                if (!output.includes('[200]') && !output.includes('[304]')) {
                    process.stderr.write(`   ${output}`);
                }
            });

            this.phpProcess.on('error', (err) => {
                console.error('   ✗ Failed to start PHP server:', err.message);
                reject(err);
            });

            this.phpProcess.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.log(`   ⚠ PHP server exited with code ${code}`);
                }
            });

            // Timeout fallback
            setTimeout(() => {
                if (!started) {
                    started = true;
                    resolve();
                }
            }, 3000);
        });
    }

    /**
     * Restart PHP server
     */
    async restartPhpServer() {
        console.log('   🔄 Restarting PHP server...');
        
        if (this.phpProcess) {
            this.phpProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await this.startPhpServer();
    }

    /**
     * Setup file watcher
     */
    setupWatcher(contextName) {
        const chokidar = require('chokidar');
        const paths = this.config.paths || {};
        const saolaViewPath = path.join(this.projectRoot, paths.saoView || paths.saolaView || 'resources/sao');

        // Get directories to watch
        const watchDirs = [saolaViewPath];
        
        // Also watch temp directory for app.ts changes
        const compiledPath = path.join(this.projectRoot, paths.compiled);
        if (fs.existsSync(compiledPath)) {
            watchDirs.push(compiledPath);
        }

        console.log(`\n👀 Watching for changes...`);
        console.log(`   📁 ${path.relative(this.projectRoot, saolaViewPath)}`);

        this.watcher = chokidar.watch(watchDirs, {
            ignored: [
                /node_modules/,
                /\.git/,
                /\.blade\.php$/,  // Ignore generated blade files
            ],
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100
            }
        });

        let debounceTimer = null;

        const handleChange = async (changedPath, eventType) => {
            // Ignore non-relevant files
            const ext = path.extname(changedPath);
            if (!['.sao', '.ts', '.js', '.vue', '.css', '.scss'].includes(ext)) {
                return;
            }

            // Debounce multiple rapid changes
            clearTimeout(debounceTimer);
            
            if (this.isRebuilding) {
                this.rebuildQueued = true;
                return;
            }

            debounceTimer = setTimeout(async () => {
                await this.handleFileChange(changedPath, contextName);
            }, 200);
        };

        this.watcher.on('change', (p) => handleChange(p, 'change'));
        this.watcher.on('add', (p) => handleChange(p, 'add'));
        this.watcher.on('unlink', (p) => handleChange(p, 'unlink'));
    }

    /**
     * Handle file change
     */
    async handleFileChange(changedPath, contextName) {
        const relativePath = path.relative(this.projectRoot, changedPath);
        const ext = path.extname(changedPath);
        
        console.log(`\n🔄 Changed: ${relativePath}`);
        
        this.isRebuilding = true;

        try {
            const startTime = Date.now();

            // Rebuild
            await this.buildDev(contextName);

            const duration = Date.now() - startTime;
            console.log(`   ⚡ Rebuilt in ${duration}ms`);

            // Trigger browser reload
            if (this.options.reload) {
                this.triggerReload();
            }

            // Check if queued rebuild
            if (this.rebuildQueued) {
                this.rebuildQueued = false;
                this.isRebuilding = false;
                await this.handleFileChange(changedPath, contextName);
                return;
            }
        } catch (error) {
            console.error(`   ✗ Rebuild failed: ${error.message}`);
        }

        this.isRebuilding = false;
    }

    /**
     * Open browser
     */
    openBrowser(url) {
        const platform = process.platform;
        let command;

        if (platform === 'darwin') {
            command = `open "${url}"`;
        } else if (platform === 'win32') {
            command = `start "" "${url}"`;
        } else {
            command = `xdg-open "${url}"`;
        }

        exec(command, (err) => {
            if (err) {
                console.log(`   ⚠ Could not open browser: ${err.message}`);
            }
        });
    }

    /**
     * Setup graceful shutdown
     */
    setupShutdown() {
        const shutdown = async () => {
            console.log('\n\n🛑 Shutting down...');

            if (this.watcher) {
                await this.watcher.close();
            }

            if (this.reloadServer) {
                this.reloadServer.close();
            }

            if (this.phpProcess) {
                this.phpProcess.kill('SIGTERM');
            }

            console.log('   Goodbye! 👋\n');
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    /**
     * Ensure directory exists
     */
    ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

module.exports = DevServer;
