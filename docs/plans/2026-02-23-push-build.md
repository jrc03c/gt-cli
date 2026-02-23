# Push --build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the `push --build` flag so that pushed programs are built and errors reported.

**Architecture:** Extract the build-one-program logic from the `build` command into a shared `buildProgram()` function in `src/lib/build.ts`. Both the `build` command and `push --build` call it. The push command collects successfully-pushed programs and builds each one after all pushes complete.

**Tech Stack:** TypeScript, Vitest, existing `getEmbedInfo`/`getRunContents`/`extractErrors`/`pollJob` helpers.

---

### Task 1: Extract buildProgram into src/lib/build.ts

**Files:**
- Modify: `src/lib/build.ts:1-61`
- Modify: `tests/lib/build.test.ts`

**Step 1: Write the failing test**

Add to the end of `tests/lib/build.test.ts`, after the existing `getRunContents` describe block. The test needs access to `pollJob` mock, so also mock `../../src/lib/jobs.js`.

```typescript
vi.mock("../../src/lib/jobs.js", () => ({
  pollJob: vi.fn(),
}))

import { pollJob } from "../../src/lib/jobs.js"
import { buildProgram } from "../../src/lib/build.js"

const mockPollJob = vi.mocked(pollJob)

describe("buildProgram", () => {
  it("gets embed info, triggers build, polls job, and reports errors", async () => {
    // getEmbedInfo call
    mockApiRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ run_id: 100, access_key: "ak_abc" }),
      } as Response)
      // First getRunContents — returns a job to poll
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ job: 42 }),
      } as Response)
      // Second getRunContents — returns build results
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve([{ metadata: { errors: ["line 1: syntax error"] } }]),
      } as Response)

    mockPollJob.mockResolvedValue({ id: 42, status: "completed" })

    const logs: string[] = []
    const origLog = console.log
    const origWrite = process.stdout.write
    console.log = (...args: unknown[]) => logs.push(args.join(" "))
    process.stdout.write = ((msg: string) => {
      logs.push(msg)
      return true
    }) as typeof process.stdout.write

    await buildProgram("my-prog", "abc1234", creds, "development")

    console.log = origLog
    process.stdout.write = origWrite

    expect(mockApiRequest).toHaveBeenCalledWith("/programs/abc1234/embed", {
      credentials: creds,
      environment: "development",
    })
    expect(mockPollJob).toHaveBeenCalledWith(42, creds, {
      environment: "development",
    })
    expect(logs.some(l => l.includes("Building"))).toBe(true)
    expect(logs.some(l => l.includes("syntax error"))).toBe(true)
  })

  it("reports no errors when build is clean", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ run_id: 200, access_key: "ak_def" }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ job: 99 }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ metadata: {} }]),
      } as Response)

    mockPollJob.mockResolvedValue({ id: 99, status: "completed" })

    const logs: string[] = []
    const origLog = console.log
    const origWrite = process.stdout.write
    console.log = (...args: unknown[]) => logs.push(args.join(" "))
    process.stdout.write = ((msg: string) => {
      logs.push(msg)
      return true
    }) as typeof process.stdout.write

    await buildProgram("clean-prog", "def5678", creds, "development")

    console.log = origLog
    process.stdout.write = origWrite

    expect(logs.some(l => l.includes("No errors"))).toBe(true)
  })

  it("reports no changes when there is no job", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ run_id: 300, access_key: "ak_ghi" }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      } as Response)
      // Still fetches contents to check errors
      .mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      } as Response)

    const logs: string[] = []
    const origLog = console.log
    const origWrite = process.stdout.write
    console.log = (...args: unknown[]) => logs.push(args.join(" "))
    process.stdout.write = ((msg: string) => {
      logs.push(msg)
      return true
    }) as typeof process.stdout.write

    await buildProgram("no-changes", "ghi9012", creds, "development")

    console.log = origLog
    process.stdout.write = origWrite

    expect(logs.some(l => l.includes("No changes"))).toBe(true)
    expect(mockPollJob).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/lib/build.test.ts`
Expected: FAIL — `buildProgram` is not exported from `build.ts`.

**Step 3: Write the implementation**

Add to the end of `src/lib/build.ts` (after `extractErrors`), and add `pollJob` import at the top:

