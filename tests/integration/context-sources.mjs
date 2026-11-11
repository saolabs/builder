/** Local artifact acceptance. Runtime tooling is reused from the workspace; no registry claim. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const builder = path.resolve(here, '../..');
const client = path.resolve(process.env.SAOLA_TEST_CLIENT_ROOT || path.join(builder, '../client'));
const core = path.resolve(process.env.SAOLA_TEST_CORE_ROOT || path.join(builder, '../core'));
const compiler = path.resolve(process.env.SAOLA_TEST_COMPILER_ROOT || path.join(builder, '../compiler'));
const clientRequire = createRequire(path.join(client, 'package.json'));
const suite = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'saola-context-acceptance-')));
const run = (command, args, cwd, extra = {}) => {
    try { return execFileSync(command, args, {cwd, env: {...process.env, ...extra}, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe']}); }
    catch (error) { throw new Error(`${command} ${args.join(' ')}\n${error.stdout || ''}\n${error.stderr || ''}`, {cause: error}); }
};
const put = (root, name, text) => {const file = path.join(root, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, typeof text === 'string' ? text : JSON.stringify(text, null, 2));};
console.log(`Acceptance root: ${suite}`);
const archive = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', suite], builder, {npm_config_cache: path.join(suite, 'npm-cache')}))[0];
const clientArchive = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', suite], client, {npm_config_cache: path.join(suite, 'npm-cache')}))[0];
const root = path.join(suite, 'consumer'); fs.mkdirSync(root);
put(root, 'package.json', {type: 'module', private: true});
fs.mkdirSync(path.join(root, 'node_modules/@saolabs/builder'), {recursive: true});
run('tar', ['-xf', path.join(suite, archive.filename), '--strip-components=1', '-C', path.join(root, 'node_modules/@saolabs/builder')], root);
for (const entry of fs.readdirSync(path.join(builder, 'node_modules'), {withFileTypes: true})) {
    if (entry.name === '@saolabs' || entry.name === '.bin') continue;
    fs.symlinkSync(fs.realpathSync(path.join(builder, 'node_modules', entry.name)), path.join(root, 'node_modules', entry.name));
}
fs.mkdirSync(path.join(root, 'node_modules/@saolabs/client'), {recursive: true});
run('tar', ['-xf', path.join(suite, clientArchive.filename), '--strip-components=1', '-C', path.join(root, 'node_modules/@saolabs/client')], root);
for (const name of ['vite', 'typescript', 'jsdom']) {
    const packageRoot = path.dirname(clientRequire.resolve(`${name}/package.json`));
    const target = path.join(root, 'node_modules', name);
    if (!fs.existsSync(target)) fs.symlinkSync(packageRoot, target);
}
fs.mkdirSync(path.join(root, 'vendor/saola'), {recursive: true});
fs.symlinkSync(compiler, path.join(root, 'vendor/saola/compiler'));
put(root, 'global.css', 'body {margin: 0;}');
put(root, 'vite.config.mjs', "import {defineConfig} from 'vite';import saola from '@saolabs/builder/vite';export default defineConfig({plugins:[saola({context:'studio',watch:false}),{name:'framework-inputs',enforce:'post',config(config){return {build:{rollupOptions:{input:config.build?.rollupOptions?.input || ['resources/js/saola/app.studio.js','global.css']}}};}}]});\n");
put(root, 'tsconfig.json', {extends:'./resources/js/saola/tsconfig.contexts.json',compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true,noEmit:true,skipLibCheck:true,lib:['ES2022','DOM','DOM.Iterable']},include:['resources/js/saola/**/*.ts','resources/saola/**/*.ts','api-check.ts']});
put(root, 'resources/saola/studio/app/bootstrap.ts', "import {defineBundle} from '@saolabs/client';import type {} from './contracts';class Demo {next(value:number) {return value+1;}}export default defineBundle({name:'fixture/studio',services:{Demo}});\n");
put(root, 'resources/saola/studio/app/contracts.ts', "export interface DemoApi {next(value:number):number;}declare module '@saolabs/client' {interface Application {Demo:import('@sao/studio/app/contracts').DemoApi;}interface ApplicationInterface {Demo:import('@sao/studio/app/contracts').DemoApi;}}\n");
put(root, 'api-check.ts', "import {App} from '@saolabs/client';const n:number=App.Demo.next(0);\n// @ts-expect-error public API must reject an unknown method\nApp.Demo.noSuchMethod();\n");
const view = label => `@states({ count: 0 })\n<main data-source="${label}"><span id="value">{{ count }}</span><button id="inc" @click(setCount(App.Demo.next(count)))>Increment</button></main>\n`;
put(root, 'resources/saola/studio/views/pages/home.sao', view('standalone'));
put(root, 'resources/saola/studio/assets/css/app.css', 'body {color: #222;}');
for (const theme of ['paper', 'night']) {
    put(root, `resources/saola/studio/themes/${theme}/views/pages/home.sao`, view(theme));
    put(root, `resources/saola/studio/themes/${theme}/assets/css/app.css`, `body {color: ${theme === 'night' ? 'white' : 'black'};}`);
}
for (const [mode, theme] of [['standalone', null], ['theme', 'paper'], ['theme', 'night'], ['standalone', null]]) {
    put(root, '.env', `SAOLA_STUDIO_MODE=${mode}\n${theme ? `SAOLA_STUDIO_THEME=${theme}\n` : ''}`);
    run('node', ['node_modules/@saolabs/builder/src/cli.js', 'studio'], root);
    run('node', ['node_modules/typescript/bin/tsc', '--noEmit'], root);
    run('node', ['node_modules/vite/bin/vite.js', 'build'], root);
    const viteManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/static/saola/studio/manifest.json')));
    assert.ok(viteManifest['global.css'], 'framework stylesheet inputs must survive context plugin configuration');
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/static/saola/contexts.json'))).studio;
    assert.equal(metadata.mode, mode); assert.equal(metadata.theme, theme);
    const registry = fs.readFileSync(path.join(root, 'resources/js/saola/studio/registry.js'), 'utf8');
    const namespace = theme ? `studio.themes.${theme}.views` : 'studio.views';
    assert.equal(metadata.namespace, namespace);
    assert.ok(registry.includes(`${namespace}.pages.home`));
    const label = theme || 'standalone';
    const ssr = run('php', [path.join(core, 'vendor/bin/phpunit'), '--bootstrap', path.join(core, 'vendor/autoload.php'), path.join(here, 'ContextConsumerTest.php')], core, {SAOLA_CONTEXT_CONSUMER_ROOT: root, SAOLA_CONTEXT_CONSUMER_MODE: mode, SAOLA_CONTEXT_CONSUMER_THEME: theme || ''});
    assert.match(ssr, /OK \(1 test/);
    assert.ok(fs.readFileSync(path.join(root, 'ssr.html'), 'utf8').includes(`data-source="${label}"`), 'SSR must use the selected source');
    const hydration = run('node', [path.join(here, 'hydrate-context.mjs'), root], root);
    console.log(`${mode}${theme ? ':'+theme : ''}: compile, typed App API, Vite, real SSR, hydrate, CSR PASS\n${hydration.trim()}`);
}
assert.ok(!fs.existsSync(path.join(root, 'sao.config.json')));
assert.ok(!fs.existsSync(path.join(root, 'vendor/saola/admin')));
for (const [name, label] of [['views/pages/home.sao', 'standalone'], ['themes/paper/views/pages/home.sao', 'paper'], ['themes/night/views/pages/home.sao', 'night']]) assert.equal(fs.readFileSync(path.join(root, 'resources/saola/studio', name), 'utf8'), view(label), 'authored source must remain unchanged');
console.log('Context source artifact acceptance: PASS (authored sources retained).');
if (process.env.SAOLA_TEST_KEEP_ARTIFACTS !== '1') fs.rmSync(suite, {recursive: true, force: true});
