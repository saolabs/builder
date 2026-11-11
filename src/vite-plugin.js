/**
 * Saola Vite Plugin
 * Integrates Saola compilation into Vite build process
 * 
 * Usage in vite.config.ts:
 * 
 * import { defineConfig } from 'vite';
 * import saola from 'saola/vite';
 * 
 * export default defineConfig({
 *   plugins: [
 *     saola({
 *       context: 'admin',  // or 'all' for all contexts
 *       minifyHtml: true,  // minify HTML in templates (default: true)
 *       watch: true,       // watch .sao files in dev mode (default: true)
 *     })
 *   ]
 * });
 */

const path = require('path');
const fs = require('fs');
const ContextPackages = require('./context-packages');

function saolaPlugin(options = {}) {
    const {
        context = 'default',
        minifyHtml = true,
        watch = true,
        configPath = null, // Custom path to sao.config.json
    } = options;

    let compiler = null;
    let projectRoot = null;
    let config = null;
    let isDevMode = false;
    let sourceWatcher = null;
    let rebuildQueue = null;
    const closeWatch = async () => {
        await Promise.all([sourceWatcher?.close(), rebuildQueue?.close()]);
        sourceWatcher = null;
        rebuildQueue = null;
        await compiler?.closeWatchers();
    };

    // Lazy load compiler
    const getCompiler = () => {
        if (!compiler) {
            const Compiler = require('./index');
            compiler = new Compiler();
        }
        return compiler;
    };

    // Load Saola config
    const loadConfig = (root) => {
        const ConfigManager = require('./config-manager');
        const searchPath = configPath || root;
        const result = ConfigManager.loadConfig(searchPath);
        projectRoot = result.projectRoot;
        config = result.config;
        return result;
    };

    const syncDevAssets = () => {
        const names = context === 'all' ? Object.keys(config.contexts) : [context];
        for (const name of names) {
            const pkg = ContextPackages.source(config.contexts[name]);
            if (!pkg) continue;
            const publicRoot = path.resolve(projectRoot, config.paths.public || 'public/static/saola');
            const content = new Map();
            for (const [relative, source] of ContextPackages.files(pkg.effectiveRoot)) {
                const fileName = ContextPackages.slash(relative);
                if (fileName.startsWith('assets/') || /^themes\/[^/]+\/assets\//.test(fileName)) content.set(path.join(publicRoot, name, relative), fs.readFileSync(source));
            }
            ContextPackages.writeOwned(path.join(publicRoot, `.context-assets-${name}.json`), [path.join(publicRoot, name, 'assets'), path.join(publicRoot, name, 'themes')], content, projectRoot);
        }
    };

    return {
        name: 'vite-plugin-saola',
        // Framework plugins establish their JS/CSS inputs in config hooks.
        // Extend that final input list instead of masking it with our fallback entry.
        
        // Run before Vite resolves config
        config: { order: 'post', handler(viteConfig, { command }) {
            isDevMode = command === 'serve';
            loadConfig(path.resolve(viteConfig.root || process.cwd()));
            const aliases = ContextPackages.aliases(config);
            if (!aliases.length) return;
            if (context === 'all') throw new Error('Build package contexts separately with Vite; use sao-compile all for compilation.');
            const names = context === 'all' ? Object.keys(config.contexts) : [context];
            const css = [...new Set(names.flatMap(name => Object.values(ContextPackages.source(config.contexts[name])?.css || {})).map(file => path.resolve(projectRoot, file)))];
            const input = viteConfig.build?.rollupOptions?.input;
            const inputs = input && !Array.isArray(input) && typeof input === 'object'
                ? {...input, ...Object.fromEntries(css.map((file, index) => [`saola-css-${index}`, file]))}
                : [...new Set([...(Array.isArray(input) ? input : input ? [input] : [path.resolve(projectRoot, config.paths.compiled, `app.${context}.js`)]), ...css])];
            const publicRoot = path.resolve(projectRoot, config.paths.public || 'public/static/saola');
            const outDir = path.resolve(projectRoot, viteConfig.build?.outDir || path.join(publicRoot, context));
            const installedThemes = path.join(publicRoot, 'themes');
            if (installedThemes === outDir || installedThemes.startsWith(outDir + path.sep)) throw new Error('Vite outDir must not contain installed themes; build into a context directory.');
            return {
                base: viteConfig.base ?? `/${path.relative(path.resolve(projectRoot, 'public'), path.join(publicRoot, context)).split(path.sep).join('/')}/`,
                publicDir: viteConfig.publicDir ?? false,
                resolve: {alias: aliases},
                build: {outDir, manifest: viteConfig.build?.manifest ?? 'manifest.json', rollupOptions: {input: inputs, preserveEntrySignatures: viteConfig.build?.rollupOptions?.preserveEntrySignatures ?? 'exports-only'}},
            };
        } },

        // Run when Vite server starts or build begins
        async buildStart() {
            try {
                // Load config from project root
                const root = projectRoot || process.cwd();
                loadConfig(root);

                console.log('\n🔨 Saola: Compiling views...');
                
                const comp = getCompiler();
                
                if (context === 'all') {
                    await comp.buildAllContexts(config, projectRoot);
                } else {
                    await comp.buildContext(config, projectRoot, context);
                }
                if (isDevMode) syncDevAssets();

                console.log('✅ Saola: Views compiled\n');
            } catch (error) {
                console.error('❌ Saola compilation error:', error.message);
                throw error;
            }
        },

        // Watch .sao files for changes in dev mode
        configureServer(server) {
            if (!watch || !isDevMode) return;
            
            // Ensure config is loaded
            if (!config) {
                try {
                    loadConfig(process.cwd());
                } catch (e) {
                    console.warn('⚠️ Saola: Could not load config for watch mode');
                    return;
                }
            }

            const chokidar = require('chokidar');

            // Get directories to watch
            const contexts = context === 'all'
                ? Object.keys(config.contexts).filter(c => c !== 'default')
                : [context];

            const watchDirs = ContextPackages.watchRoots(config, projectRoot, contexts);

            if (watchDirs.length === 0) return;

            console.log('👀 Saola: Watching for .sao file changes...');

            const watcher = sourceWatcher = chokidar.watch(watchDirs.filter(file => fs.existsSync(file)), {
                ignored: /node_modules/,
                persistent: true,
                ignoreInitial: true,
            });

            watcher.once('ready', () => watcher.add(watchDirs.filter(file => !fs.existsSync(file))));
            rebuildQueue = require('./rebuild-queue')(async changedPath => {
                    console.log(`\n🔄 Saola: ${path.basename(changedPath)} changed, recompiling...`);
                    try {
                        loadConfig(projectRoot);
                        watcher.add(ContextPackages.watchRoots(config, projectRoot, contexts));
                        const comp = getCompiler();
                        if (context === 'all') {
                            await comp.buildAllContexts(config, projectRoot);
                        } else {
                            await comp.buildContext(config, projectRoot, context);
                        }
                        syncDevAssets();
                        console.log('✅ Saola: Recompiled\n');
                        
                        // Trigger Vite HMR
                        server.ws.send({ type: 'full-reload' });
                    } catch (error) {
                        console.error('❌ Saola recompile error:', error.message);
                    }
            });
            const recompile = changedPath => rebuildQueue?.schedule(changedPath);

            watcher.on('change', recompile);
            watcher.on('add', recompile);
            watcher.on('unlink', recompile);

            // Clean up on server close
            server.httpServer?.on('close', closeWatch);
        },

        closeBundle: closeWatch,

        generateBundle() {
            const names = context === 'all' ? Object.keys(config.contexts) : [context];
            for (const name of names) {
                const pkg = ContextPackages.source(config.contexts[name]);
                if (!pkg) continue;
                for (const [relative, source] of ContextPackages.files(pkg.effectiveRoot)) {
                    const fileName = ContextPackages.slash(relative);
                    if (fileName.startsWith('assets/') || /^themes\/[^/]+\/assets\//.test(fileName)) {
                        this.emitFile({type: 'asset', fileName, source: fs.readFileSync(source)});
                    }
                }
            }
        },

        // Transform to minify HTML in templates
        transform(code, id) {
            // Never minify HTML in dev mode or in compiled Saola views (their strings are AST text nodes)
            if (!minifyHtml || isDevMode) return null;
            if (!id.endsWith('.ts') && !id.endsWith('.js')) return null;
            if (id.includes('/views/') || id.includes('\\views\\')) return null;
            if (!code.includes('`') || !/<[a-z]/i.test(code)) return null;

            try {
                const { processTemplateStrings } = require('./html-minify-plugin');
                const transformed = processTemplateStrings(code);
                
                if (transformed !== code) {
                    return {
                        code: transformed,
                        map: null
                    };
                }
            } catch (error) {
                // Ignore transform errors
            }

            return null;
        }
    };
}

module.exports = saolaPlugin;
module.exports.default = saolaPlugin;