Add this import at line 2 (after the existing `apiRequest` import):
```typescript
import { pollJob } from "./jobs.js"
```

Add this function at the end of the file:
```typescript
export async function buildProgram(
  name: string,
  key: string,
  credentials: Credentials,
  environment: GtEnvironment
): Promise<void> {
  console.log(`>> Building project "${name}" (key: ${key})`)

  const embed = await getEmbedInfo(key, credentials, environment)

  const contents = await getRunContents(
    embed.run_id,
    embed.access_key,
    credentials,
    environment
  )

  const jobId =
    contents && typeof contents === "object" && !Array.isArray(contents)
      ? (contents as Record<string, unknown>).job
      : null

  if (jobId && typeof jobId === "number") {
    process.stdout.write(`>>>> Waiting for new build (job: ${jobId})... `)
    await pollJob(jobId, credentials, { environment })
    console.log("done")
  } else {
    console.log(">>>> No changes to build")
  }

  // Fetch contents again to check for errors
  const result = await getRunContents(
    embed.run_id,
    embed.access_key,
    credentials,
    environment
  )

  const errors = extractErrors(result)

  if (errors.length === 0) {
    console.log(">>>> No errors")
  } else {
    console.log(">>>> Found compilation errors:")
    console.log(errors.join("\n"))
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/lib/build.test.ts`
Expected: ALL tests pass.

**Step 5: Commit**

```bash
git add src/lib/build.ts tests/lib/build.test.ts
git commit -m "feat: extract buildProgram helper from build command"
```

---

### Task 2: Refactor build command to use buildProgram

**Files:**
- Modify: `src/commands/build.ts:30-82`

**Step 1: Refactor the build command**

Replace the body of the `for` loop in `src/commands/build.ts` (lines 30-82) with a call to `buildProgram`. The new loop body should be:

```typescript
      for (const project of projects) {
        const found = await findProgram(project, credentials, environment)

        if (!found) {
          console.error(`>> Program "${project}" not found, skipping...`)
          continue
        }

        await buildProgram(project, found.key, credentials, environment)
      }
```

Update the imports: replace the individual build helper imports with just `buildProgram`:

Replace lines 6-10:
```typescript
import {
  extractErrors,
  getEmbedInfo,
  getRunContents,
} from "../lib/build.js"
```

With:
```typescript
import { buildProgram } from "../lib/build.js"
```

Remove the `pollJob` import (line 11) since it's no longer used directly.

**Step 2: Run the full test suite**

Run: `pnpm test`
Expected: ALL tests pass. No behavior change.

**Step 3: Commit**

```bash
git add src/commands/build.ts
git commit -m "refactor: use buildProgram helper in build command"
```

---

### Task 3: Wire up push --build

**Files:**
- Modify: `src/commands/push.ts`

**Step 1: Implement push --build**

In `src/commands/push.ts`:

Add the `buildProgram` import (after line 4):
```typescript
import { buildProgram } from "../lib/build.js"
```

Collect successfully-pushed programs. Before the `for` loop (after line 27), add:
```typescript
      const pushed: { name: string; key: string }[] = []
```

Inside the `for` loop, after `console.log("done")` (after line 48), add:
```typescript
        pushed.push({ name: filename, key: found.key })
```

Replace the placeholder block (lines 51-54):
```typescript
      if (options.build) {
        console.error("build after push: not yet implemented")
        process.exit(1)
      }
```

With:
```typescript
      if (options.build && pushed.length > 0) {
        console.log("\nBuilding pushed programs...")
        for (const { name, key } of pushed) {
          await buildProgram(name, key, credentials, environment)
        }
      }
```

**Step 2: Run the full test suite**

Run: `pnpm test`
Expected: ALL tests pass.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Smoke test**

Run: `pnpm dev push --help`
Expected: Shows `--build` flag in help output.

**Step 5: Commit**

```bash
git add src/commands/push.ts
git commit -m "feat: implement push --build flag"
```

---

### Task 4: Full verification

**Step 1: Run the complete test suite**

Run: `pnpm test`
Expected: All tests pass.

**Step 2: Run lint**

Run: `npx eslint src/ tests/`
Expected: No errors.

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Smoke test**

Run: `pnpm dev push --help`
Expected: Shows `-b, --build` option.
