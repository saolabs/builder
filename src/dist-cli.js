#!/usr/bin/env node
const { run } = require('./dist');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Saola standalone SPA distribution\n\nUsage: sao-dist [context|all] [--static] [--config filename] [--mode name]\n\nReads sao.config.json; exports routes/context from Laravel. Optional context.dist overrides; reads SAOLA_DIST_* from .env files (default mode: production).\nWrites dist/<context> for SPA or dist-static/<context> for prerendered HTML.\nSet package.json scripts.dist to "sao-dist"; then npm run dist:web -- --static.');
} else {
    run(args).catch(error => { console.error(`Saola dist failed: ${error.message}`); process.exitCode = 1; });
}
