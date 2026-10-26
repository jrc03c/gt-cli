import { describe, expect, it } from "vitest"
import {
  assignPaths,
  mirrorPath,
  parseRelatedPrograms,
  planMirror,
  type MirrorIndex,
} from "../../src/lib/mirror.js"
import type { Program } from "../../src/types.js"

function program(
  key: string,
  name: string,
  updatedAt = "2026-01-01T00:00:00Z",
): Program {
  return { id: key.length, key, name, updated_at: updatedAt }
}

describe("mirrorPath", () => {
  it("keeps slashes as directory separators and appends .gt", () => {
    expect(mirrorPath("@jrc03c/math/dot")).toBe("@jrc03c/math/dot.gt")
  })

  it("replaces characters that are invalid in file names", () => {
    expect(mirrorPath("Clearer Thinking | Report Errors")).toBe(
      "Clearer Thinking _ Report Errors.gt",
    )
    expect(mirrorPath('a: b? c* d" e<f>g\\h')).toBe("a_ b_ c_ d_ e_f_g_h.gt")
    expect(mirrorPath("tab\there")).toBe("tab_here.gt")
  })

  it("trims spaces and trailing dots from each segment", () => {
    expect(mirrorPath(" spaced / trail. ")).toBe("spaced/trail.gt")
  })

  it("replaces empty, dot and dot-dot segments", () => {
    expect(mirrorPath("/leading")).toBe("_/leading.gt")
    expect(mirrorPath("a//b")).toBe("a/_/b.gt")
    expect(mirrorPath("..")).toBe("_.gt")
    expect(mirrorPath("a/./b")).toBe("a/_/b.gt")
  })
})

describe("assignPaths", () => {
  it("maps each program to its sanitized path", () => {
    const paths = assignPaths([program("k1", "a/b"), program("k2", "c")])
    expect(paths.get("k1")).toBe("a/b.gt")
    expect(paths.get("k2")).toBe("c.gt")
  })

  it("disambiguates collisions with the program key, case-insensitively", () => {
    const paths = assignPaths([
      program("k1", "A/b"),
      program("k2", "a/B"),
      program("k3", "a: b"),
      program("k4", "a_ b"),
      program("k5", "other"),
    ])
    expect(paths.get("k1")).toBe("A/b~k1.gt")
    expect(paths.get("k2")).toBe("a/B~k2.gt")
    expect(paths.get("k3")).toBe("a_ b~k3.gt")
    expect(paths.get("k4")).toBe("a_ b~k4.gt")
    expect(paths.get("k5")).toBe("other.gt")
  })
})

describe("parseRelatedPrograms", () => {
  it("deduplicates an array", () => {
    expect(parseRelatedPrograms(["a", "b", "a"])).toEqual(["a", "b"])
  })

  it("parses the JSON string form the single-program endpoint returns", () => {
    expect(parseRelatedPrograms('["a","a","b"]')).toEqual(["a", "b"])
  })

  it("returns an empty list for missing or malformed values", () => {
    expect(parseRelatedPrograms(undefined)).toEqual([])
    expect(parseRelatedPrograms("not json")).toEqual([])
    expect(parseRelatedPrograms(42 as unknown as string)).toEqual([])
  })
})

describe("planMirror", () => {
  const indexed: MirrorIndex = {
    programs: {
      k1: {
        id: 1,
        name: "a",
        path: "a.gt",
        updated_at: "2026-01-01T00:00:00Z",
        related_programs: [],
        sha256: "hash-a",
        mirrored_at: "2026-01-02T00:00:00Z",
      },
      k2: {
        id: 2,
        name: "b",
        path: "b.gt",
        updated_at: "2026-01-01T00:00:00Z",
        related_programs: [],
        sha256: "hash-b",
        mirrored_at: "2026-01-02T00:00:00Z",
      },
    },
  }

  it("fetches new programs and leaves unchanged ones alone", () => {
    const plan = planMirror({
      programs: [program("k1", "a"), program("k2", "b"), program("k3", "c")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "hash-b"],
      ]),
    })
    expect(plan.fetch.map(f => f.key)).toEqual(["k3"])
    expect(plan.unchanged).toEqual(["k1", "k2"])
    expect(plan.delete).toEqual([])
    expect(plan.skipped).toEqual([])
  })

  it("refetches when the server timestamp changed or the file is missing", () => {
    const plan = planMirror({
      programs: [
        program("k1", "a", "2026-02-01T00:00:00Z"),
        program("k2", "b"),
      ],
      index: indexed,
      localHashes: new Map([["a.gt", "hash-a"]]),
    })
    expect(plan.fetch.map(f => f.key).sort()).toEqual(["k1", "k2"])
  })

  it("skips a locally modified file unless forced", () => {
    const args = {
      programs: [
        program("k1", "a", "2026-02-01T00:00:00Z"),
        program("k2", "b"),
      ],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "edited"],
        ["b.gt", "hash-b"],
      ]),
    }
    const plan = planMirror(args)
    expect(plan.fetch).toEqual([])
    expect(plan.skipped).toEqual([
      { key: "k1", path: "a.gt", reason: "locally modified" },
    ])

    const forced = planMirror({ ...args, force: true })
    expect(forced.fetch.map(f => f.key)).toEqual(["k1"])
    expect(forced.skipped).toEqual([])
  })

  it("refetches everything with full, still honoring local edits", () => {
    const plan = planMirror({
      programs: [program("k1", "a"), program("k2", "b")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "edited"],
      ]),
      full: true,
    })
    expect(plan.fetch.map(f => f.key)).toEqual(["k1"])
    expect(plan.skipped.map(s => s.key)).toEqual(["k2"])
  })

  it("deletes files for programs that left the listing, unless edited", () => {
    const plan = planMirror({
      programs: [program("k1", "a")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "hash-b"],
      ]),
    })
    expect(plan.delete).toEqual(["b.gt"])

    const edited = planMirror({
      programs: [program("k1", "a")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "edited"],
      ]),
    })
    expect(edited.delete).toEqual([])
    expect(edited.skipped).toEqual([
      { key: "k2", path: "b.gt", reason: "locally modified, not deleted" },
    ])
  })

  it("moves a renamed program: deletes the old path and fetches the new one", () => {
    const plan = planMirror({
      programs: [program("k1", "a"), program("k2", "renamed")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "hash-b"],
      ]),
    })
    expect(plan.fetch.map(f => [f.key, f.path])).toEqual([["k2", "renamed.gt"]])
    expect(plan.delete).toEqual(["b.gt"])
  })

  it("does not delete a path that another program now occupies", () => {
    // k2 renamed to "a", k1 renamed to "b": paths swap.
    const plan = planMirror({
      programs: [program("k1", "b"), program("k2", "a")],
      index: indexed,
      localHashes: new Map([
        ["a.gt", "hash-a"],
        ["b.gt", "hash-b"],
      ]),
    })
    expect(plan.delete).toEqual([])
    expect(plan.fetch.map(f => f.key).sort()).toEqual(["k1", "k2"])
  })
})
