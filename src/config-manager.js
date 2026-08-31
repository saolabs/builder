/**
 * Saola Compiler - Config Manager
 * Manages sao.config.json loading and configuration
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    /**
     * Find and load sao.config.json (or legacy sao.config.json) from project root
     * @param {string} startPath - Path to start searching from (usually process.cwd())
     * @returns {object} Configuration object
     */
    static loadConfig(startPath = process.cwd()) {
        let currentPath = startPath;
        const configFileNames = ['sao.config.json', 'sao.config.json'];

        // Search up directory tree
        while (currentPath !== path.dirname(currentPath)) {
            for (const configFileName of configFileNames) {
                const configPath = path.join(currentPath, configFileName);

                if (fs.existsSync(configPath)) {
                    try {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        // Normalize old format to new format before returning
                        const normalizedConfig = ConfigManager.normalizeConfig(config);
                        return {
                            config: normalizedConfig,
                            configPath,
                            projectRoot: currentPath
                        };
                    } catch (e) {
                        throw new Error(`Invalid JSON in ${configPath}: ${e.message}`);
                    }
                }
            }

            currentPath = path.dirname(currentPath);
        }

        throw new Error('sao.config.json or sao.config.json not found. Please create it at your project root.');
    }

    /**
     * Normalize old config format (with `root` + context `temp`) to new format
     * (with `paths` + context `compiled`).
     * 
     * Old format:
     *   { root, output, contexts: { web: { app, views, blade, temp: { views, registry } } } }
     *
     * New format:
     *   { paths: { resources, saoView, bladeView, compiled }, contexts: { web: { app, views, blade, compiled: { views, registry } } } }
     */
    static normalizeConfig(config) {
        // Already new format — nothing to do
        if (config.paths) return config;

        // Old format detected (has 'root' at top level but no 'paths')

        // Derive common compiled base from all context temp.views paths
        // e.g. ["resources/saola/js/temp/web/views", "resources/saola/js/temp/admin/views"]
        //   -> commonBase = "resources/saola/js/temp"
        const tempViewPaths = Object.values(config.contexts || {})
            .filter(ctx => ctx.temp && ctx.temp.views)
            .map(ctx => ctx.temp.views);

        let compiledBase = '';
        if (tempViewPaths.length > 0) {
            const parts = tempViewPaths[0].split('/');
            for (let i = parts.length - 1; i >= 0; i--) {
                const prefix = parts.slice(0, i).join('/');
                if (prefix && tempViewPaths.every(p => p.startsWith(prefix + '/'))) {
                    compiledBase = prefix;
                    break;
                }
            }
        }

        config.paths = {
            resources: '.',
            saoView: '',    // view paths in old format are already full relative paths
            bladeView: '',  // blade paths in old format are already full relative paths
            compiled: compiledBase,
        };

        // Normalize each context: map `temp` → `compiled` with paths relative to compiledBase
        for (const ctx of Object.values(config.contexts || {})) {
            if (ctx.temp && !ctx.compiled) {
                const makeRelative = (absRelPath) => {
                    if (!absRelPath || !compiledBase) return absRelPath || null;
                    const prefix = compiledBase + '/';
                    return absRelPath.startsWith(prefix) ? absRelPath.slice(prefix.length) : absRelPath;
                };

                ctx.compiled = {
                    views: makeRelative(ctx.temp.views) || null,
                    registry: makeRelative(ctx.temp.registry) || null,
                    // No compiled.app in old format; app source dirs are used directly
                    app: null,
                };
            }
        }

        return config;
    }

    /**
     * Validate configuration structure
     * Supports both new format (with paths) and old format (already normalized by normalizeConfig).
     */
    static validateConfig(config) {
        // Validate paths (base paths)
        // After normalizeConfig, config.paths always exists.
        if (!config.paths) {
            throw new Error('Missing required field: paths');
        }

        // resources is required; in normalized old format it is set to "."
        if (config.paths.resources === undefined || config.paths.resources === null) {
            throw new Error('Missing required paths field: resources');
        }

        // saoView / bladeView / compiled may be empty string ("") for old-format configs
        // where view paths are stored as absolute-relative paths.
        if (config.paths.saoView === undefined) {
            throw new Error('Missing required paths field: saoView');
        }

        if (config.paths.bladeView === undefined || config.paths.bladeView === null) {
            throw new Error('Missing required paths field: bladeView');
        }

        if (config.paths.compiled === undefined || config.paths.compiled === null) {
            throw new Error('Missing required paths field: compiled');
        }

        // Validate contexts
        if (!config.contexts) {
            throw new Error('Missing required field: contexts');
        }

        const contextNames = Object.keys(config.contexts);
        if (contextNames.length === 0) {
            throw new Error('At least one context must be defined');
        }

        // Validate each context
        for (const contextName of contextNames) {
            const context = config.contexts[contextName];
            // 'compiled' may have been added by normalizeConfig from 'temp'
            const contextRequired = ['name', 'app', 'views', 'blade', 'compiled'];

            for (const field of contextRequired) {
                if (context[field] === undefined || context[field] === null) {
                    throw new Error(`Context "${contextName}" missing required field: ${field}`);
                }
            }

            if (!Array.isArray(context.app)) {
                throw new Error(`Context "${contextName}": app must be an array`);
            }

            if (typeof context.views !== 'object' || Array.isArray(context.views)) {
                throw new Error(`Context "${contextName}": views must be an object (namespace => path)`);
            }

            if (typeof context.blade !== 'object' || Array.isArray(context.blade)) {
                throw new Error(`Context "${contextName}": blade must be an object (namespace => path)`);
            }
        }

        return true;
    }

    /**
     * Get context configuration
     */
    static getContext(config, contextName) {
        if (!config.contexts[contextName]) {
            throw new Error(`Context "${contextName}" not found in configuration`);
        }
        return config.contexts[contextName];
    }

    /**
     * Resolve absolute path relative to project root
     */
    static resolvePath(projectRoot, relativePath) {
        return path.resolve(projectRoot, relativePath);
    }

    /**
     * Resolve view path: paths.saoView || paths.saoView + relative path
     */
    static resolveViewPath(projectRoot, paths, relativePath) {
        const basePath = paths.saoView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve blade path: paths.bladeView + relative path
     */
    static resolveBladePath(projectRoot, paths, relativePath) {
        const basePath = paths.bladeView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve compiled path: paths.compiled + relative path
     */
    static resolveCompiledPath(projectRoot, paths, relativePath) {
        const basePath = paths.compiled;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Resolve app path: paths.saoView || paths.saoView + relative path
     */
    static resolveAppPath(projectRoot, paths, relativePath) {
        const basePath = paths.saoView;
        return path.resolve(projectRoot, basePath, relativePath);
    }

    /**
     * Get all .sao files from context
     */
    static getAllSaoFiles(projectRoot, context) {
        const files = [];
        const viewDirs = context.views;

        for (const [namespace, dirPath] of Object.entries(viewDirs)) {
            const fullPath = this.resolvePath(projectRoot, dirPath);

            if (!fs.existsSync(fullPath)) {
                console.warn(`View directory not found: ${fullPath}`);
                continue;
            }

            this.walkDir(fullPath, namespace, files);
        }

        return files;
    }

    /**
     * Walk directory recursively to find .sao files
     */
    static walkDir(dir, namespace, files = [], prefix = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                this.walkDir(fullPath, namespace, files, relativePath);
            } else if (entry.name.endsWith('.sao')) {
                files.push({
                    fullPath,
                    relativePath,
                    namespace,
                    name: entry.name.replace(/\.sao$/, '')
                });
            }
        }

        return files;
    }

    /**
     * Generate view path from file info
     * e.g., namespace: 'web', relativePath: 'admin/users/List.sao'
     * -> 'web.admin.users.List'
     */
    static generateViewPath(namespace, relativePath) {
        const pathParts = relativePath
            .replace(/\.sao$/, '')
            .split('/')
            .map(p => p.charAt(0).toLowerCase() + p.slice(1));

        return [namespace, ...pathParts].join('.');
    }
}

module.exports = ConfigManager;
