import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getEnvironment,
  buildAuthHeader,
  apiRequest,
  findProgram,
  listPrograms,
  fetchProgramSource,
} from "../../src/lib/api.js"
import type { Credentials, Program } from "../../src/types.js"

const creds: Credentials = { email: "test@example.com", password: "secret" }

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  global.fetch = mockFetch
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getEnvironment", () => {
  it("defaults to production when GT_ENV is unset", () => {
    delete process.env.GT_ENV
    expect(getEnvironment()).toBe("production")
  })

  it("returns development when GT_ENV is development", () => {
    vi.stubEnv("GT_ENV", "development")
    expect(getEnvironment()).toBe("development")
  })

  it("returns stage when GT_ENV is stage", () => {
    vi.stubEnv("GT_ENV", "stage")
    expect(getEnvironment()).toBe("stage")
  })

  it("returns production when GT_ENV is production", () => {
    vi.stubEnv("GT_ENV", "production")
    expect(getEnvironment()).toBe("production")
  })

  it("throws on invalid GT_ENV", () => {
    vi.stubEnv("GT_ENV", "bogus")
    expect(() => getEnvironment()).toThrow('Invalid GT_ENV: "bogus"')
  })
})

describe("buildAuthHeader", () => {
  it("returns correct Basic auth header", () => {
    const header = buildAuthHeader(creds)
    const expected = Buffer.from("test@example.com:secret").toString("base64")
    expect(header).toBe(`Basic ${expected}`)
  })
})

describe("apiRequest", () => {
  it("builds correct URL for development environment", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/programs.json", {
      credentials: creds,
      environment: "development",
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "https://localhost:3000/programs.json",
      expect.any(Object)
    )
  })

  it("builds correct URL for production environment", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/programs.json", {
      credentials: creds,
      environment: "production",
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.guidedtrack.com/programs.json",
      expect.any(Object)
    )
  })

  it("includes Authorization header", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/test", { credentials: creds, environment: "development" })

    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[1].headers.Authorization).toBe(buildAuthHeader(creds))
  })

  it("sets Content-Type when body is provided", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/test", {
      credentials: creds,
      environment: "development",
      body: { contents: "hello" },
    })

    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[1].headers["Content-Type"]).toBe("application/json")
    expect(callArgs[1].body).toBe(JSON.stringify({ contents: "hello" }))
  })

  it("does not set Content-Type when body is absent", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/test", { credentials: creds, environment: "development" })

    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[1].headers["Content-Type"]).toBeUndefined()
    expect(callArgs[1].body).toBeUndefined()
  })

  it("uses GET by default", async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await apiRequest("/test", { credentials: creds, environment: "development" })

    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[1].method).toBe("GET")
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    })

    await expect(
      apiRequest("/test", { credentials: creds, environment: "development" })
    ).rejects.toThrow("API request failed: 401 Unauthorized")
  })
})

describe("findProgram", () => {
  it("URL-encodes the query", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await findProgram("my program & stuff", creds, "development")

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("query=my%20program%20%26%20stuff")
  })

  it("returns exact name match", async () => {
    const programs: Program[] = [
      { id: 1, name: "test", key: "abc1234" },
      { id: 2, name: "test-2", key: "def5678" },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(programs),
    })

    const result = await findProgram("test", creds, "development")
    expect(result).toEqual({ id: 1, name: "test", key: "abc1234" })
  })

  it("returns null when no exact match", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 1, name: "other", key: "abc1234" }]),
    })

    const result = await findProgram("test", creds, "development")
    expect(result).toBeNull()
  })
})

describe("listPrograms", () => {
  it("fetches /programs.json and returns parsed array", async () => {
    const programs: Program[] = [
      { id: 1, name: "prog1", key: "abc1234" },
      { id: 2, name: "prog2", key: "def5678" },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(programs),
    })

    const result = await listPrograms(creds, "development")

    expect(result).toEqual(programs)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("/programs.json")
  })
})

describe("fetchProgramSource", () => {
  it("extracts textarea content from HTML", async () => {
    const html = `<html><body><textarea name="contents">*question: Hello</textarea></body></html>`
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })

    const result = await fetchProgramSource(123, creds, "development")
    expect(result).toBe("*question: Hello")
  })

  it("strips leading newline from textarea content", async () => {
    const html = `<textarea name="contents">\n*question: Hello</textarea>`
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })

    const result = await fetchProgramSource(123, creds, "development")
    expect(result).toBe("*question: Hello")
  })

  it("decodes HTML entities", async () => {
    const html = `<textarea name="contents">&amp; &lt; &gt; &quot; &#39;</textarea>`
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })

    const result = await fetchProgramSource(123, creds, "development")
    expect(result).toBe(`& < > " '`)
  })

  it("throws when textarea is not found", async () => {
    const html = `<html><body>No textarea here</body></html>`
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })

    await expect(
      fetchProgramSource(123, creds, "development")
    ).rejects.toThrow("Could not extract program source from edit page")
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })

    await expect(
      fetchProgramSource(123, creds, "development")
    ).rejects.toThrow("Failed to fetch program source: 404 Not Found")
  })
})
