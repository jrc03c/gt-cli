import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { resolveCredentials } from "../../src/lib/auth.js"
import { CONFIG_FILENAME } from "../../src/lib/config.js"

describe("resolveCredentials", () => {
  let savedEmail: string | undefined
  let savedPassword: string | undefined

  beforeAll(() => {
    savedEmail = process.env.GT_EMAIL
    savedPassword = process.env.GT_PASSWORD
  })

  afterAll(() => {
    if (savedEmail !== undefined) process.env.GT_EMAIL = savedEmail
    else delete process.env.GT_EMAIL
    if (savedPassword !== undefined) process.env.GT_PASSWORD = savedPassword
    else delete process.env.GT_PASSWORD
  })

  it("returns credentials when both env vars are set", async () => {
    process.env.GT_EMAIL = "user@example.com"
    process.env.GT_PASSWORD = "secret"

    const result = await resolveCredentials()
    expect(result).toEqual({ email: "user@example.com", password: "secret" })
  })

  it("throws when no credentials are available and stdin is not a TTY", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD

    const originalIsTTY = process.stdin.isTTY
    const originalCwd = process.cwd()
    const tempDir = await mkdtemp(join(tmpdir(), "gt-auth-test-"))

    try {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      })
      process.chdir(tempDir)

      await expect(resolveCredentials()).rejects.toThrow("No credentials found")
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
      process.chdir(originalCwd)
      await rm(tempDir, { recursive: true })
    }
  })

  it("returns credentials from config file when env vars are not set", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD

    const originalIsTTY = process.stdin.isTTY
    const originalCwd = process.cwd()
    const tempDir = await mkdtemp(join(tmpdir(), "gt-auth-test-"))

    try {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      })

      await writeFile(
        join(tempDir, CONFIG_FILENAME),
        JSON.stringify({
          email: "config@example.com",
          password: "config-secret",
        })
      )
      process.chdir(tempDir)

      const result = await resolveCredentials()
      expect(result).toEqual({
        email: "config@example.com",
        password: "config-secret",
      })
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
      process.chdir(originalCwd)
      await rm(tempDir, { recursive: true })
    }
  })

  it("env vars take priority over config file", async () => {
    process.env.GT_EMAIL = "env@example.com"
    process.env.GT_PASSWORD = "env-secret"

    const originalCwd = process.cwd()
    const tempDir = await mkdtemp(join(tmpdir(), "gt-auth-test-"))

    try {
      await writeFile(
        join(tempDir, CONFIG_FILENAME),
        JSON.stringify({
          email: "config@example.com",
          password: "config-secret",
        })
      )
      process.chdir(tempDir)

      const result = await resolveCredentials()
      expect(result).toEqual({
        email: "env@example.com",
        password: "env-secret",
      })
    } finally {
      process.chdir(originalCwd)
      await rm(tempDir, { recursive: true })
    }
  })

  it("error message lists all credential methods", async () => {
    delete process.env.GT_EMAIL
    delete process.env.GT_PASSWORD

    const originalIsTTY = process.stdin.isTTY
    const originalCwd = process.cwd()
    const tempDir = await mkdtemp(join(tmpdir(), "gt-auth-test-"))

    try {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      })
      process.chdir(tempDir)

      await expect(resolveCredentials()).rejects.toThrow("gt.config.json")
      await expect(resolveCredentials()).rejects.toThrow("GT_EMAIL")
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
      process.chdir(originalCwd)
      await rm(tempDir, { recursive: true })
    }
  })
})
