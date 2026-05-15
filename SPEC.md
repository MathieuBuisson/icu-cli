# Technical Proposal: icu-cli

## 1. Project Structure

```text
icu-cli/
├── src/
│   ├── index.ts                  # Entry point
│   ├── cli.ts                    # Commander program setup
│   ├── config.ts                 # Config file read/write
│   ├── auth.ts                   # Auth header resolution
│   ├── client.ts                 # openapi-fetch client factory
│   ├── output.ts                 # TTY-aware output formatting
│   ├── input.ts                  # --file / stdin input reader
│   ├── commands/
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
│   ├── unit/
│   │   ├── config.test.ts
│   │   ├── auth.test.ts
│   │   ├── output.test.ts
│   │   └── input.test.ts
│   └── integration/
│       └── commands/
│           └── ...
├── api/
│   └── openapi-spec.json         # Pinned OpenAPI spec
├── package.json
├── tsconfig.json
├── biome.json
└── README.md
```

---

## 2. Technology Stack

| Component | Choice | Rationale |
|---|---|---|
| Language | TypeScript 5.x (strict) | Type safety, developer experience |
| Runtime | Node.js 24 LTS | User's installed runtime, LTS stability |
| CLI framework | `commander` | Most popular, well-documented, subcommand support |
| API types | `openapi-typescript` | Auto-generates TS types from pinned OpenAPI spec |
| HTTP client | `openapi-fetch` | Typed fetch wrapper consuming generated types |
| Table output | `cli-table3` | Mature, zero-dep table renderer |
| Config paths | `env-paths` | Cross-platform XDG-compliant config directories |
| Bundler | `tsup` (esbuild) | Fast single-file bundling |
| Single executable | `bun build --compile` | Cross-compilation for Win/Linux/macOS |
| Testing | `vitest` | Fast, native TS, Node-compatible |
| Lint + Format | `biome` | Single Rust tool, near-instant |

---

## 3. Dependencies (`package.json`)

```jsonc
{
  "name": "icu-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": { "icu": "./dist/index.js" },
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup",
    "generate": "openapi-typescript api/openapi-spec.json -o src/generated/api.d.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "compile:win": "bun build ./dist/index.js --compile --target=bun-windows-x64 --outfile icu-win-x64.exe",
    "compile:linux": "bun build ./dist/index.js --compile --target=bun-linux-x64 --outfile icu-linux-x64",
    "compile:macos": "bun build ./dist/index.js --compile --target=bun-darwin-arm64 --outfile icu-macos-arm64"
  },
  "dependencies": {
    "cli-table3": "...",
    "commander": "...",
    "env-paths": "...",
    "openapi-fetch": "..."
  },
  "devDependencies": {
    "@biomejs/biome": "...",
    "openapi-typescript": "...",
    "tsup": "...",
    "tsx": "...",
    "typescript": "...",
    "vitest": "..."
  }
}
```

---

## 4. CLI Interface

### 4.1 Global Options

```text
usage: icu [options] <command> [subcommand] [args]

options:
  --athlete <id>    Override athlete ID (default: config or ICU_ATHLETE_ID env)
  --format <fmt>    Output format: json, table, plain (default: table if TTY, json otherwise)
  --version         Show version and exit
  --help            Show help and exit
```

### 4.2 Top-Level Commands

| Command | Description |
|---|---|
| `icu whoami` | Show authenticated athlete info; optionally save `athleteId` to config |
| `icu config set <key> <value>` | Set a config value |
| `icu config get <key>` | Get a config value |
| `icu config list` | List all config values |
| `icu auth status` | Verify auth credentials and show status |

### 4.3 Command Groups

#### `icu athletes`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `get [id]` | `GET /api/v1/athlete/{id}` | |
| `update [id]` | `PUT /api/v1/athlete/{id}` | `--file` |
| `profile [id]` | `GET /api/v1/athlete/{id}/profile` | |
| `training-plan [id]` | `GET /api/v1/athlete/{id}/training-plan` | |
| `summary [id]` | `GET /api/v1/athlete/{id}/athlete-summary` | `--start`, `--end` |

