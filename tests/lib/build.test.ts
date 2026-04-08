import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  extractErrors,
  getEmbedInfo,
  getRunContents,
  buildProgram,
} from "../../src/lib/build.js"
import type { Credentials, Program } from "../../src/types.js"
import {
  getCredentials,
  createTestProgram,
  deleteTestProgram,
  pushProgramContents,
} from "../helpers.js"

describe("extractErrors", () => {
  it("returns [] for null", () => {
    expect(extractErrors(null)).toEqual([])
  })

  it("returns [] for undefined", () => {
    expect(extractErrors(undefined)).toEqual([])
  })

  it("returns [] for a string", () => {
    expect(extractErrors("hello")).toEqual([])
  })

  it("returns [] for a number", () => {
    expect(extractErrors(42)).toEqual([])
  })

  it("returns [] for an empty array", () => {
    expect(extractErrors([])).toEqual([])
  })

  it("returns [] for an empty object", () => {
    expect(extractErrors({})).toEqual([])
  })

  it("extracts errors from array format", () => {
    const contents = [
      {
        metadata: {
          errors: ["line 1: syntax error", "line 5: unknown keyword"],
        },
      },
    ]
    expect(extractErrors(contents)).toEqual([
      "line 1: syntax error",
      "line 5: unknown keyword",
    ])
  })

  it("extracts errors from object format", () => {
    const contents = {
      "my-program": {
        metadata: { errors: ["error in my-program"] },
      },
    }
    expect(extractErrors(contents)).toEqual(["error in my-program"])
  })

  it("skips array items missing metadata", () => {
    const contents = [
      { something: "else" },
      { metadata: { errors: ["real error"] } },
    ]
    expect(extractErrors(contents)).toEqual(["real error"])
  })

  it("skips array items where metadata has no errors", () => {
    const contents = [
      { metadata: {} },
      { metadata: { errors: ["found it"] } },
    ]
    expect(extractErrors(contents)).toEqual(["found it"])
  })

  it("skips object values missing metadata", () => {
    const contents = {
      "no-meta": { something: "else" },
      "has-meta": { metadata: { errors: ["obj error"] } },
    }
    expect(extractErrors(contents)).toEqual(["obj error"])
  })

  it("skips object values where metadata has no errors", () => {
    const contents = {
      "empty-meta": { metadata: {} },
      "has-errors": { metadata: { errors: ["found"] } },
    }
    expect(extractErrors(contents)).toEqual(["found"])
  })

  it("combines errors from multiple array items", () => {
    const contents = [
      { metadata: { errors: ["err1", "err2"] } },
      { metadata: { errors: ["err3"] } },
    ]
    expect(extractErrors(contents)).toEqual(["err1", "err2", "err3"])
  })

  it("combines errors from multiple object values", () => {
    const contents = {
      a: { metadata: { errors: ["a1"] } },
      b: { metadata: { errors: ["b1", "b2"] } },
    }
    expect(extractErrors(contents)).toEqual(["a1", "b1", "b2"])
  })
})

let creds: Credentials
let testProgram: Program

beforeAll(async () => {
  creds = getCredentials()
  testProgram = await createTestProgram(creds)
  await pushProgramContents(
    testProgram.id,
    "*question: Hello?\n\t*type: text\n\t*save: greeting",
    creds
  )
}, 30_000)

afterAll(async () => {
  if (testProgram) {
    await deleteTestProgram(testProgram.id, creds)
  }
}, 15_000)

describe("getEmbedInfo", () => {
  it("returns run_id and access_key for a real program", async () => {
    const info = await getEmbedInfo(testProgram.key, creds, "production")
    expect(info).toHaveProperty("run_id")
    expect(info).toHaveProperty("access_key")
    expect(typeof info.run_id).toBe("number")
    expect(typeof info.access_key).toBe("string")
  })
})

describe("getRunContents", () => {
  it("returns contents using embed info", async () => {
    const embed = await getEmbedInfo(testProgram.key, creds, "production")
    const contents = await getRunContents(
      embed.run_id,
      embed.access_key,
      creds,
      "production"
    )
    expect(contents).toBeDefined()
    expect(typeof contents).toBe("object")
  })
})

describe("buildProgram", () => {
  it("completes without throwing for a valid program", async () => {
    await expect(
      buildProgram(testProgram.name, testProgram.key, creds, "production")
    ).resolves.toBeUndefined()
  }, 30_000)
})
