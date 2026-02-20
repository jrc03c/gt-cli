import { describe, expect, it, vi } from "vitest"
import { resolveCredentials } from "../../src/lib/auth.js"

describe("resolveCredentials", () => {
  it("returns credentials when both env vars are set", () => {
    vi.stubEnv("GT_EMAIL", "user@example.com")
    vi.stubEnv("GT_PASSWORD", "secret")

    const result = resolveCredentials()
    expect(result).toEqual({ email: "user@example.com", password: "secret" })
  })

  it("throws when GT_EMAIL is missing", () => {
    vi.stubEnv("GT_PASSWORD", "secret")
    delete process.env.GT_EMAIL

    expect(() => resolveCredentials()).toThrow("GT_EMAIL")
  })

  it("throws when GT_PASSWORD is missing", () => {
    vi.stubEnv("GT_EMAIL", "user@example.com")
    delete process.env.GT_PASSWORD

    expect(() => resolveCredentials()).toThrow("GT_PASSWORD")
  })

  it("throws when both env vars are missing", () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD

    expect(() => resolveCredentials()).toThrow()
  })

  it("error message mentions the env var names", () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD

    expect(() => resolveCredentials()).toThrow(/GT_EMAIL.*GT_PASSWORD/)
  })
})
