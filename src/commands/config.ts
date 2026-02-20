import type { Command } from "commander"
import { loadConfig } from "../lib/config.js"

export function registerConfig(program: Command): void {
  program
    .command("config")
    .description("Print current project configuration")
    .action(async () => {
      const config = await loadConfig()
      console.log(JSON.stringify(config, null, 2))
    })
}
