#!/usr/bin/env node

/**
 * Saola Builder compile CLI
 * Part of the Saola library
 * 
 * Usage: sao-compile [context|all] [--watch]
 */

const Compiler = require('./index');

async function main() {
    const compiler = new Compiler();
    const args = process.argv.slice(2);
    
    // Show help only when explicitly requested
    if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
Saola Builder Compile CLI

Usage:
  sao-compile [context|all] [--watch]

Contexts:
  <context>        Compile specific context (e.g., web, admin, mobile)
  default          Compile according to default context config (no args = default)
  all              Compile all contexts (except default)

Options:
  --watch          Watch for file changes
  --help           Show help
  --version        Show version

Examples:
  sao-compile                  # Compile default context
  sao-compile admin            # Compile admin context
  sao-compile all              # Compile all contexts
  sao-compile web --watch      # Compile web and watch for changes

Configuration:
  Requires sao.config.json or sao.config.json at project root.
`);
        process.exit(0);
    }

    // Show version
    if (args[0] === '--version' || args[0] === '-v') {
         const pkg = require('../package.json');
        console.log(`Saola Builder v${pkg.version}`);
        process.exit(0);
    }

    try {
        await compiler.run(args);
    } catch (error) {
        console.error('\n❌ Compilation failed:', error.message);
        process.exit(1);
    }
}

main();
