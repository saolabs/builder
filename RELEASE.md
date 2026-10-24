# Saola Builder v1.2.0

Standalone distribution locale filtering now retains scoped Saola catalog snapshots alongside legacy Laravel dictionaries, always retaining the configured default/fallback locales. Type declarations include snapshot scope/revision/tree. Static exports are build-time snapshots and do not refresh themselves when a database changes.

The GitHub tag v1.2.0 is the distribution used by the coordinated admin alpha; npm publication is separate. The compiler is installed through Composer; use saola/compiler >=3.0 for the new .sao translation contract.

Validation: builder/compiler/manifest/dist/watch tests and package archive smoke.
