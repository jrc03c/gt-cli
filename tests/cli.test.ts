import { execFile } from "node:child_process"
import { describe, expect, it } from "vitest"

function run(
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise(resolve => {
    execFile("npx", ["tsx", "src/index.ts", ...args], (error, stdout, stderr) =>
      resolve({
        stdout,
        stderr,
        code: error ? error.code ?? 1 : 0,
      })
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
})
