# icu-cli

A cross-platform TypeScript CLI for the [Intervals.icu](https://intervals.icu) API.
Query, schedule, and automate training data from the command line.

## Features

- **11 API service groups** — athletes, activities, events, wellness, workouts, sport settings, chats, weather, shared events, fitness, and performance curves
- **Cross-platform** — runs on Windows x64, Linux x64, and macOS arm64
- **Multiple output formats** — TTY-aware defaults with `--format json|table|plain`
- **Dual auth support** — API key (Basic auth) and OAuth bearer token
- **Type-safe API client** — auto-generated from the Intervals.icu OpenAPI spec
- **Flexible input** — read JSON from files (`--file path`) or stdin (`--file -`)
- **Zero-dependency distribution** — available as a standalone single executable (no Node.js required)

## Technology Stack

| Component | Choice |
|---|---|
| Language | TypeScript 5.x (strict) |
| Runtime | Node.js 24 LTS |
| CLI framework | [commander](https://github.com/tj/commander.js) |
| API client | [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) + [openapi-fetch](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch) |
| Table output | [cli-table3](https://github.com/cli-table/cli-table3) |
| Bundler | [tsup](https://github.com/egoist/tsup) |
| Single executable | [Bun](https://bun.sh) `build --compile` |
| Testing | [vitest](https://vitest.dev) |
| Lint + Format | [Biome](https://biomejs.dev) |

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) 24 LTS or later
- An [Intervals.icu](https://intervals.icu) account with an API key (Settings → Developer Settings)

### Setup

**Via npm:**

```bash
npm install -g icu-cli
```

**Via standalone binary:**

Download the latest release for your platform from [GitHub Releases](https://github.com/MathieuBuisson/icu-cli/releases):
- `icu-win-x64.exe` — Windows
- `icu-linux-x64` — Linux
- `icu-macos-arm64` — macOS (Apple Silicon)

No Node.js installation required for standalone binaries.

**Configure authentication:**

```bash
# Set your API key (from Intervals.icu → Settings → Developer Settings)
export ICU_API_KEY=your_api_key_here

# Or use an OAuth bearer token (takes precedence if both are set)
export ICU_ACCESS_TOKEN=your_token_here
```

**Configure your athlete ID:**

```bash
icu config set athleteId i12345
```

**Verify setup:**

```bash
icu whoami
```

## Usage

```
icu [options] <command> [subcommand] [args]

Options:
  --athlete <id>    Override athlete ID
  --format <fmt>    Output format: json, table, plain
  --version         Show version
  --help            Show help
```

### Examples

```bash
# Show authenticated athlete info
icu whoami

# List recent activities
icu activities list --oldest 2026-01-01 --newest 2026-01-31

# Search activities by name or tag
icu activities search --query "#threshold"

# Get a specific activity
icu activities get i12345:abc123

# Upload an activity file
icu activities upload activity.fit

# List upcoming events
icu events list --oldest 2026-05-01 --newest 2026-05-31

# Create an event from a JSON file
icu events create --file event.json

# Create an event from stdin
echo '{"category":"NOTE","start_date_local":"2026-05-15","name":"Rest day"}' | icu events create --file -

# Download a workout in Zwift format
icu workouts download 123 --ext zwo --output workout.zwo

# Get today's wellness record
icu wellness get 2026-05-10

# Update wellness from JSON
echo '{"restingHR":48,"weight":78.2}' | icu wellness update 2026-05-10 --file -

# Get weather forecast
icu weather forecast

# View power curves for the past year
icu performance power --type Ride --curves 1y

# Force JSON output (useful for scripting)
icu activities list --oldest 2026-01-01 --format json
```

## Project Structure

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
├── package.json
├── tsconfig.json
├── biome.json
├── SPEC.md                       # Technical specification
└── README.md
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests use [vitest](https://vitest.dev) with mocked HTTP responses for API interactions.

## Code Quality

```bash
# Lint and format check
npm run lint

# Lint and format with auto-fix
npm run lint:fix

# Format only
npm run format
```

Linting and formatting are handled by [Biome](https://biomejs.dev).

## License

[MIT](LICENSE)
