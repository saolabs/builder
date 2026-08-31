/**
 * esbuild Alias Plugin
 * Resolves path aliases like @one/..., @app/..., etc.
 * 
 * Reads aliases from:
 * 1. sao.config.json (aliases section)
 * 2. tsconfig.json (compilerOptions.paths)
 * 3. Default aliases based on config paths
 * 
 * IMPORTANT: When bundling from compiled directory, aliases are automatically
 * resolved relative to compiled directory since all code (app, core, views) 
 * is copied there during compilation.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load aliases from tsconfig.json
 * @param {string} projectRoot 
 * @returns {Object} Alias map
 */
function loadTsConfigAliases(projectRoot) {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    
    if (!fs.existsSync(tsconfigPath)) {
        return {};
    }

    try {
        // Read and parse tsconfig (handle comments)
        let content = fs.readFileSync(tsconfigPath, 'utf8');
        // Remove comments (simple approach)
        content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        
        const tsconfig = JSON.parse(content);
        const paths = tsconfig.compilerOptions?.paths || {};
        const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
        
        const aliases = {};
        
        for (const [alias, targets] of Object.entries(paths)) {
            if (targets.length > 0) {
                // Remove trailing /* from alias and path
                const cleanAlias = alias.replace(/\/\*$/, '');
                const cleanPath = targets[0].replace(/\/\*$/, '');
                
                // Resolve to absolute path
                aliases[cleanAlias] = path.resolve(projectRoot, baseUrl, cleanPath);
            }
        }
        
        return aliases;
    } catch (error) {
        console.warn(`   ⚠ Could not parse tsconfig.json: ${error.message}`);
        return {};
    }
}

/**
 * Load aliases from sao.config.json or sao.config.json
 * @param {Object} config - Loaded config object
 * @param {string} projectRoot 
 * @returns {Object} Alias map
 */
function loadSaoConfigAliases(config, projectRoot) {
    const aliases = {};
    
    // Check for explicit aliases in config
    if (config.aliases) {
        for (const [alias, relativePath] of Object.entries(config.aliases)) {
            aliases[alias] = path.resolve(projectRoot, relativePath);
        }
    }
    
    // Generate default aliases based on paths
    const paths = config.paths || {};
    
    const viewSource = paths.saoView || paths.saoView;
    if (viewSource) {
        aliases['@sao'] = path.resolve(projectRoot, viewSource);
        aliases['@one'] = path.resolve(projectRoot, viewSource);
    }
    
    if (paths.compiled) {
        aliases['@compiled'] = path.resolve(projectRoot, paths.compiled);
        aliases['@views'] = path.resolve(projectRoot, paths.compiled);
    }
    
    return aliases;
}

/**
 * Rewrite aliases to point to compiled/context directory for bundling
 * This is needed because:
 * - Source code lives in resources/sao/ (or resources/sao for legacy support)
 * - But during build, app/core/views are copied to resources/js/compiled/{context}/
 * - Entry point is in compiled directory, so aliases should resolve there
 * 
 * @param {Object} aliases - Original alias map
 * @param {Object} config - sao.config.json content
 * @param {string} projectRoot 
 * @param {string} contextName - Current context being built
 * @returns {Object} Rewritten alias map for compiled directory
 */
function rewriteAliasesForCompiled(aliases, config, projectRoot, contextName) {
    const paths = config.paths || {};
    const contextConfig = config.contexts?.[contextName];
    
    if (!contextConfig || !paths.compiled) {
        return aliases;
    }
    
    const compiledRoot = path.resolve(projectRoot, paths.compiled);
    const contextCompiledDir = path.join(compiledRoot, contextConfig.compiled?.app ? path.dirname(contextConfig.compiled.app) : contextName);
    
    // Mapping from source dirs to compiled dirs
    const sourceToCompiled = {};
    
    // Map saolaView source -> compiled/context/core (if core is copied)
    const saolaViewSource = paths.saoView || paths.saoView;
    if (saolaViewSource) {
        const saolaViewCompiled = path.join(contextCompiledDir, 'core');
        if (fs.existsSync(saolaViewCompiled)) {
            sourceToCompiled[path.resolve(projectRoot, saolaViewSource)] = saolaViewCompiled;
        }
    }
    
    // Map app source -> compiled/context/app
    if (contextConfig.paths?.app) {
        const appSource = path.resolve(projectRoot, contextConfig.paths.app);
        const appCompiledDir = contextConfig.compiled?.app || 'app';
        const appCompiled = path.join(compiledRoot, appCompiledDir);
        if (fs.existsSync(appCompiled)) {
            sourceToCompiled[appSource] = appCompiled;
        }
    }
    
    // Map views source -> compiled/context/views
    if (contextConfig.paths?.views) {
        const viewsSource = path.resolve(projectRoot, contextConfig.paths.views);
        const viewsCompiledDir = contextConfig.compiled?.views || 'views';
        const viewsCompiled = path.join(compiledRoot, viewsCompiledDir);
        if (fs.existsSync(viewsCompiled)) {
            sourceToCompiled[viewsSource] = viewsCompiled;
        }
    }
    
    // Rewrite aliases
    const rewritten = {};
    
    for (const [alias, sourcePath] of Object.entries(aliases)) {
        let newPath = sourcePath;
        
        // Check if this alias points to a source directory that's been copied to compiled
        for (const [source, compiled] of Object.entries(sourceToCompiled)) {
            if (sourcePath === source) {
                newPath = compiled;
                break;
            }
            if (sourcePath.startsWith(source + path.sep)) {
                const relativePart = sourcePath.slice(source.length);
                newPath = compiled + relativePart;
                break;
            }
        }
        
        rewritten[alias] = newPath;
    }
    
    // Add compiled-specific aliases
    rewritten['@compiled'] = compiledRoot;
    
    return rewritten;
}

