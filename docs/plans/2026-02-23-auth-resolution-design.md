# Auth Resolution Design

## Problem

`resolveCredentials()` only supports env vars (`GT_EMAIL`/`GT_PASSWORD`). The two remaining fallbacks described in CLAUDE.md — config file and interactive prompt — are stubbed as TODOs.

## Design

### Priority chain

1. **Env vars** (`GT_EMAIL` + `GT_PASSWORD`) — unchanged
2. **Config file** (`email` + `password` fields in `gt.config.json`) — read via existing `loadConfig()`
3. **Interactive prompt** — `node:readline`, only when `process.stdin.isTTY` is truthy

If no credentials are found and stdin is not a TTY, throw an error listing all three credential sources.

### Changes

#### `src/lib/auth.ts`

- `resolveCredentials()` becomes **async** (returns `Promise<Credentials>`)
- Add Priority 2: call `loadConfig()`, check for `email`/`password` fields
- Add Priority 3: `promptCredentials()` helper using `node:readline`
  - Check `process.stdin.isTTY` before prompting; throw if not interactive
  - `promptSecret()` helper masks password input by muting stdout during entry
- Non-TTY error message lists all credential methods

#### Callers (7 command files)

All commands that call `resolveCredentials()` will `await` the result. These are: `push.ts`, `pull.ts`, `create.ts`, `build.ts`, `init.ts`, `program.ts`, `request.ts`. Their command action handlers are already async, so adding `await` is the only change needed.

#### No new dependencies

`node:readline` is built-in. No changes to `package.json`.

#### Types

`Credentials` and `GtConfig` are unchanged — `GtConfig` already has optional `email`/`password` fields.

### Testing

- Existing env var tests updated for async (`await`)
- New tests: config file fallback (mock `loadConfig`)
- New tests: interactive prompt (mock `node:readline`)
- New tests: non-TTY error path (mock `process.stdin.isTTY`)
