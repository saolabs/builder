# Context sources: independent projects and packages

Unreleased P4/P5 implementation. This requires the matching P1 client (explicit service factories), P4 core/admin and this builder. Existing published contexts keep their original integration until migrated. Registry installation/release verification remains a release gate; local workspaces are not a substitute for published compatible versions.

## Develop without a web/admin package

A context package is optional. The framework compiler/client (and core for Laravel SSR) remain the base dependencies. Write any named context, for example `web`, `studio` or `back-office`:

```text
resources/saola/{context}/
├── app/                  # services, providers, contracts, optional bootstrap.ts
├── assets/               # system resources independent of a theme
└── views/                # .sao files, any internal structure
```

Select the source layout in the project's `.env`:

```dotenv
SAOLA_CONTEXT_MODE=auto
SAOLA_WEB_MODE=standalone
```

`standalone` means independently authored source; it is different from `sao-dist` static-site export. It does not install context features or depend on `saola/admin`, a web package, a theme manifest or even `sao.config.json`. Conventional directories are discovered automatically; supply JSON only for nonstandard paths/options. The generated entry includes core client services and registers an optional `app/bootstrap.ts` once after the shared `_app` bootstrap. Register your services with the existing `defineBundle({services: ...})` API and call them through `App.YourService`. A service class is created per Application; return a new controller/client from a factory for each view that owns mutable state.

Use the Vite configuration and TypeScript setup below with `context: 'web'`, then run `sao-compile web` followed by `vite build`. CLI compilation needs a named context (or `all`). The source pipeline generates aliases, entry, view/Blade registry and output metadata. Laravel routes, backend view-context registration, authorization and application data still belong to the host; independent frontend mode does not invent backend routes or expose an admin panel.

## Source modes and .env precedence

| Mode | Source selected |
| --- | --- |
| `standalone` | Local `{context}/{app,assets,views}`. Ignore installed context source and local theme trees. |
| `theme` | Local `{context}/app`, `{context}/assets`, `{context}/themes/{name}/{views,assets}`. Build only the chosen local theme. |
| `package` | Context source from an installed Composer package plus project overrides. Missing package is an error. |
| `published` | Preserve the existing explicit compiler mappings/publication pipeline. |
| `auto` | Preserve configured legacy/publication contexts; otherwise discover a package or conventional local source. |

Selection: `SAOLA_<CONTEXT>_MODE` → non-`auto` `SAOLA_CONTEXT_MODE` → JSON `mode` (or legacy `source`) → discovery. Process environment overrides values from the selected `.env` file. `auto` as the global value allows each context's own configuration. Context names with hyphens use underscores in env keys, e.g. `SAOLA_BACK_OFFICE_MODE`. An explicit invalid mode or missing required source fails instead of falling back to another layout.

A project can mix modes: `SAOLA_WEB_MODE=standalone` and `SAOLA_ADMIN_MODE=package`. Switching to standalone ignores an installed admin frontend source; server routes/security still follow the backend packages and host configuration.

Builder reads only mode/theme keys and does not mutate `process.env` or expose other `.env` values to bundles. When `APP_ENV` is supplied by the process and `.env.<APP_ENV>` exists, it uses that file as Laravel does. `SAOLA_DIST_*` settings are separate.

## Local themes without a context package

Keep the same logic while moving presentation into themes:

```text
resources/saola/web/
├── app/
├── assets/
└── themes/
    ├── default/{views,assets}/
    └── paper/{views,assets}/
```

```dotenv
SAOLA_WEB_MODE=theme
SAOLA_WEB_THEME=paper
```

The local theme defaults to `default`. Local `context.manifest.json` is optional: `context`, `mode`, `defaultTheme`, `namespace` and `types` can describe defaults and a public type entry. Without an explicit namespace, view names follow source directories: `web.views.pages.home` for flat source, or `web.themes.paper.views.pages.home` for the paper theme. Blade output follows the same directory names. Set `namespace` explicitly in the context config or local manifest when another base is desired, including the previous `web.*` convention.

The builder writes this namespace to `contexts.json`; core applies it as the request's view-context base. A host using explicit mappings sets the same base with `registerContext('web', ['base' => 'web.themes.default.views'])`. Layout/component/module paths derive from that base. Use context variables in view references, for example `@extends(__layout__ + 'base')` and `@import(__component__ + 'card')`, rather than hardcoding the previous namespace. Route names/URLs do not change. Package themes below retain their own namespace/chunk contract.