> `[id]` defaults to configured `athleteId` for all athlete-scoped commands.

#### `icu activities`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/activities` | `--oldest` (required), `--newest`, `--limit`, `--fields` |
| `get <activityId>` | `GET /api/v1/activity/{id}` | `--intervals` |
| `create` | `POST /api/v1/athlete/{id}/activities/manual` | `--file` |
| `upload` | `POST /api/v1/athlete/{id}/activities` | `<filepath>`, `--name`, `--description` |
| `update <activityId>` | `PUT /api/v1/activity/{id}` | `--file` |
| `delete <activityId>` | `DELETE /api/v1/activity/{id}` | |
| `search` | `GET /api/v1/athlete/{id}/activities/search` | `--query` (required), `--limit` |
| `streams <activityId>` | `GET /api/v1/activity/{id}/streams` | `--types` |
| `intervals <activityId>` | `GET /api/v1/activity/{id}/intervals` | |
| `download-fit <activityId>` | `GET /api/v1/activity/{id}/fit-file` | `--output` |
| `download-gpx <activityId>` | `GET /api/v1/activity/{id}/gpx-file` | `--output` |

#### `icu events`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/events{format}` | `--oldest`, `--newest`, `--category`, `--limit`, `--csv` |
| `get <eventId>` | `GET /api/v1/athlete/{id}/events/{eventId}` | |
| `create` | `POST /api/v1/athlete/{id}/events` | `--file` |
| `update <eventId>` | `PUT /api/v1/athlete/{id}/events/{eventId}` | `--file` |
| `delete <eventId>` | `DELETE /api/v1/athlete/{id}/events/{eventId}` | `--others` |
| `download <eventId>` | `GET /api/v1/athlete/{id}/events/{eventId}/download` | `--ext` (zwo/mrc/erg/fit), `--output` |

#### `icu wellness`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/wellness` | `--oldest`, `--newest`, `--fields` |
| `get <date>` | `GET /api/v1/athlete/{id}/wellness/{date}` | |
| `update <date>` | `PUT /api/v1/athlete/{id}/wellness/{date}` | `--file` |
| `upload` | `POST /api/v1/athlete/{id}/wellness` | `<filepath>` (CSV) |

#### `icu workouts`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/workouts` | |
| `get <workoutId>` | `GET /api/v1/athlete/{id}/workouts/{workoutId}` | |
| `create` | `POST /api/v1/athlete/{id}/workouts` | `--file` |
| `update <workoutId>` | `PUT /api/v1/athlete/{id}/workouts/{workoutId}` | `--file` |
| `delete <workoutId>` | `DELETE /api/v1/athlete/{id}/workouts/{workoutId}` | |
| `download <workoutId>` | `POST /api/v1/athlete/{id}/download-workout` | `--ext`, `--output` |

#### `icu sport-settings`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/sport-settings` | |
| `get <id>` | `GET /api/v1/athlete/{id}/sport-settings/{id}` | |
| `create` | `POST /api/v1/athlete/{id}/sport-settings` | `--file` |
| `update <id>` | `PUT /api/v1/athlete/{id}/sport-settings/{id}` | `--file` |
| `delete <id>` | `DELETE /api/v1/athlete/{id}/sport-settings/{id}` | |

#### `icu chats`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/chats` | |
| `get <chatId>` | `GET /api/v1/chats/{id}` | |
| `messages <chatId>` | `GET /api/v1/chats/{id}/messages` | `--before-id`, `--limit` |
| `send` | `POST /api/v1/chats/send-message` | `--file` |

#### `icu weather`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `forecast` | `GET /api/v1/athlete/{id}/weather-forecast` | |
| `config-get` | `GET /api/v1/athlete/{id}/weather-config` | |
| `config-update` | `PUT /api/v1/athlete/{id}/weather-config` | `--file` |

#### `icu shared-events`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `get <id>` | `GET /api/v1/shared-event/{id}` | |

