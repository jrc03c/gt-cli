import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { getLocalGtFiles } from "../../src/lib/files.js"

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "gt-files-test-"))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true })
})

describe("getLocalGtFiles", () => {
  it("returns only .gt files with relative paths, sorted", async () => {
    await writeFile(join(tempDir, "survey.gt"), "")
    await writeFile(join(tempDir, ".env"), "")
    await mkdir(join(tempDir, "sub"))
    await writeFile(join(tempDir, "sub", "nested.gt"), "")
    await writeFile(join(tempDir, "sub", "readme.md"), "")

    const result = await getLocalGtFiles(tempDir)
    expect(result).toEqual(["sub/nested.gt", "survey.gt"])
  })

  it("skips node_modules", async () => {
    await mkdir(join(tempDir, "node_modules"))
    await writeFile(join(tempDir, "node_modules", "hidden.gt"), "")
    await writeFile(join(tempDir, "app.gt"), "")

    const result = await getLocalGtFiles(tempDir)
    expect(result).toEqual(["app.gt"])
  })

  it("returns [] when no .gt files exist", async () => {
    await writeFile(join(tempDir, ".env"), "")
    await writeFile(join(tempDir, ".gitignore"), "")

    const result = await getLocalGtFiles(tempDir)
    expect(result).toEqual([])
  })
})
