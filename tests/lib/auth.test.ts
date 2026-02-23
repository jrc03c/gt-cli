import { describe, expect, it, vi } from "vitest"
import { resolveCredentials } from "../../src/lib/auth.js"

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}))

describe("resolveCredentials", () => {
  it("returns credentials when both env vars are set", async () => {
    vi.stubEnv("GT_EMAIL", "user@example.com")
    vi.stubEnv("GT_PASSWORD", "secret")

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "user@example.com", password: "secret" })
  })

  it("throws when no credentials are available and stdin is not a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })
})
