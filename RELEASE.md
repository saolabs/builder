# Saola Builder v1.3.1

Preserves existing managed source publications before validating the newer package theme contract. Fixes builds of projects using legacy published admin themes; explicit package mode still validates descriptors strictly.

Validated with the builder suite and the Gehihi consumer build.

# Saola Builder v1.3.0

Adds conventional plain/theme/package context modes and distributable context manifests. Rebuilds are serialized, environment changes reload configuration, dotted namespaces resolve consistently, and theme installation keeps generated views safe. Includes context integration and watcher regression coverage.

Validated with the compiler, manifest, distribution and 50 Node tests (polling watcher on macOS). Distributed through the GitHub tag and package archive, matching existing consumer dependency URLs.

# Saola Builder v1.0.2

Build tools and Vite/Webpack integrations for .sao applications, including context-scoped SPA/static distributions. File watching now uses Chokidar 4 and path filters without glob dependencies.

## Compatibility

PHP compiler package saola/compiler is installed separately. Chokidar 4 requires Node >=14.16; the ecosystem toolchain is tested on Node 25.

## Validation

Audit, compiler/manifest/dist tests, real-file watcher regression and package dry-run passed.

## Release scope

Coordinated v1.0.2 registry release using the tested v1.0.0 source. Package manifests are normalized to 1.0.2 for registry availability. Runtime source is unchanged from v1.0.0. Existing tags and previously published versions are preserved.
