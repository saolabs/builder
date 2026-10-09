# Saola Builder v1.0.0

Build tools and Vite/Webpack integrations for .sao applications, including context-scoped SPA/static distributions. File watching now uses Chokidar 4 and path filters without glob dependencies.

## Compatibility

PHP compiler package saola/compiler is installed separately. Chokidar 4 requires Node >=14.16; the ecosystem toolchain is tested on Node 25.

## Validation

Audit, compiler/manifest/dist tests, real-file watcher regression and package dry-run passed.

## Release scope

Coordinated v1.0.0 source release of the Saola ecosystem on GitHub. Registry publishing (npm, Packagist or VS Code Marketplace) is a separate step. Existing tags and previously published registry versions are unchanged.
