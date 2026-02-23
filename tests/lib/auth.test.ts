import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as readline from "node:readline"
import { resolveCredentials } from "../../src/lib/auth.js"
import { loadConfig } from "../../src/lib/config.js"

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock("node:readline", async () => {
  const actual = await vi.importActual<typeof readline>("node:readline")
  return {
    ...actual,
    createInterface: vi.fn(actual.createInterface),
  }
})

describe("resolveCredentials", () => {
  let originalIsTTY: boolean | undefined

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY
  })

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    })
  })

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
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")
  })

  it("returns credentials from config file when env vars are not set", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({
      email: "config@example.com",
      password: "config-secret",
    })
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })

    const result = await resolveCredentials()
    expect(result).toEqual({
      email: "config@example.com",
      password: "config-secret",
    })
  })

  it("skips config file when only email is present", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({ email: "config@example.com" })
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")
  })

  it("skips config file when only password is present", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({ password: "config-secret" })
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })

    await expect(resolveCredentials()).rejects.toThrow("No credentials found")
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

  it("prompts for credentials when stdin is a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({})

    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    })

    const mockRl = {
      question: vi.fn(),
      close: vi.fn(),
    }
    mockRl.question
      .mockImplementationOnce((_q: string, cb: (answer: string) => void) =>
        cb("prompted@example.com"),
      )
      .mockImplementationOnce((_q: string, cb: (answer: string) => void) =>
        cb("prompted-secret"),
      )

    vi.mocked(readline.createInterface).mockReturnValue(
      mockRl as unknown as readline.Interface,
    )

    const result = await resolveCredentials()
    expect(result).toEqual({
      email: "prompted@example.com",
      password: "prompted-secret",
    })
    expect(mockRl.close).toHaveBeenCalled()
  })

  it("error message lists all credential methods when not a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD
    vi.mocked(loadConfig).mockResolvedValue({})

    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })

    await expect(resolveCredentials()).rejects.toThrow("gt.config.json")
    await expect(resolveCredentials()).rejects.toThrow("GT_EMAIL")
  })
})
