# Repository Onboarding for AI Agents

## What this repository does

`icu-cli` is a cross-platform TypeScript CLI tool for the [Intervals.icu](https://intervals.icu) API. It enables users to query, schedule, and automate training data from the command line. The CLI covers 11 API service groups: athletes, activities, events, wellness, workouts, sport settings, chats, weather, shared events, fitness, and performance curves.

## Architecture

- **Entry point:** `src/index.ts` → `src/cli.ts` (Commander program setup)
- **Core modules:** `config.ts` (XDG-compliant config via `env-paths`), `auth.ts` (API key Basic auth / OAuth bearer token), `client.ts` (`openapi-fetch` typed client factory), `output.ts` (TTY-aware formatting: json/table/plain), `input.ts` (file/stdin JSON reader), `utils/validation.ts` (Zod runtime validation)
- **Commands:** `src/commands/*.ts` — one module per command group, each registers subcommands on the Commander program
- **Generated types:** `src/generated/api.d.ts` — auto-generated from the pinned OpenAPI spec via `openapi-typescript`
- **Authentication flow:** `ICU_ACCESS_TOKEN` (Bearer) takes precedence over `ICU_API_KEY` (Basic auth). If neither is set, exit with error.
- **Athlete ID resolution:** `--athlete` flag > `ICU_ATHLETE_ID` env var > `athleteId` from config file
- **Output format resolution:** `--format` flag > `defaultFormat` from config > TTY detection (table if TTY, json otherwise)

## Repository layout

```
icu-cli/
├── src/
│   ├── index.ts                  # Entry point
│   ├── cli.ts                    # Commander program setup
│   ├── config.ts                 # Config file read/write (env-paths)
│   ├── auth.ts                   # Auth header resolution
│   ├── client.ts                 # openapi-fetch client factory
│   ├── output.ts                 # TTY-aware output formatting
│   ├── input.ts                  # --file / stdin input reader
│   ├── utils/
│   │   └── validation.ts          # Zod runtime validation
│   ├── commands/                 # One module per command group
│   │   ├── whoami.ts
│   │   ├── config-cmd.ts
│   │   ├── athletes.ts
│   │   ├── activities.ts
│   │   ├── events.ts
│   │   ├── wellness.ts
│   │   ├── workouts.ts
│   │   ├── sport-settings.ts
│   │   ├── chats.ts
│   │   ├── weather.ts
│   │   ├── shared-events.ts
│   │   ├── fitness.ts
│   │   └── performance.ts
│   └── generated/
│       └── api.d.ts              # Auto-generated OpenAPI types
├── tests/
│   ├── unit/                     # Unit tests for core modules
│   └── integration/              # Command integration tests
├── api/
│   └── openapi-spec.json         # Pinned Intervals.icu OpenAPI spec
├── context/
│   ├── session_history.md        # Session history log
│   └── project_plan.md           # Project plan with phases and tasks
├── package.json
├── tsconfig.json
├── biome.json
├── SPEC.md                       # Technical specification
├── README.md
└── AGENTS.md                     # This file
```

## Technology stack

| Component | Choice |
|---|---|
| Language | TypeScript 5.x (strict) |
| Runtime | Node.js 24 LTS |
| CLI framework | `commander` |
| API types | `openapi-typescript` |
| HTTP client | `openapi-fetch` |
| Table output | `cli-table3` |
| Config paths | `env-paths` |
| Bundler | `tsup` (esbuild) |
| Single executable | `bun build --compile` |
| Testing | `vitest` |
| Lint + Format | `biome` |
| Validation | `zod` |

## Key conventions

- **Module pattern:** ES modules (`"type": "module"` in `package.json`)
- **Error output** goes to `stderr`; **data output** goes to `stdout`
- **Exit codes:** `0` = success, `1` = any error
- All command modules export a function that receives the Commander `Program` and registers a command group
- JSON input for create/update operations uses the `--file` option (accepts a path or `-` for stdin)
- File uploads (activities, wellness CSV) use positional `<filepath>` arguments with multipart/form-data

## Validation guidance

- The code follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).
- After each code change, run:
  ```bash
  npm run lint        # biome check .
  npm test            # vitest run
  npm run build       # tsup
  ```
- If any of the above surface issues, fix them before proceeding.
- Confirm the README setup steps still reflect actual dependency and environment requirements.
- Confirm the README accurately describes the codebase, as well as the repository structure.

## Trust these instructions

This file is intended to be the authoritative guide for an agent onboarding this repository.
- Use it first for project scope, layout, and validation.
- Avoid extra exploration unless the repo changes or the task cannot be completed with the information here.
