#!/usr/bin/env node

/**
 * Saola Build CLI
 * Compiles and bundles Saola applications
 * 
 * Usage: sao-build [context|all] [--minify] [--watch]
 */

const Builder = require('./builder');

async function main() {
    const builder = new Builder();
    const args = process.argv.slice(2);
    
    // Show help
    if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
Saola Build CLI

Usage:
    sao-build [context|all] [options]

Contexts:
  <context>        Build specific context (e.g., web, admin, mobile)
  default          Build default context (no args = default)
  all              Build all contexts (except default)

Options:
  --minify         Minify output (creates .min.js alongside .js)
  --watch          Watch for changes and rebuild
  --sourcemap      Generate source maps
  --no-html-minify Disable HTML template minification (enabled by default)
  --help           Show help
  --version        Show version

Output:
  Files are output to: paths.public/output.contexts[context]/
  
  For example with config:
    paths.public = "public/static/one"
    output.contexts.admin = "admin/js"
  
  Admin build outputs to: public/static/one/admin/js/

HTML Template Minification:
  By default, HTML in template strings is minified to reduce bundle size.
  This removes unnecessary whitespace while preserving HTML structure.
  Use --no-html-minify to disable this feature.

Examples:
  sao-build                    # Build default context
  sao-build admin              # Build admin context
  sao-build all                # Build all contexts
  sao-build admin --minify     # Build admin with JS minification
  sao-build --watch            # Build and watch for changes
  sao-build --no-html-minify   # Build without HTML template minification

Configuration:
  Requires sao.config.json at project root.
`);
        process.exit(0);
    }

    // Show version
    if (args[0] === '--version' || args[0] === '-v') {
         const pkg = require('../package.json');
        console.log(`Saola Build v${pkg.version}`);
        process.exit(0);
    }

    try {
        await builder.run(args);
    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

main();