The local entry convention is `assets/css/app.css` in standalone mode, or `themes/{name}/assets/css/app.css` in theme mode. Optional system CSS can be imported by the context bootstrap or the theme's CSS entry. Other assets stay in their respective context/theme public paths. No duplicate implementation of services in each theme is needed.

Changing mode or a local theme requires recompilation and a new Vite build (restart the Vite dev server). Clear/rebuild Laravel configuration cache and restart long-lived workers after changing `.env`. The matching core reads source choice from `saola-contexts` configuration plus generated `contexts.json`, exports it per request and rejects a mismatch with the built mode/theme. Existing installed-theme selections are retained in cache but not applied to a local source context. Local theme selection is build-time; packaged theme selection below uses the server and separate chunks.

Generated overlays and ownership rules below also apply to these local modes. Switching layouts keeps both authored trees; only unchanged, builder-owned output is cleaned.

## Package declaration

A Composer package declares its context manifests through `extra.saola.contexts`:

```json
{"extra":{"saola":{"contexts":{"admin":"resources/saola/admin/context.manifest.json"}}}}
```

Builder reads Composer's `installed.json`, including custom `vendor-dir` and `install-path`. It does not scan arbitrary directories or replace the existing `extra.saola.client` loader. One package supplies the base of a context; a second base provider is an error. Runtime extension bundles continue through the existing loader.

The context manifest declares `package`, `context`, `namespace`, API `contract`, `bootstrap`, optional `types`, `defaultTheme`, `themes`, `renderers` and `overridable`. Theme manifests use `{context}.{theme}` namespaces. Built-in source paths are `{context}/{app,assets,themes}`. Paths must remain within their declared source root. The builder currently accepts API contract 1 and output requirements up to output contract 2. Composer/npm remain responsible for installing the compatible package versions.

## Minimal project integration

A new project can use this `sao.config.json`:

```json
{"contexts":{"admin":{}}}
```

The package supplies compiler paths, namespace/Blade mapping and entry registration. Other contexts and explicit project settings remain valid. Configure the backend guard/policy, resources and storage as described by the context package; discovery does not grant access or run migrations.

For the supported source build pipeline, use Vite:

```js
import {defineConfig} from 'vite';
import saola from '@saolabs/builder/vite';
export default defineConfig({plugins: [saola({context: 'admin'})]});
```

The plugin supplies context entry, CSS inputs, package aliases, manifest output and safe per-context output defaults. Existing Vite choices are retained. Build each context separately; `sao-compile all` can compile all contexts before those builds. Legacy `sao-build` (esbuild), standalone dist and Webpack have not been certified for this source mode; use the Vite pipeline. The esbuild builder rejects this mode rather than silently reporting success without a bundle.

After the first `sao-compile admin`, TypeScript can extend generated aliases:

```json
{
  "extends":"./resources/js/saola/tsconfig.contexts.json",
  "compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"Bundler","strict":true,"noEmit":true,"skipLibCheck":true},
  "include":["resources/js/saola/**/*.ts","resources/saola/**/*.ts"]
}
```

The generated config enables mixed JS/TS imports for compiled views and emits `types/contexts.d.ts` for the package's `types` entry. TypeScript replaces inherited `paths` when the project defines its own: retain the generated context-specific aliases if adding custom paths. Do not point `@sao/admin` back at an incomplete authored tree. Vite receives these aliases from the plugin automatically.

## Ownership and overrides

Sources remain in the installed package and `resources/saola/{context}`. The builder creates an effective overlay under `resources/js/saola/_sources/{context}`. This is generated scratch output, not an editable publication. Relative imports and resources keep the same structure there.

- Project files override package files at the same relative path. Unchanged files continue to come from the installed package.
- An optional project `app/bootstrap.ts` is registered after the package bundle. It adds project services/providers without importing the package's private implementation. Duplicate keys require explicit, permitted `overrides`; source bundles use strict merge checks.
- A project theme in `themes/{name}/theme.manifest.json` is discovered automatically. Supply its required renderers and assets, then select it through the backend context configuration.
- Files in generated overlays/compiled output have ownership/hash inventories. Customized or unowned output collisions abort the batch. Deleted upstream files remove only unchanged builder-owned output; handwritten Blade and installed themes are retained.
- Inventory files are generated state. Remove the generated tree and its inventories together when performing an intentional clean rebuild. Do not delete an inventory alone to bypass a customization conflict.

