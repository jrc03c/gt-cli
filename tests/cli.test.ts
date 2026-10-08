import { execFile } from "node:child_process"
import { describe, expect, it } from "vitest"

function run(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise(resolve => {
    execFile("npx", ["tsx", "src/index.ts", ...args], (error, stdout, stderr) =>
      resolve({
        stdout,
        stderr,
        code: error ? (error.code ?? 1) : 0,
      }),
    )
  })
}

describe("gt cli", () => {
  it("prints version with --version", async () => {
    const result = await run(["--version"])
    expect(result.stdout.trim()).toBe("0.1.0")
    expect(result.code).toBe(0)
  })

  it("lists all commands with --help", async () => {
    const result = await run(["--help"])
    expect(result.stdout).toContain("push")
    expect(result.stdout).toContain("create")
    expect(result.stdout).toContain("build")
    expect(result.code).toBe(0)
  })

  it("exits with error for unknown command", async () => {
    const result = await run(["nonexistent"])
    expect(result.code).not.toBe(0)
  })

  it("offers --bundle and --output on program source", async () => {
    const result = await run(["program", "source", "--help"])
    expect(result.stdout).toContain("--bundle")
    expect(result.stdout).toContain("--output")
    expect(result.code).toBe(0)
  })

  it("rejects --output without --bundle on program source", async () => {
    const result = await run(["program", "source", "some-name", "-o", "x.zip"])
    expect(result.stderr).toMatch(/--output requires --bundle/i)
    expect(result.code).not.toBe(0)
  })

  it("offers --id, --key, --file, --file-src, --file-dist, and --pull on link", async () => {
    const result = await run(["link", "--help"])
    expect(result.stdout).toContain("--id")
    expect(result.stdout).toContain("--key")
    expect(result.stdout).toContain("--file ")
    expect(result.stdout).toContain("--file-src")
    expect(result.stdout).toContain("--file-dist")
    expect(result.stdout).toContain("--pull")
    expect(result.code).toBe(0)
  })

  it("rejects --file combined with --file-src on link", async () => {
    const result = await run([
      "link",
      "--id",
      "123",
      "--file",
      "a.gt",
      "--file-src",
      "src/a.gt",
    ])
    expect(result.stderr).toMatch(/--file cannot be combined with/i)
    expect(result.code).not.toBe(0)
  })

  it("rejects --file combined with --file-dist on link", async () => {
    const result = await run([
      "link",
      "--id",
      "123",
      "--file",
      "a.gt",
      "--file-dist",
      "dist/a.gt",
    ])
    expect(result.stderr).toMatch(/--file cannot be combined with/i)
    expect(result.code).not.toBe(0)
  })

  it("rejects identical --file-src and --file-dist on link", async () => {
    const result = await run([
      "link",
      "--id",
      "123",
      "--file-src",
      "a.gt",
      "--file-dist",
      "a.gt",
    ])
    expect(result.stderr).toMatch(/same path/i)
    expect(result.code).not.toBe(0)
  })

  it("rejects more than one identifier on link", async () => {
    const result = await run(["link", "some-name", "--id", "123"])
    expect(result.stderr).toMatch(/only one of/i)
    expect(result.code).not.toBe(0)
  })

  it("rejects a non-numeric --id on link", async () => {
    const result = await run(["link", "--id", "abc"])
    expect(result.stderr).toMatch(/invalid program id/i)
    expect(result.code).not.toBe(0)
  })
})
