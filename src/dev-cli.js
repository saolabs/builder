#!/usr/bin/env node

/**
 * Saola Dev Server CLI
 * Development server with hot reload
 * 
 * Usage: sao-dev [context] [--port=8000]
 */

const DevServer = require('./dev-server');

async function main() {
    const devServer = new DevServer();
    const args = process.argv.slice(2);
    
    // Show help
    if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
Saola Dev Server

Usage:
    sao-dev [context] [options]

Contexts:
  <context>        Dev server for specific context (e.g., web, admin, mobile)
  default          Dev server for default context (no args = default)

Options:
  --port=8000      PHP server port (default: 8000)
  --host=localhost PHP server host (default: localhost)
  --no-browser     Don't open browser automatically
  --no-reload      Disable auto reload on changes
  --help           Show help
  --version        Show version

Features:
  • Compiles .sao files in dev mode (no minification)
  • Starts PHP artisan serve
  • Watches for file changes
  • Auto-reloads browser on changes
  • Restarts PHP server when needed

Examples:
  sao-dev                  # Dev server for default context
  sao-dev admin            # Dev server for admin context
  sao-dev web --port=8080  # Dev server on port 8080
  sao-dev --no-browser     # Don't open browser

Configuration:
  Requires sao.config.json at project root.
  Output goes to paths.dev (or paths.public if dev not set).
`);
        process.exit(0);
    }

    // Show version
    if (args[0] === '--version' || args[0] === '-v') {
         const pkg = require('../package.json');
        console.log(`Saola Dev Server v${pkg.version}`);
        process.exit(0);
    }

    try {
        await devServer.run(args);
    } catch (error) {
        console.error('\n❌ Dev server error:', error.message);
        process.exit(1);
    }
}

main();
