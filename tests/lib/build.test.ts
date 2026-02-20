import { describe, expect, it, vi } from "vitest"
import { extractErrors, getEmbedInfo, getRunContents } from "../../src/lib/build.js"

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
      { metadata: { errors: ["line 1: syntax error", "line 5: unknown keyword"] } },
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

vi.mock("../../src/lib/api.js", () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from "../../src/lib/api.js"

const mockApiRequest = vi.mocked(apiRequest)
const creds = { email: "test@example.com", password: "pass" }

describe("getEmbedInfo", () => {
  it("calls /programs/{key}/embed and returns parsed response", async () => {
    const embedInfo = { run_id: 100, access_key: "ak_abc" }
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve(embedInfo),
    } as Response)

    const result = await getEmbedInfo("abc1234", creds, "development")

    expect(mockApiRequest).toHaveBeenCalledWith("/programs/abc1234/embed", {
      credentials: creds,
      environment: "development",
    })
    expect(result).toEqual(embedInfo)
  })
})

describe("getRunContents", () => {
  it("calls /runs/{runId}/contents with access key header", async () => {
    const contents = { data: "some contents" }
    mockApiRequest.mockResolvedValue({
      json: () => Promise.resolve(contents),
    } as Response)

    const result = await getRunContents(100, "ak_abc", creds, "stage")

    expect(mockApiRequest).toHaveBeenCalledWith("/runs/100/contents", {
      credentials: creds,
      environment: "stage",
      headers: { "X-GuidedTrack-Access-Key": "ak_abc" },
    })
    expect(result).toEqual(contents)
  })
})
