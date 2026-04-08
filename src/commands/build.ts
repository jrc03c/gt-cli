import type { Command } from "commander"
import { getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { buildProgram } from "../lib/build.js"
import { loadConfig } from "../lib/config.js"

export function registerBuild(program: Command): void {
  program
    .command("build")
    .description("Compile programs and report errors")
    .option("-o, --only <key>", "Build only the specified program (by key)")
    .action(async options => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const config = await loadConfig()
      const programs = config.programs ?? {}

      let entries = Object.entries(programs)

      if (options.only) {
        const ref = programs[options.only]
        if (!ref) {
          console.error(
            `Program with key "${options.only}" not found in config.`
          )
          process.exit(1)
        }
        entries = [[options.only, ref]]
      }

      if (entries.length === 0) {
        console.error("No programs in config. Run `gt init` first.")
        process.exit(1)
      }

      for (const [key, ref] of entries) {
        await buildProgram(ref.file, key, credentials, environment)
      }
    })
}
