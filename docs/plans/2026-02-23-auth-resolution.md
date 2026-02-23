# Auth Resolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the auth credential resolution chain: env vars -> config file -> interactive prompt.

**Architecture:** `resolveCredentials()` becomes async and checks three sources in order. A `promptCredentials()` helper uses `node:readline` for interactive input. TTY detection gates the interactive fallback.

**Tech Stack:** Node.js `node:readline`, Vitest mocking, existing `loadConfig()` from `src/lib/config.ts`.

---

### Task 1: Update existing tests to async

**Files:**
- Modify: `tests/lib/auth.test.ts`

**Step 1: Update tests to use async/await**

Replace the test file contents with async versions of each test. The function under test will become async, so all calls need `await` and test functions need `async`.

```typescript
import { describe, expect, it, vi } from "vitest"
import { resolveCredentials } from "../../src/lib/auth.js"

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}))

describe("resolveCredentials", () => {
  it("returns credentials when both env vars are set", async () => {
    vi.stubEnv("GT_EMAIL", "user@example.com")
    vi.stubEnv("GT_PASSWORD", "secret")

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "user@example.com", password: "secret" })
  })

  it("throws when no credentials are available and stdin is not a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/lib/auth.test.ts`
Expected: FAIL — `resolveCredentials()` is still synchronous, `await` on a non-promise returns the value, but the mock of `loadConfig` won't be wired in yet. The "throws when no credentials" test should fail because the function still throws synchronously with the old message.

**Step 3: Commit**

```bash
git add tests/lib/auth.test.ts
git commit -m "test: update auth tests to async for credential resolution chain"
```

---

### Task 2: Make resolveCredentials async with config file fallback

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Write the failing test for config file fallback**

Add to `tests/lib/auth.test.ts`:

```typescript
import { loadConfig } from "../../src/lib/config.js"

// Add inside the describe block:

  it("returns credentials from config file when env vars are not set", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({
      email: "config@example.com",
      password: "config-secret",
    })
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "config@example.com", password: "config-secret" })

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("skips config file when only email is present", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({ email: "config@example.com" })
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("env vars take priority over config file", async () => {
    vi.stubEnv("GT_EMAIL", "env@example.com")
    vi.stubEnv("GT_PASSWORD", "env-secret")
    vi.mocked(loadConfig).mockResolvedValue({
      email: "config@example.com",
      password: "config-secret",
    })

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "env@example.com", password: "env-secret" })
  })
```

**Step 2: Run tests to verify the new ones fail**

Run: `pnpm test -- tests/lib/auth.test.ts`
Expected: FAIL — config fallback not implemented yet.

**Step 3: Implement async resolveCredentials with config fallback**

Replace `src/lib/auth.ts` with:

```typescript
import type { Credentials } from "../types.js"
import { loadConfig } from "./config.js"

export async function resolveCredentials(): Promise<Credentials> {
  // Priority 1: Environment variables
  const email = process.env.GT_EMAIL
  const password = process.env.GT_PASSWORD

  if (email && password) {
    return { email, password }
  }

  // Priority 2: Config file
  const config = await loadConfig()
  if (config.email && config.password) {
    return { email: config.email, password: config.password }
  }

  // Priority 3: Interactive prompt (next task)

  throw new Error(
    "No credentials found. Provide credentials via:\n" +
      "  - GT_EMAIL and GT_PASSWORD environment variables\n" +
      "  - email and password fields in gt.config.json\n" +
      "  - Run in a terminal for interactive prompt"
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/lib/auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add config file fallback to credential resolution"
```

---

### Task 3: Add interactive prompt fallback

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `tests/lib/auth.test.ts`

**Step 1: Write the failing tests for interactive prompt**

Add to `tests/lib/auth.test.ts`:

