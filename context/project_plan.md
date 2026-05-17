# Project Plan: icu-cli
<!--
  WHAT: This is your roadmap for the project. Think of it as your "working memory on disk."
  WHY: After 50+ tool calls, your original goals can get forgotten. This file keeps them fresh.
  WHEN: Create this FIRST, before starting any work. Update after each phase completes.
-->

## Goal
<!--
  WHAT: One clear sentence describing the purpose of this project.
  WHY: This is your north star. Re-reading this keeps you focused on the end state.
-->
Build a cross-platform TypeScript CLI (`icu`) that wraps the Intervals.icu REST API, supporting 11 command groups, dual authentication, multiple output formats, and standalone binary distribution.

## Current Phase
<!--
  WHAT: Which phase you're currently working on.
  WHY: Quick reference for where you are in the project. Update this as you progress.
-->
Phase 5

## Phases

### Phase 1: Project Scaffolding & Tooling
<!--
  Set up the repository, install dependencies, and configure the dev toolchain.
-->
- [x] Initialise `package.json` with metadata, scripts, and engine constraints. See [Dependencies](../SPEC.md#3-dependencies-packagejson).
- [x] Create `tsconfig.json` with strict mode and ES module output
- [x] Create `biome.json` configuration
- [x] Install production dependencies (`commander`, `openapi-fetch`, `cli-table3`, `env-paths`)
- [x] Install dev dependencies (`typescript`, `tsup`, `tsx`, `vitest`, `@biomejs/biome`, `openapi-typescript`)
- [x] Download and pin the Intervals.icu OpenAPI spec to `api/openapi-spec.json`. See [API Client Generation](../SPEC.md#12-api-client-generation).
- [x] Run `openapi-typescript` to generate `src/generated/api.d.ts`
- [x] Verify the project builds (`tsup`) and lints (`biome check`) cleanly
- **Status:** complete

### Phase 2: Core Modules — **COMPLETE**
<!--
  Implement the foundational modules that all commands depend on.
-->
- [x] Implement `src/config.ts` — config directory resolution, read/write `config.json`, athlete ID resolution. See [config.ts](../SPEC.md#configts) and [Athlete ID Resolution](../SPEC.md#7-athlete-id-resolution).
- [x] Implement `src/auth.ts` — read env vars, resolve auth headers (Bearer > Basic). See [auth.ts](../SPEC.md#authts) and [Authentication Flow](../SPEC.md#6-authentication-flow).
- [x] Implement `src/client.ts` — create typed `openapi-fetch` client with base URL and auth headers. See [client.ts](../SPEC.md#clientts).
- [x] Implement `src/output.ts` — TTY detection, format resolution, JSON/table/plain renderers. See [output.ts](../SPEC.md#outputts) and [Output Formatting](../SPEC.md#8-output-formatting).
- [x] Implement `src/input.ts` — file path / stdin reader, JSON parsing. See [input.ts](../SPEC.md#inputts) and [File Input Handling](../SPEC.md#9-file-input-handling).
- [x] Implement `src/cli.ts` — Commander program setup, global options, error handling. See [cli.ts](../SPEC.md#clits).
- [x] Implement `src/index.ts` — entry point
- [x] Write unit tests for `config.ts`, `auth.ts`, `output.ts`, `input.ts`, `cli.ts`, `client.ts`. See [Automated Tests](../SPEC.md#automated-tests). 52 tests total. All SPEC §14 scenarios covered except stdin and integration tests.
- **Status:** complete

### Phase 3: Top-Level Commands — **COMPLETE**
<!--
  Implement the top-level commands (whoami, config, auth status).
-->
- [x] Implement `src/commands/whoami.ts` — GET /api/v1/athlete/0/profile, --save flag, table/plain/json output with 7 columns. See [Top-Level Commands](../SPEC.md#42-top-level-commands).
- [x] Implement `src/commands/config-cmd.ts` (`config set`, `config get`, `config list`) — validates keys and format values, merges into existing config. See [Top-Level Commands](../SPEC.md#42-top-level-commands).
- [x] Implement `icu auth status` command — calls /api/v1/athlete/0/profile, shows auth mode + athlete info, discloses which env var is set. See [Top-Level Commands](../SPEC.md#42-top-level-commands).
- [x] Write integration tests for top-level commands: whoami, config, auth status. 83 tests total (56 unit + 27 integration). All pass.
- **Status:** complete

### Phase 4: Command Groups — Data Access
<!--
  Implement the read-heavy command groups first (athletes, activities, events, wellness).
-->
- [x] Implement `src/commands/athletes.ts` (`get`, `update`, `profile`, `training-plan get`, `training-plan update`, `summary`). See [icu athletes](../SPEC.md#icu-athletes).
- [x] Write integration tests for athletes command group. 34 tests covering get, update, profile, training-plan get/update, summary subcommands. 118 tests total (83 existing + 34 new + 1 new test added = 118).
- [x] Implement `src/commands/activities.ts` (`list`, `get`, `create`, `upload`, `update`, `delete`, `search`, `streams`, `intervals`, `download-fit`, `download-gpx`). See [icu activities](../SPEC.md#icu-activities).
- [x] Write integration tests for activities command group. 22 tests covering list, get, create, update, delete, search, streams, intervals, download-fit, download-gpx subcommands. 151 tests total.
- [x] Implement `src/commands/events.ts` (`list`, `get`, `create`, `update`, `delete`, `download`). See [icu events](../SPEC.md#icu-events). Strict validation (Number() vs parseInt), output path validation, CSV format fix, static import consistency. 152 tests passing.
- [x] Write integration tests for events command group. 34 tests covering list, get, create, update, delete, download subcommands. Test infrastructure improved across all test files (global state cleanup, helper functions, SpyInstance types). 186 tests total.
- [x] Implement `src/commands/wellness.ts` (`list`, `get`, `update`, `upload`). See [icu wellness](../SPEC.md#icu-wellness). Added stdin support (--file -), CSV parsing with csv-parse library, Zod validation.
- [x] Write integration tests for wellness command group, covering `list`, `get`, `update`, `upload` subcommands. 34 tests added (287 total now).
- [x] Add Zod schema validation for Wellness, Event, Activity, Athlete in `src/utils/validation.ts`. Added validateWellness, validateEvent, validateActivity, validateAthlete functions. 67 unit tests.
- **Status:** complete

### Phase 5: Command Groups — Planning & Social
<!--
  Implement the remaining command groups (workouts, sport settings, chats, weather, shared events, fitness, performance).
-->
- [ ] Implement `src/commands/workouts.ts` (`list`, `get`, `create`, `update`, `delete`, `download`). See [icu workouts](../SPEC.md#icu-workouts).
- [ ] Implement `src/commands/sport-settings.ts` (`list`, `get`, `create`, `update`, `delete`). See [icu sport-settings](../SPEC.md#icu-sport-settings).
- [ ] Implement `src/commands/chats.ts` (`list`, `get`, `messages`, `send`). See [icu chats](../SPEC.md#icu-chats).
- [ ] Implement `src/commands/weather.ts` (`forecast`, `config-get`, `config-update`). See [icu weather](../SPEC.md#icu-weather).
- [ ] Implement `src/commands/shared-events.ts` (`get`). See [icu shared-events](../SPEC.md#icu-shared-events).
- [ ] Implement `src/commands/fitness.ts` (`list`). See [icu fitness](../SPEC.md#icu-fitness).
- [ ] Implement `src/commands/performance.ts` (`power`, `pace`, `hr`). See [icu performance](../SPEC.md#icu-performance).
- [ ] Write integration tests for each command group (mocked HTTP responses)
- **Status:** pending

### Phase 6: Error Handling & Polish
<!--
  Harden error handling, refine user-facing messages, and ensure consistent behaviour.
-->
- [ ] Implement structured error handling across all commands. See [Error Handling](../SPEC.md#10-error-handling).
- [ ] Ensure all errors go to `stderr`, data to `stdout`
- [ ] Validate exit codes (`0` success, `1` error). See [Exit Codes](../SPEC.md#11-exit-codes).
- [ ] Add `--help` text and descriptions for all commands and options
- [ ] End-to-end manual testing against the live Intervals.icu API. See [Manual Tests](../SPEC.md#manual-tests).
- **Status:** pending

### Phase 7: Packaging & CI/CD
<!--
  Set up build pipeline, single executable compilation, and automated release.
-->
- [ ] Configure `tsup` for single-file ESM bundle. See [Packaging](../SPEC.md#13-packaging).
- [ ] Verify `bun build --compile` produces working binaries for all 3 targets
- [ ] Create GitHub Actions CI workflow (PR: lint → test → build). See [CI/CD Pipeline](../SPEC.md#cicd-pipeline-github-actions).
- [ ] Create GitHub Actions release workflow (tag push: compile → release → npm publish). See [CI/CD Pipeline](../SPEC.md#cicd-pipeline-github-actions).
- [ ] Verify npm package installs and runs correctly (`npm install -g icu-cli`)
- [ ] Verify standalone binaries on Windows, Linux, and macOS
- **Status:** pending

## Decisions Made
<!--
  WHAT: Technical and design decisions you've made, with the reasoning behind them.
  WHY: You'll forget why you made choices. This table helps you remember and justify decisions.
  WHEN: Update whenever you make a significant choice (technology, approach, structure).
-->
| Decision | Rationale |
|----------|-----------|
| `commander` over oclif/yargs | Most popular, well-documented, clean subcommand support without framework overhead |
| `openapi-typescript` + `openapi-fetch` | Type-safe API calls generated directly from the official spec; eliminates manual type definitions |
| Pin the OpenAPI spec locally | Reproducible builds; explicit control over when API changes are adopted |
| `tsup` (esbuild) for bundling | Fast single-file bundling, handles TS → JS without Webpack complexity |
| `bun build --compile` for executables | Cross-compiles to standalone binaries for 3 targets; Bun only needed at build time |
| `biome` for lint + format | Single Rust-based tool replacing ESLint + Prettier; near-instant execution |
| `env-paths` for config directory | Cross-platform XDG-compliant paths without manual platform detection |
| Bearer token precedence over API key | OAuth is the more secure credential; if a user has both configured, prefer the stronger one |
| `tsup.config.ts` ESM entry | tsup needs an explicit config file to know entry point and format; defaults to CJS |
| `Command as Cmd` import alias | `addCommand(new Command(...))` requires `Command` as a value (constructor), not just a type; alias avoids shadowing the `Command` type parameter |
| 14 commands (not 13) | SPEC §4.2 lists 3 top-level commands (whoami, config, auth) + 11 command groups = 14 total; `auth-cmd.ts` is a separate file not in SPEC §1 file list |
| `getAuthMode()` in auth.ts | Non-throwing auth mode detection (`'bearer' | 'api_key' | 'none'`) used by `auth-cmd.ts`; keeps auth logic in the auth module, testable independently |
| `_resetConfigCache()` in config.ts | Exported test utility to reset lazy-loaded `env-paths` cache so tests can control the mock return value before the first call |
| Lazy `cachedPaths` pattern | Top-level `const paths = envPaths(...)` runs at module load, before mocks are set up; lazy pattern allows test reset via `_resetConfigCache()` |

## Notes
<!--
  REMINDERS:
  - Update phase status as you progress: pending → in_progress → complete
  - Re-read this plan before major decisions
  - Never repeat a failed action - change your approach instead
-->
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- The Intervals.icu API spec is available at `https://intervals.icu/api/v1/docs`
- Node.js 24 LTS is the minimum supported runtime