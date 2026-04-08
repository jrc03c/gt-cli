import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  getEnvironment,
  buildAuthHeader,
  apiRequest,
  findProgram,
  listPrograms,
  fetchProgramSource,
} from "../../src/lib/api.js"
import type { Credentials, Program } from "../../src/types.js"
import {
  getCredentials,
  createTestProgram,
  deleteTestProgram,
  pushProgramContents,
  sleep,
} from "../helpers.js"

let creds: Credentials
let testProgram: Program

beforeAll(async () => {
  creds = getCredentials()
  testProgram = await createTestProgram(creds)
  await pushProgramContents(
    testProgram.id,
    '*question: What is your name?\n\t*type: text\n\t*save: participant_name',
    creds
  )
  // Wait for the content push to propagate on the server
  for (let attempt = 0; attempt < 10; attempt++) {
    const source = await fetchProgramSource(testProgram.id, creds, "production")
    if (source.includes("*question:")) return
    await sleep(2000)
  }
}, 60_000)

afterAll(async () => {
  if (testProgram) {
    await deleteTestProgram(testProgram.id, creds)
  }
}, 15_000)

describe("getEnvironment", () => {
  it("defaults to production when GT_ENV is unset", () => {
    const saved = process.env.GT_ENV
    delete process.env.GT_ENV
    expect(getEnvironment()).toBe("production")
    process.env.GT_ENV = saved
  })

  it("throws on invalid GT_ENV", () => {
    const saved = process.env.GT_ENV
    process.env.GT_ENV = "bogus"
    expect(() => getEnvironment()).toThrow('Invalid GT_ENV: "bogus"')
    process.env.GT_ENV = saved
  })
})

describe("buildAuthHeader", () => {
  it("returns correct Basic auth header", () => {
    const header = buildAuthHeader({ email: "a@b.com", password: "secret" })
    const expected = Buffer.from("a@b.com:secret").toString("base64")
    expect(header).toBe(`Basic ${expected}`)
  })
})

describe("apiRequest", () => {
  it("succeeds with valid credentials against production", async () => {
    const response = await apiRequest("/programs.json", {
      credentials: creds,
      environment: "production",
    })
    expect(response.ok).toBe(true)
  })

  it("throws on invalid credentials", async () => {
    await expect(
      apiRequest("/programs.json", {
        credentials: { email: "nobody@invalid.test", password: "wrong" },
        environment: "production",
      })
    ).rejects.toThrow("API request failed")
  })
})

describe("listPrograms", () => {
  it("returns an array of programs", async () => {
    const programs = await listPrograms(creds, "production")
    expect(Array.isArray(programs)).toBe(true)
    expect(programs.length).toBeGreaterThan(0)

    const found = programs.find(p => p.id === testProgram.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe(testProgram.name)
  })
})

describe("findProgram", () => {
  it("returns exact name match", async () => {
    const result = await findProgram(testProgram.name, creds, "production")
    expect(result).not.toBeNull()
    expect(result!.id).toBe(testProgram.id)
  })

  it("returns null when no exact match", async () => {
    const result = await findProgram(
      "gt-cli-nonexistent-program-" + Date.now(),
      creds,
      "production"
    )
    expect(result).toBeNull()
  })
})

describe("fetchProgramSource", () => {
  it("returns program source code", async () => {
    const source = await fetchProgramSource(testProgram.id, creds, "production")
    expect(source).toContain("*question:")
    expect(source).toContain("participant_name")
  })

  it("throws on nonexistent program", async () => {
    await expect(
      fetchProgramSource(999999999, creds, "production")
    ).rejects.toThrow()
  })
})
