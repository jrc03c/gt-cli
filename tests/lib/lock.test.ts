import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  LOCK_FILENAME,
  checkDrift,
  loadLock,
  saveLock,
} from "../../src/lib/lock.js"

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "gt-lock-test-"))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true })
})

describe("loadLock / saveLock", () => {
  it("returns an empty lock when the file is missing", async () => {
    expect(await loadLock(tempDir)).toEqual({ programs: {} })
  })

  it("round-trips entries sorted by key with a trailing newline", async () => {
    await saveLock(
      {
        programs: {
          zzz: { id: 2, name: "z", updated_at: "u2", synced_at: "s2" },
          aaa: { id: 1, name: "a", updated_at: "u1", synced_at: "s1" },
        },
      },
      tempDir,
    )
    const raw = await readFile(join(tempDir, LOCK_FILENAME), "utf-8")
    expect(raw.endsWith("\n")).toBe(true)
    expect(Object.keys(JSON.parse(raw).programs)).toEqual(["aaa", "zzz"])
    expect((await loadLock(tempDir)).programs.aaa.updated_at).toBe("u1")
  })

  it("rethrows on invalid JSON", async () => {
    await writeFile(join(tempDir, LOCK_FILENAME), "{{{")
    await expect(loadLock(tempDir)).rejects.toThrow(LOCK_FILENAME)
  })
})

describe("checkDrift", () => {
  it("reports unknown when the program has no lock entry", () => {
    expect(checkDrift(undefined, "2026-01-01T00:00:00Z")).toEqual({
      status: "unknown",
    })
  })

  it("reports ok when the server timestamp matches the lock", () => {
    const entry = { id: 1, name: "a", updated_at: "t1", synced_at: "s" }
    expect(checkDrift(entry, "t1")).toEqual({ status: "ok" })
  })

  it("reports drift when the server timestamp differs", () => {
    const entry = { id: 1, name: "a", updated_at: "t1", synced_at: "s" }
    expect(checkDrift(entry, "t2")).toEqual({
      status: "drift",
      locked: "t1",
      server: "t2",
    })
  })
})
