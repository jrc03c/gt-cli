import { describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
}))

import { readdir } from "node:fs/promises"
import { getLocalFiles, getLocalGtFiles } from "../../src/lib/files.js"

const mockReaddir = vi.mocked(readdir)

describe("getLocalFiles", () => {
  it("returns file names, excludes directories", async () => {
    mockReaddir.mockResolvedValue([
      { name: "program.gt", isFile: () => true, isDirectory: () => false },
      { name: "subdir", isFile: () => false, isDirectory: () => true },
      { name: "notes.txt", isFile: () => true, isDirectory: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>)

    const result = await getLocalFiles("/some/dir")
    expect(result).toEqual(["program.gt", "notes.txt"])
    expect(mockReaddir).toHaveBeenCalledWith("/some/dir", { withFileTypes: true })
  })

  it("returns [] for empty directory", async () => {
    mockReaddir.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof readdir>>
    )

    const result = await getLocalFiles("/empty")
    expect(result).toEqual([])
  })
})

describe("getLocalGtFiles", () => {
  it("returns only .gt files with relative paths, sorted", async () => {
    // Root dir
    mockReaddir.mockResolvedValueOnce([
      { name: "survey.gt", isFile: () => true, isDirectory: () => false },
      { name: ".env", isFile: () => true, isDirectory: () => false },
      { name: "sub", isFile: () => false, isDirectory: () => true },
    ] as unknown as Awaited<ReturnType<typeof readdir>>)

    // sub/ dir
    mockReaddir.mockResolvedValueOnce([
      { name: "nested.gt", isFile: () => true, isDirectory: () => false },
      { name: "readme.md", isFile: () => true, isDirectory: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>)

    const result = await getLocalGtFiles("/project")
    expect(result).toEqual(["sub/nested.gt", "survey.gt"])
  })

  it("skips node_modules", async () => {
    mockReaddir.mockResolvedValueOnce([
      {
        name: "node_modules",
        isFile: () => false,
        isDirectory: () => true,
      },
      { name: "app.gt", isFile: () => true, isDirectory: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>)

    const result = await getLocalGtFiles("/project")
    expect(result).toEqual(["app.gt"])
    // readdir should only have been called once (root), not for node_modules
    expect(mockReaddir).toHaveBeenCalledTimes(1)
  })

  it("returns [] when no .gt files exist", async () => {
    mockReaddir.mockResolvedValueOnce([
      { name: ".env", isFile: () => true, isDirectory: () => false },
      { name: ".gitignore", isFile: () => true, isDirectory: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>)

    const result = await getLocalGtFiles("/project")
    expect(result).toEqual([])
  })
})
