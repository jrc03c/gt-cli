import { describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

import { readFile, writeFile } from "node:fs/promises"
import { loadConfig, saveConfig, CONFIG_FILENAME } from "../../src/lib/config.js"

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

describe("loadConfig", () => {
  it("parses valid JSON", async () => {
    const config = { programs: { test: { id: 1, key: "abc1234" } } }
    mockReadFile.mockResolvedValue(JSON.stringify(config))

    const result = await loadConfig("/project")
    expect(result).toEqual(config)
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILENAME),
      "utf-8"
    )
  })

  it("returns {} on ENOENT", async () => {
    const err = new Error("not found") as NodeJS.ErrnoException
    err.code = "ENOENT"
    mockReadFile.mockRejectedValue(err)

    const result = await loadConfig("/project")
    expect(result).toEqual({})
  })

  it("rethrows other fs errors", async () => {
    const err = new Error("permission denied") as NodeJS.ErrnoException
    err.code = "EACCES"
    mockReadFile.mockRejectedValue(err)

    await expect(loadConfig("/project")).rejects.toThrow(
      `Failed to read ${CONFIG_FILENAME}`
    )
  })

  it("rethrows on invalid JSON", async () => {
    mockReadFile.mockResolvedValue("not json {{{")

    await expect(loadConfig("/project")).rejects.toThrow(
      `Failed to read ${CONFIG_FILENAME}`
    )
  })
})

describe("saveConfig", () => {
  it("writes JSON with 2-space indent and trailing newline", async () => {
    mockWriteFile.mockResolvedValue(undefined)
    const config = { programs: { test: { id: 1, key: "abc1234" } } }

    await saveConfig(config, "/project")

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILENAME),
      JSON.stringify(config, null, 2) + "\n"
    )
  })

  it("writes to the correct path", async () => {
    mockWriteFile.mockResolvedValue(undefined)

    await saveConfig({}, "/my/project")

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/my/project/gt.config.json",
      expect.any(String)
    )
  })
})
