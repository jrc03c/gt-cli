import { describe, expect, it, vi } from "vitest"

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
}))

import { readdir } from "node:fs/promises"
import { getLocalFiles } from "../../src/lib/files.js"

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
