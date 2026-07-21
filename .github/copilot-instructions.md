# Copilot instructions for `nav-enonicxp`

## Platform baseline (critical)

- This project is **Enonic XP 7**.
- **Do not use XP8 assumptions, APIs, examples, or migration patterns** unless explicitly requested.
- Primary platform docs: https://developer.enonic.com/docs/platform/xp7

## What this repository is

- Backend CMS/API application for NAV.no on Enonic XP 7.
- Exposes APIs consumed by **`nav-enonicxp-frontend`** (Next.js, separate repo). Some are protected with secret headers and/or role-based access.
- Contains substantial runtime logic for:
    - publish/prepublish/unpublish flows: Runs as Enonic XP tasks.
    - cache invalidation and frontend revalidation: These all call the nav-enonicxp-frontend-revalidator-proxy (separate app) to trigger cache invalidation and frontend revalidation.
    - localization/layers behavior: default layer is Bokmål. Two other layers are Nynorsk and English.
    - sitemap generation
    - external search indexing: Each publish or delete event triggers buildExternalSearchDocument, which creates a minimal document. This is sent to navno-search-admin-api for indexing in OpenSearch.
    - Office data imports: Cron jobs that imports from Norg2, transpiles and publishes updated office data, for example for local Nav offices.

## Architecture map (read this first)

- Runtime bootstrap: `src/main/resources/main.ts`
    - Registers listeners, schedules, and init hooks.
    - Start investigation here for behavior changes.
- Site routing and frontend handoff:
    - `src/main/resources/site/site.xml`
    - Controllers in `src/main/resources/lib/controllers/*`
    - Proxy logic in `src/main/resources/lib/controllers/frontend-proxy.ts`
- Headless/API services:
    - `src/main/resources/services/*`
    - Main content endpoint: `services/sitecontent/sitecontent.ts`
- Guillotine schema and queries:
    - `src/main/resources/lib/guillotine/schema/*`
    - `src/main/resources/lib/guillotine/queries/*`
- Content callbacks (preprocesses content and tweaks schema before returning to guillotine):
    - `src/main/resources/lib/guillotine/schema/schema-creation-callbacks`
- Content type policy lists:
    - `src/main/resources/lib/contenttype-lists.ts` (treat as source of truth for grouped behavior)
- Helper functions and utilities (validation, array manipulation, logging, etc.):
    - `src/main/resources/lib/utils/*`

## Security and access patterns

- Many service endpoints require secret header validation:
    - `validateServiceSecretHeader(req)` in `lib/utils/auth-utils.ts`
- Editor/internal selector services are usually restricted in `services/**/**.xml` to:
    - `role:system.admin.login`
- Keep existing auth checks and access constraints unless explicitly changing security behavior.

## Localization/layers model

- Layer/project data is built dynamically in:
    - `lib/localization/layers-data.ts`
- Locale-aware path resolution:
    - `services/sitecontent/common/find-target-content-and-locale.ts`
    - `lib/paths/locale-paths.ts`
- Default locale is unsuffixed; non-default locales use suffix paths.
- Publish/unpublish propagation logic exists in:
    - `lib/localization/publish-events.ts`

## Cache, publish, and scheduling coupling

- Cache invalidation is event-driven and coupled to publish events:
    - `lib/cache/invalidate-event-handlers.ts`
    - `lib/cache/cache-invalidate.ts`
    - `lib/cache/frontend-cache.ts`
- Prepublish/unpublish scheduling:
    - `lib/scheduling/scheduled-publish.ts`
    - related tasks in `src/main/resources/tasks/*`
- If you change publish behavior, validate both:
    1. scheduler/task flow
    2. cache invalidation/revalidation flow

## Content modeling constraints

- Enonic schema XML lives in:
    - `src/main/resources/site/content-types`
    - `src/main/resources/site/mixins`
    - `src/main/resources/site/parts`
    - `src/main/resources/site/layouts`
    - `src/main/resources/site/macros`
- **Avoid renaming existing field names in content types** without explicit migration strategy.
    - Historical data can become effectively inaccessible in normal queries/UI.

## Build, test, and toolchain

- Build/test stack is mixed Gradle + pnpm + TypeScript/Babel.
- CI-aligned baseline:
    - Unit tests: `pnpm --filter nav-enonicxp-unit-tests run test`
    - App build: `./gradlew build -PxpVersion=<version>`
- TypeScript source under `src/main/resources/**/*.ts`, transpiled by Babel.
- Transpiled JavaScript is executed on the JVM using **Nashorn** (legacy JS runtime constraints apply).

## Repo docs and references

- Main README: `README.md`
- Config notes: `config/README.md`
- Useful XP tools: `tools.md`
- Alerting setup: `alerting.md`
- Cache docs: https://github.com/navikt/nav-enonicxp/wiki/Caching
- Enonic XP7 docs (authoritative baseline): https://developer.enonic.com/docs/platform/xp7

## Code style and readability conventions

- Prefer **`const` + arrow functions** for helpers and exports (`export const get = ...`, `export const run = ...`).
- Keep flow easy to scan:
    - guard clauses / early returns first
    - main happy-path logic after validation
    - small focused helper functions above the endpoint/task entrypoint
- Prioritize **legibility over cleverness**:
    - descriptive names are preferred over short/clever names
    - avoid compressed “smart” expressions when a few explicit lines are clearer
    - avoid unnecessary abstractions for one-off logic
- Use explicit typing where it improves intent:
    - typed request param objects
    - explicit union types for constrained values
    - narrow return types for service/task outputs
- Comments should be short and purposeful:
    - explain _why_ (constraints/workarounds/domain behavior), not obvious _what_
    - keep comments near non-obvious logic paths
- Error handling/logging style:
    - use `logger` (not `console`)
    - include useful context (ids, paths, repo/locale/branch)
    - return explicit HTTP status + structured JSON body for service errors
- Keep formatting/patterns consistent with surrounding files (this repo has legacy variation; align with local file style when editing).

## Working style for changes

- Make minimal, surgical changes aligned with existing patterns.
- Reuse existing helper functions before adding new abstractions.
- Preserve event/listener/scheduler side effects.
- For behavior changes touching API responses, keep frontend contract compatibility in mind (`nav-enonicxp-frontend`).
