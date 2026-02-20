import type { Command } from "commander"

export function registerCompare(program: Command): void {
  program
    .command("compare")
    .description("Compare programs using gt-compare")
    .action(async () => {
      console.log("compare: not yet implemented")
      process.exit(1)
    })
}
