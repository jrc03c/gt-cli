import type { Command } from "commander"

export function registerCreate(program: Command): void {
  program
    .command("create")
    .description("Create new programs on the server")
    .action(async () => {
      console.log("create: not yet implemented")
      process.exit(1)
    })
}