/**
 * Merge aliases with priority: sao.config > tsconfig > defaults
 * @param {Object} config - sao.config.json or sao.config.json content
 * @param {string} projectRoot 
 * @param {string} [contextName] - Optional context name for compiled rewriting
 * @returns {Object} Merged alias map
 */
function resolveAliases(config, projectRoot, contextName = null) {
    // Load from different sources
    const tsconfigAliases = loadTsConfigAliases(projectRoot);
    const saoConfigAliases = loadSaoConfigAliases(config, projectRoot);
    
    // Merge: sao.config takes priority
    let merged = {
        ...tsconfigAliases,
        ...saoConfigAliases
    };
    
    // If context is provided, rewrite aliases to point to compiled directory
    if (contextName) {
        merged = rewriteAliasesForCompiled(merged, config, projectRoot, contextName);
    }
    
    return merged;
}

/**
 * esbuild plugin for path alias resolution
 * @param {Object} aliases - Alias map { '@one': '/path/to/one', ... }
 * @returns {Object} esbuild plugin
 */
function aliasPlugin(aliases) {
    return {
        name: 'alias-plugin',
        setup(build) {
            // Sort aliases by length (longest first) to match more specific first
            const sortedAliases = Object.entries(aliases)
                .sort((a, b) => b[0].length - a[0].length);
            
            if (sortedAliases.length === 0) return;

            // Create regex pattern for all aliases
            const aliasPatterns = sortedAliases.map(([alias]) => 
                alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
            );
            const pattern = new RegExp(`^(${aliasPatterns.join('|')})(/.*)?$`);

            build.onResolve({ filter: pattern }, async (args) => {
                // Find matching alias
                for (const [alias, target] of sortedAliases) {
                    if (args.path === alias || args.path.startsWith(alias + '/')) {
                        const relativePath = args.path.slice(alias.length);
                        const resolvedPath = path.join(target, relativePath);
                        
                        // Check if path exists (with extensions)
                        const resolved = await tryResolve(resolvedPath);
                        
                        if (resolved) {
                            return { path: resolved };
                        }
                        
                        // If not found, return error
                        return {
                            errors: [{
                                text: `Could not resolve '${args.path}' (alias '${alias}' -> '${target}')`
                            }]
                        };
                    }
                }
                
                return null;
            });
        }
    };
}

/**
 * Try to resolve a path with various extensions
 * @param {string} modulePath 
 * @returns {string|null} Resolved path or null
 */
async function tryResolve(modulePath) {
    // Try exact path
    if (fs.existsSync(modulePath)) {
        const stat = fs.statSync(modulePath);
        if (stat.isFile()) {
            return modulePath;
        }
        // Directory - look for index file
        if (stat.isDirectory()) {
            const indexFiles = ['index.ts', 'index.js', 'index.mjs'];
            for (const indexFile of indexFiles) {
                const indexPath = path.join(modulePath, indexFile);
                if (fs.existsSync(indexPath)) {
                    return indexPath;
                }
            }
        }
    }
    
    // Try with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];
    for (const ext of extensions) {
        const withExt = modulePath + ext;
        if (fs.existsSync(withExt)) {
            return withExt;
        }
    }
    
    return null;
}

module.exports = {
    aliasPlugin,
    resolveAliases,
    loadTsConfigAliases,
    loadSaoConfigAliases
};
