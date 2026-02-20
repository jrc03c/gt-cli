import type { Command } from "commander"

export function registerPush(program: Command): void {
  program
    .command("push")
    .description("Upload local program files to the server")
    .option("-o, --only <name>", "Push only the specified program")
    .option("-b, --build", "Build after pushing")
    .action(async options => {
      console.log("push: not yet implemented", options)
      process.exit(1)
    })
}
