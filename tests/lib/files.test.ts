import { describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
}))

import { readdir } from "node:fs/promises"
import { getLocalGtFiles } from "../../src/lib/files.js"

const mockReaddir = vi.mocked(readdir)

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