The Vite watcher tracks package and project source roots, rebuilds overlays after edits/additions/deletions and reloads the page. Source maps currently point to the effective generated source tree; keep it available while debugging. Package manifest changes are re-read when rebuilding. CLI watch also tracks package roots and TS/assets, not only `.sao` files.

## Packaged themes and server integration

Each built-in theme gets an eager internal registry behind a separate dynamic chunk. The application loads exactly one theme registry before `App.start`, so layouts/includes are synchronously available during hydration. Context logic remains shared in the application bundle.

The server selects the theme through existing shared data:

```text
APP_CONFIGS.shared['saola.context.{context}'] = { theme: '{name}', bundleKinds: { '{bundle-url}': 'package-or-theme' } }
```

The new admin package exports this using `Saola::share`, resolving the choice again per request. Without a server choice, CSR uses the manifest default. An unknown explicit theme fails visibly instead of silently hydrating a different theme. Changing theme still reloads the document. Themes installed as independent packages retain their existing runtime bundle lifecycle.

Raw theme assets are isolated under `{public}/{context}/themes/{theme}/assets`; context assets use `{public}/{context}/assets`. CSS is built for all available themes, but the server emits only the selected CSS. `public/static/saola/contexts.json` maps logical CSS source names to effective build paths; the new core `BundleManifest` uses that mapping in both dev and production. The plugin also synchronizes raw assets for dev, with ownership checks.

Package source mode enables strict bundle merging, passes context override permissions and reads trusted URL classification from that shared data. The new core `BundleManifest.bundleKinds()` distinguishes package URLs from the selected installed theme URL. A theme cannot promote itself by declaring `kind: 'package'`; unknown URLs are rejected in strict source mode. Existing source services/providers participate in collision checks. These registration restrictions are not a sandbox for arbitrary theme JavaScript.

## Existing published projects

A context with `.publish-state.json` remains on `admin:publish` by default. `source: "published"` explicitly retains that mode. Source publication is optional for new projects, not removed.

`source: "package"` opts an existing context into source discovery. Before doing so, review its published source and keep only intentional overrides; otherwise every published file becomes a project override and masks package upgrades. Keep backups/ownership state until migration is accepted. Do not delete customized source automatically. Project bootstrap should add its own bundle rather than spread an old published package bundle into it.

## Validation

Regression tests cover Composer discovery, legacy mode, custom vendor paths, namespace/assets, project theme discovery, overlays across upgrades, collisions/symlinks, generated declarations and cleanup of owned files. P4 was also checked using a copied installed admin/compiler/client/builder consumer with no source publication: real PHP compile, TypeScript (including negative API checks), Vite build and both theme chunks. Dependencies were reused from the local installation; clean registry installation and browser acceptance remain P6 checks.

P5 additionally tests independent contexts without any installed web/admin package, `.env` precedence/isolation, optional bootstrap/types, directory-based local namespaces, explicit namespace overrides, retained authored sources and Vite defaults. A minimal installed consumer passed real PHP compile → TypeScript → Vite in both standalone and local-theme modes without `sao.config.json`.

Run the local artifact acceptance gate from a development checkout:

```sh
# Build the matching client first so its npm archive contains current runtime/types.
npm --prefix ../client run build
npm run test:context-sources
```

The gate extracts actual builder/client npm archives into a temporary consumer. It uses the installed compiler and core/Testbench to compile and render real Blade, then loads the production Vite entry in jsdom. It verifies typed App calls (including a rejected unknown method), claims the original SSR node, dispatches an event through the public service and mounts a fresh CSR view. It repeats standalone → paper → night → standalone, checking selected HTML/CSS and unchanged authored files without any web/admin package, manifest or `sao.config.json`.

The default development layout expects sibling `client`, `core` and `compiler` checkouts with dependencies installed; override them with `SAOLA_TEST_CLIENT_ROOT`, `SAOLA_TEST_CORE_ROOT` and `SAOLA_TEST_COMPILER_ROOT`. Tooling and Composer dependencies are reused locally. This verifies archive contents and the runtime contract, not clean registry installation or real-browser layout/network behavior. Successful temporary artifacts are removed; set `SAOLA_TEST_KEEP_ARTIFACTS=1` to retain them. Failures retain the printed acceptance directory for diagnosis.
