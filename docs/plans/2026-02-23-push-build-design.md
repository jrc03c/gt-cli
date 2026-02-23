# Push --build Design

## Problem

The `push --build` flag is defined but not implemented. After pushing programs, users want to trigger a build and see compilation errors without running a separate command.

## Design

### Behavior

After successfully pushing programs, `--build` triggers a build for each program that was pushed. Only pushed programs are built (not everything in `.gt_projects`).

### Changes

#### `src/lib/build.ts`

Extract the build-one-program logic into a shared function:

```typescript
export async function buildProgram(
  name: string,
  key: string,
  credentials: Credentials,
  environment: GtEnvironment
): Promise<void>
```

This encapsulates the sequence: get embed info, fetch run contents, poll job if needed, fetch contents again, extract and print errors.

#### `src/commands/build.ts`

Refactor to call `buildProgram()` in its loop. No behavior change.

#### `src/commands/push.ts`

- Collect successfully-pushed programs (name + key) during the push loop
- After pushing, if `--build` is set, call `buildProgram()` for each
- Remove the placeholder error

### Error handling

- Programs not found during push are skipped for build
- Build errors are printed but don't exit the process (matches existing `build` command)
