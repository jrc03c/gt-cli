# gt-cli

A TypeScript CLI for the unofficial, undocumented [GuidedTrack](https://guidedtrack.com) web API.

## Project overview

This project rewrites the existing `gt` bash script as a fully-featured TypeScript CLI tool. The bash script (`./gt`) serves as the reference implementation and documents the known API surface. The goal is a well-structured, well-documented CLI that's easy to extend as we discover more of the API.

### Current status

The TypeScript rewrite is feature-complete for Phases 1–3 of the command roadmap (with the exception of `program data`). All commands from the bash script have been ported and extended with additional commands from the previous Node.js version.

## Architecture

### Tech stack

- **Language**: TypeScript (strict mode)
- **CLI framework**: [Commander.js](https://github.com/tj/commander.js/)
- **HTTP client**: Node.js built-in `fetch`
- **Bundler**: [tsup](https://github.com/egoist/tsup) (esbuild-based)
- **Dev runner**: [tsx](https://github.com/privatenumber/tsx)
- **Testing**: [Vitest](https://vitest.dev/)
- **Package manager**: pnpm
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier

### Project structure

```text
gt-cli/
├── src/
│   ├── index.ts          # Entry point, Commander program setup
│   ├── commands/          # One file per command (push.ts, create.ts, etc.)
│   ├── lib/               # Shared utilities
│   │   ├── api.ts         # HTTP client, request helpers
│   │   ├── auth.ts        # Authentication (config, env vars, interactive)
│   │   ├── build.ts       # Build/compile helpers
│   │   ├── config.ts      # gt.config.json reading/writing
│   │   ├── files.ts       # File reading utilities
│   │   └── jobs.ts        # Job polling logic
│   └── types.ts           # Shared type definitions
├── tests/                 # Vitest test files (*.test.ts)
├── gt                     # Original bash script (reference implementation)
├── gt.config.json         # Per-project config (user-created, gitignored)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### Design principles

- **Start simple, grow incrementally.** Each command is a standalone module. Add new commands by adding a file to `commands/` and registering it in `index.ts`.
- **Respect the bash script.** The bash script is the source of truth for known API behavior. Don't guess at API endpoints — verify against the script or test against a live environment.
- **Fail clearly.** Show helpful error messages. Distinguish between auth failures, network errors, and API errors.

## Development

### Setup

```bash
pnpm install
```

### Run in development

```bash
pnpm dev [command] [args]     # Runs src/index.ts via tsx
```

### Build

```bash
pnpm build                    # Bundles to dist/ via tsup
```

### Test

```bash
pnpm test                     # Run all tests via Vitest
pnpm test:watch               # Watch mode
```

### Lint and format

```bash
pnpm lint                     # ESLint
pnpm format                   # Prettier
```

### Install locally (for testing the built CLI)

```bash
pnpm link --global            # Makes `gt` available globally
```

## Code conventions

### Style

Prettier handles formatting. Key settings (from `.prettierrc.json`):

- No semicolons
- Double quotes
- 2-space indentation
- Arrow parens: avoid when possible

### TypeScript

- Use `strict: true` in tsconfig.
- Prefer `interface` over `type` for object shapes.
- Export types from `types.ts`; import them where needed.
- Use named exports, not default exports.

### Error handling

- Throw typed errors with clear messages.
- Catch at the command level and print user-friendly output.
- Exit with non-zero codes on failure.

### File naming

- `kebab-case` for all files and directories.
- Command files match their command name: `push.ts`, `create.ts`, etc.

## Configuration

### gt.config.json

Per-project config file. Created by `gt init` (or manually). Gitignored.

```json
{
  "programs": {
    "my-program": {
      "id": 12345,
      "key": "abc1234"
    }
  }
}
```

### Authentication

Auth is resolved in this priority order:

1. **Environment variables**: `GT_EMAIL` and `GT_PASSWORD`
2. **Config file**: `email` and `password` fields in `gt.config.json`
3. **Interactive prompt**: Falls back to prompting if neither is set

### Environment

The target GuidedTrack environment is set via the `GT_ENV` environment variable:

- `development` (default): `https://localhost:3000`
- `stage`: `https://guidedtrack-stage.herokuapp.com`
- `production`: `https://www.guidedtrack.com`

Production requires interactive confirmation before destructive operations.

## GuidedTrack API reference

This documents what we know about the undocumented API, derived from the bash script.

### Authentication

All API requests use HTTP Basic Auth (`email:password`, base64-encoded).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programs.json` | List all programs |
| `GET` | `/programs.json?query={name}` | Search programs by name |
| `PUT` | `/programs/{id}.json` | Update program contents |
| `POST` | `/programs` | Create a new program |
| `GET` | `/delayed_jobs/{job_id}` | Poll job status |
| `GET` | `/programs/{key}/embed` | Get embed info (run_id, access_key) |
| `GET` | `/runs/{run_id}/contents` | Get program contents (requires `X-GuidedTrack-Access-Key` header) |

### Key concepts

- **Program ID**: Numeric identifier from the edit page URL (e.g., `9197`)
- **Program key**: 7-character string from the public run URL (e.g., `i1qsozk`)
- **Jobs**: Some operations (create, build) are asynchronous. The API returns a `job_id` and you poll `/delayed_jobs/{job_id}` until status is no longer `"running"`.
- **Access key**: Required header (`X-GuidedTrack-Access-Key`) for fetching run contents.

## Command roadmap

### Phase 1 — Core (matching bash script)

- [x] `push` — Upload local program files to server (includes `--build` flag)
- [x] `create` — Create new programs
- [x] `build` — Compile programs and report errors
- [x] `compare` — Delegate to gt-compare tool

### Phase 2 — Essential additions

- [x] `pull` — Download program source from server
- [x] `init` — Create gt.config.json, scan for program files
- [x] `config` — Print current project config
- [x] `program list` — List all programs
- [x] `program get` — Fetch program metadata
- [x] `program source` — Fetch program source code
- [x] `program find` — Search programs by name

### Phase 3 — Full feature set

- [x] `program delete` — Delete a program (with confirmation + `-y` flag)
- [ ] `program data` / `program csv` — Download program data
- [x] `program view` / `program preview` / `program run` — Open browser to program pages
- [x] `program build` — Build a specific program by name/ID/key
- [x] `request` — Generic API request

## Git workflow

- Main branch: `main`
- Feature branches off `main`
- Keep commits small and focused