#### `icu fitness`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `list` | `GET /api/v1/athlete/{id}/fitness-model-events` | |

#### `icu performance`

| Subcommand | API Endpoint | Key Options |
|---|---|---|
| `power` | `GET /api/v1/athlete/{id}/power-curves` | `--type` (required), `--curves`, `--newest` |
| `pace` | `GET /api/v1/athlete/{id}/pace-curves` | `--type`, `--curves`, `--newest` |
| `hr` | `GET /api/v1/athlete/{id}/hr-curves` | `--type`, `--curves`, `--newest` |

---

## 5. Module Responsibilities

### `cli.ts`
- Create commander `Program` with name, version, description
- Register global options (`--athlete`, `--format`)
- Register all command groups and top-level commands
- Parse `process.argv`
- Catch unhandled errors and exit with code 1

### `config.ts`
- Resolve config directory using `env-paths('icu-cli')`
- Read/write `config.json` (create directory and file on first write)
- Schema: `{ athleteId?: string, defaultFormat?: 'json' | 'table' | 'plain' }`
- Resolve `athleteId` with precedence: `--athlete` flag > `ICU_ATHLETE_ID` env > config file

### `auth.ts`
- Read `ICU_API_KEY` and `ICU_ACCESS_TOKEN` from environment
- Bearer token takes precedence if both are set
- API Key uses HTTP Basic auth: `Authorization: Basic base64(API_KEY:)`
- Return auth headers object or throw if neither credential is available

### `client.ts`
- Create `openapi-fetch` client with base URL `https://intervals.icu`
- Attach auth headers from `auth.ts`
- Export typed client for use in command modules

### `output.ts`
- Detect TTY via `process.stdout.isTTY`
- Apply format from `--format` flag > config `defaultFormat` > TTY default
- `json`: `JSON.stringify(data, null, 2)`
- `table`: render with `cli-table3` (column selection per resource type)
- `plain`: tab-separated values, no headers

### `input.ts`
- Read from file path or stdin based on `--file` option
- `--file -`: read from `process.stdin`
- `--file <path>`: read from filesystem
- Parse as JSON and return typed object

### Command modules (`commands/*.ts`)
- Each exports a function that receives the commander `Program` and registers a command group
- Map CLI arguments/options to API client calls
- Pass response data to `output.ts` for formatting
- Handle API errors with user-friendly messages

---

## 6. Authentication Flow

```text
1. Read ICU_ACCESS_TOKEN from env
2. If set → use Bearer token (Authorization: Bearer <token>)
3. Else read ICU_API_KEY from env
4. If set → use Basic auth (Authorization: Basic base64("API_KEY:<key>"))
5. Else → print error "No credentials found. Set ICU_API_KEY or ICU_ACCESS_TOKEN." and exit 1
```

---

## 7. Athlete ID Resolution

Many API endpoints require an athlete ID. Resolution order:

```text
1. --athlete <id> flag (highest priority)
2. ICU_ATHLETE_ID environment variable
3. athleteId from config file
4. If none found → print error with instructions to run "icu config set athleteId <id>" and exit 1
```

---

## 8. Output Formatting

### Format Resolution

```text
1. --format flag (highest priority)
2. defaultFormat from config file
3. If stdout is TTY → table
4. Else → json
```

### Table Column Definitions

Each resource type defines its own column set for table output. Example:

| Resource | Table Columns |
|---|---|
| Activity | id, date, type, name, moving_time, distance, load |
| Event | id, date, category, type, name, moving_time |
| Wellness | date, ctl, atl, weight, restingHR, hrv, sleepSecs |
| Workout | id, name, type, moving_time, load |

---

## 9. File Input Handling

```text
If --file is "-":
  Read all of process.stdin as UTF-8
  Parse as JSON
Else if --file is a path:
  Read file as UTF-8
  Parse as JSON
Else:
  No input (error if command requires it)
```

For file upload commands (`activities upload`, `wellness upload`):
- Accept a positional `<filepath>` argument
- Read the file as binary
- Submit as multipart/form-data

