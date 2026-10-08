const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('dotenv');
const { expand } = require('dotenv-expand');

/** Reads build settings without changing Laravel/Node's process environment. */
function loadDistEnv(projectRoot, mode = 'production', processEnv = process.env) {
    if (!/^[a-zA-Z0-9_-]+$/.test(mode) || mode === 'local') throw new Error('Invalid dist mode (local is reserved for .env.local)');
    const parsed = {};
    for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
        const file = path.join(projectRoot, name);
        if (fs.existsSync(file)) Object.assign(parsed, parse(fs.readFileSync(file)));
    }
    const values = expand({ parsed, processEnv: { ...processEnv } }).parsed;
    // Export an allowlisted prefix only; application secrets never enter boot config.
    return Object.fromEntries(Object.entries({ ...values, ...processEnv }).filter(([key]) => key.startsWith('SAOLA_DIST_')));
}

function applyDistEnv(cfg, context, env) {
    const prefix = `SAOLA_DIST_${context.replace(/-/g, '_').toUpperCase()}_`;
    const fields = { BASE_URL: 'baseUrl', API_URL: 'apiUrl', API_KEY: 'apiKey', API_KEY_HEADER: 'apiKeyHeader' };
    const value = suffix => Object.hasOwn(env, prefix + suffix) ? env[prefix + suffix] : env['SAOLA_DIST_' + suffix];
    for (const [suffix, field] of Object.entries(fields)) {
        const setting = value(suffix);
        if (setting !== undefined) cfg[field] = setting;
    }
    const endpoint = value('DATA_URL');
    if (endpoint !== undefined) cfg.view = { ...cfg.view, dataEndpoint: endpoint };
    return cfg;
}
module.exports = { loadDistEnv, applyDistEnv };
