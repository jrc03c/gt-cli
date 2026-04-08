import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, rm, readFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { loadConfig, saveConfig, CONFIG_FILENAME } from "../../src/lib/config.js"

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "gt-config-test-"))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true })
})

describe("loadConfig", () => {
  it("parses valid JSON", async () => {
    const config = { programs: { test: { id: 1, key: "abc1234" } } }
    const { writeFile } = await import("node:fs/promises")
    await writeFile(
      join(tempDir, CONFIG_FILENAME),
      JSON.stringify(config)
    )

    const result = await loadConfig(tempDir)
    expect(result).toEqual(config)
  })

  it("returns {} on ENOENT", async () => {
    const result = await loadConfig(tempDir)
    expect(result).toEqual({})
  })

  it("rethrows on invalid JSON", async () => {
    const { writeFile } = await import("node:fs/promises")
    await writeFile(join(tempDir, CONFIG_FILENAME), "not json {{{")

    await expect(loadConfig(tempDir)).rejects.toThrow(
      `Failed to read ${CONFIG_FILENAME}`
    )
  })
})

describe("saveConfig", () => {
  it("writes JSON with 2-space indent and trailing newline", async () => {
    const config = { programs: { test: { id: 1, key: "abc1234" } } }

    await saveConfig(config, tempDir)

    const raw = await readFile(join(tempDir, CONFIG_FILENAME), "utf-8")
    expect(raw).toBe(JSON.stringify(config, null, 2) + "\n")
  })

  it("writes to the correct path", async () => {
    await saveConfig({}, tempDir)

    const raw = await readFile(join(tempDir, CONFIG_FILENAME), "utf-8")
    expect(raw).toBe("{}\n")
  })
})
