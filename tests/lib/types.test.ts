import { describe, expect, it } from "vitest"
import { getPullFile, getPushFile } from "../../src/types.js"

describe("pull and push files", () => {
  it("use the single path for a plain entry", () => {
    const ref = { file: "a.gt", id: 1 }
    expect(getPullFile(ref)).toBe("a.gt")
    expect(getPushFile(ref)).toBe("a.gt")
  })

  it("both use dist for a split entry, so pull never overwrites a template", () => {
    const ref = { file: { src: "src/a.gt", dist: "dist/a.gt" }, id: 1 }
    expect(getPullFile(ref)).toBe("dist/a.gt")
    expect(getPushFile(ref)).toBe("dist/a.gt")
  })
})
