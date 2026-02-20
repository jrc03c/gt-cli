import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import type { Command } from "commander"

export function registerCompare(program: Command): void {
  program
    .command("compare")
    .description("Compare programs using gt-compare")
    .allowUnknownOption()
    .argument("[args...]", "Arguments to pass to gt-compare")
    .action((args: string[]) => {
      const gtPath = process.env.GT_COMPARE_PATH ?? findGtCompare()

      if (!gtPath) {
        console.error(
          "Could not find gt-compare. Set GT_COMPARE_PATH to the gt-compare directory."
        )
        process.exit(1)
      }

      try {
        execFileSync("./gt-compare", args, {
          cwd: gtPath,
          stdio: "inherit",
        })
      } catch {
        process.exit(1)
      }
    })
}

function findGtCompare(): string | null {
  // Match bash behavior: look for gt-compare relative to the gt script location
  try {
    const gtBin = execFileSync("which", ["gt"], { encoding: "utf-8" }).trim()
    return resolve(dirname(gtBin), "gt-compare")
  } catch {
    return null
  }
}