---

## 10. Error Handling

| Scenario | Action | Exit Code |
|---|---|---|
| No auth credentials | Print error with setup instructions | `1` |
| No athlete ID configured | Print error with setup instructions | `1` |
| HTTP 401 Unauthorized | Print "Authentication failed. Check your credentials." | `1` |
| HTTP 403 Forbidden | Print "Access denied for this resource." | `1` |
| HTTP 404 Not Found | Print "Resource not found: {id}" | `1` |
| HTTP 4xx/5xx | Print status code and API error message | `1` |
| Network error | Print "Network error: {message}" | `1` |
| Invalid JSON input | Print "Invalid JSON in input: {message}" | `1` |
| File not found | Print "File not found: {path}" | `1` |
| Missing required option | Commander auto-prints usage | `1` |
| Successful operation | Print formatted output | `0` |

Error output goes to `stderr`. Data output goes to `stdout`.

---

## 11. Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Any error (auth, API, input, network) |

---

## 12. API Client Generation

### Process

1. Download the OpenAPI spec from `https://intervals.icu/api/v1/docs`
2. Save to `api/openapi-spec.json` (pinned, version-controlled)
3. Run `openapi-typescript` to generate types:
   ```bash
   npx openapi-typescript api/openapi-spec.json -o src/generated/api.d.ts
   ```
4. Import types and use with `openapi-fetch`:
   ```typescript
   import createClient from 'openapi-fetch';
   import type { paths } from './generated/api.js';

   const client = createClient<paths>({
     baseUrl: 'https://intervals.icu',
     headers: getAuthHeaders(),
   });
   ```

### Updating the Spec

```bash
npm run generate   # Regenerate types from pinned spec
```

When the Intervals.icu API changes, manually update the pinned spec and regenerate.

---

## 13. Packaging

### npm Distribution

```bash
npm publish
# Users install with:
npm install -g icu-cli
```

The `bin` field in `package.json` points to `./dist/index.js`.

### Single Executable Distribution

```bash
# Bundle first (tsup → dist/index.js)
npm run build
# Then compile for each target using Bun's built-in single-executable compiler.
# Requires Bun installed (https://bun.sh). This is the only step that uses Bun.
npm run compile:win     # → icu-win-x64.exe
npm run compile:linux   # → icu-linux-x64
npm run compile:macos   # → icu-macos-arm64
```

### CI/CD Pipeline (GitHub Actions)

**On pull request:**
1. Install dependencies
2. Run `biome check`
3. Run `vitest`
4. Build (`tsup`)

**On tag push (`v*`):**
1. All PR checks
2. Compile single executables for all 3 targets
3. Create GitHub Release with binaries and checksums
4. Publish to npm

---

## 14. Verification Plan

### Automated Tests

- **`config.test.ts`**
  - Read/write config file
  - Config directory creation
  - Athlete ID resolution precedence

- **`auth.test.ts`**
  - API key → Basic auth header
  - Bearer token → Authorization header
  - Bearer precedence over API key
  - Missing credentials error

- **`output.test.ts`**
  - JSON formatting
  - Table formatting
  - Plain formatting
  - TTY detection

- **`input.test.ts`**
  - Read from file path
  - Read from stdin
  - Invalid JSON handling

- **Command integration tests**
  - Mock HTTP responses
  - Verify correct API endpoints called
  - Verify output formatting

### Manual Tests

- `icu whoami` shows athlete info
- `icu config set athleteId <id>` persists to config file
- `icu activities list --oldest 2026-01-01` returns activities
- `icu events create --file event.json` creates an event
- `echo '{"category":"NOTE",...}' | icu events create --file -` works via stdin
- `icu workouts download <id> --ext zwo --output workout.zwo` saves file
- `icu activities upload activity.fit` uploads a file
- `--format json` always outputs JSON regardless of TTY
- Missing `ICU_API_KEY` prints helpful error
- Standalone binary works on Windows, Linux, macOS without Node.js installed