```typescript
import * as readline from "node:readline"

// Add inside the describe block:

  it("prompts for credentials when stdin is a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({})

    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true })

    const mockRl = {
      question: vi.fn(),
      close: vi.fn(),
    }
    // First call: email, second call: password
    mockRl.question
      .mockImplementationOnce((_q, cb) => cb("prompted@example.com"))
      .mockImplementationOnce((_q, cb) => cb("prompted-secret"))

    vi.spyOn(readline, "createInterface").mockReturnValue(mockRl as any)

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "prompted@example.com", password: "prompted-secret" })
    expect(mockRl.close).toHaveBeenCalled()

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("throws with helpful message when stdin is not a TTY and no credentials found", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({})

    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("gt.config.json")
    await expect(resolveCredentials()).rejects.toThrow("GT_EMAIL")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })
```

**Step 2: Run tests to verify the new ones fail**

Run: `pnpm test -- tests/lib/auth.test.ts`
Expected: FAIL — prompt logic not implemented.

**Step 3: Implement interactive prompt**

Update `src/lib/auth.ts` to add the prompt helpers and wire them in:

```typescript
import { createInterface } from "node:readline"
import type { Credentials } from "../types.js"
import { loadConfig } from "./config.js"

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

function promptSecret(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const originalWrite = process.stdout.write.bind(process.stdout)
  let muted = false

  process.stdout.write = ((...args: Parameters<typeof process.stdout.write>) => {
    if (muted) {
      // Only suppress character echo, allow the initial question through
      return true
    }
    return originalWrite(...args)
  }) as typeof process.stdout.write

  return new Promise(resolve => {
    rl.question(question, answer => {
      muted = false
      process.stdout.write = originalWrite
      originalWrite("\n")
      rl.close()
      resolve(answer)
    })
    muted = true
  })
}

async function promptCredentials(): Promise<Credentials> {
  const email = await prompt("GT email: ")
  const password = await promptSecret("GT password: ")
  return { email, password }
}

export async function resolveCredentials(): Promise<Credentials> {
  // Priority 1: Environment variables
  const email = process.env.GT_EMAIL
  const password = process.env.GT_PASSWORD

  if (email && password) {
    return { email, password }
  }

  // Priority 2: Config file
  const config = await loadConfig()
  if (config.email && config.password) {
    return { email: config.email, password: config.password }
  }

  // Priority 3: Interactive prompt
  if (process.stdin.isTTY) {
    return promptCredentials()
  }

  throw new Error(
    "No credentials found. Provide credentials via:\n" +
      "  - GT_EMAIL and GT_PASSWORD environment variables\n" +
      "  - email and password fields in gt.config.json\n" +
      "  - Run in a terminal for interactive prompt"
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/lib/auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add interactive prompt fallback to credential resolution"
```

---

### Task 4: Update all command call sites

**Files:**
- Modify: `src/commands/push.ts:15`
- Modify: `src/commands/pull.ts:18`
- Modify: `src/commands/create.ts:12`
- Modify: `src/commands/build.ts:20`
- Modify: `src/commands/init.ts:13`
- Modify: `src/commands/program.ts:29,49,67,90,121,155,209,227,245`
- Modify: `src/commands/request.ts:21`

**Step 1: Update each call site from `resolveCredentials()` to `await resolveCredentials()`**

In every command file, change:
```typescript
const credentials = resolveCredentials()
```
to:
```typescript
const credentials = await resolveCredentials()
```

All action handlers are already `async`, so no other changes are needed.

**Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all 61+ tests pass.

**Step 3: Commit**

```bash
git add src/commands/push.ts src/commands/pull.ts src/commands/create.ts src/commands/build.ts src/commands/init.ts src/commands/program.ts src/commands/request.ts
git commit -m "refactor: await async resolveCredentials in all commands"
```

---

### Task 5: Run full verification

**Step 1: Run the complete test suite**

Run: `pnpm test`
Expected: All tests PASS.

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors.

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 4: Verify manually (smoke test)**

Run: `pnpm dev push --help`
Expected: Help output prints without errors, confirming the async change doesn't break CLI startup.
