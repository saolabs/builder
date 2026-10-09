# Saola Builder v1.0.2

Build tools and Vite/Webpack integrations for .sao applications, including context-scoped SPA/static distributions. File watching now uses Chokidar 4 and path filters without glob dependencies.

## Compatibility

PHP compiler package saola/compiler is installed separately. Chokidar 4 requires Node >=14.16; the ecosystem toolchain is tested on Node 25.

## Validation

Audit, compiler/manifest/dist tests, real-file watcher regression and package dry-run passed.

## Release scope

Coordinated v1.0.2 registry release using the tested v1.0.0 source. Package manifests are normalized to 1.0.2 for registry availability. Runtime source is unchanged from v1.0.0. Existing tags and previously published versions are preserved.
