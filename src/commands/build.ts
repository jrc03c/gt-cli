import type { Command } from "commander"

export function registerBuild(program: Command): void {
  program
    .command("build")
    .description("Compile programs and report errors")
    .action(async () => {
      console.log("build: not yet implemented")
      process.exit(1)
    })
}
