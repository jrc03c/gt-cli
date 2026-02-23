import { describe, expect, it, vi } from "vitest"
import { resolveCredentials } from "../../src/lib/auth.js"
import { loadConfig } from "../../src/lib/config.js"

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
    vi.mocked(loadConfig).mockResolvedValue({})
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("returns credentials from config file when env vars are not set", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({
      email: "config@example.com",
      password: "config-secret",
    })
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "config@example.com", password: "config-secret" })

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("skips config file when only email is present", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({ email: "config@example.com" })
    const original = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")

    Object.defineProperty(process.stdin, "isTTY", { value: original, configurable: true })
  })

  it("env vars take priority over config file", async () => {
    vi.stubEnv("GT_EMAIL", "env@example.com")
    vi.stubEnv("GT_PASSWORD", "env-secret")
    vi.mocked(loadConfig).mockResolvedValue({
      email: "config@example.com",
      password: "config-secret",
    })

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "env@example.com", password: "env-secret" })
  })
})
