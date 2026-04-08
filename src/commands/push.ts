import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import { apiRequest, getEnvironment } from "../lib/api.js"
import { buildProgram } from "../lib/build.js"
import { resolveCredentials } from "../lib/auth.js"
import { loadConfig } from "../lib/config.js"
import { type ProgramRef, getPushFile } from "../types.js"

export function registerPush(program: Command): void {
  program
    .command("push")
    .description("Upload local program files to the server")
    .option("-o, --only <key>", "Push only the specified program (by key)")
    .option("--no-build", "Skip building after push")
    .action(async options => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const config = await loadConfig()
      const programs = config.programs ?? {}

      let entries: [string, ProgramRef][]

      if (options.only) {
        const ref = programs[options.only]
        if (!ref) {
          console.error(
            `Program with key "${options.only}" not found in config.`
          )
          process.exit(1)
        }
        entries = [[options.only, ref]]
      } else {
        entries = Object.entries(programs)
      }

      if (entries.length === 0) {
        console.error("No programs in config. Run `gt init` first.")
        process.exit(1)
      }

      console.log(`Pushing to ${environment}...`)

      const pushed: { file: string; key: string }[] = []

      for (const [key, ref] of entries) {
        const pushFile = getPushFile(ref)
        process.stdout.write(
          `>> Updating "${pushFile}" (id: ${ref.id})... `
        )

        const contents = await readFile(
          resolve(process.cwd(), pushFile),
          "utf-8"
        )

        await apiRequest(`/programs/${ref.id}.json`, {
          method: "PUT",
          credentials,
          environment,
          body: { contents, program: { description: "" } },
        })

        console.log("done")
        pushed.push({ file: pushFile, key })
      }

      if (options.build && pushed.length > 0) {
        console.log("\nBuilding pushed programs...")
        for (const { file, key } of pushed) {
          await buildProgram(file, key, credentials, environment)
        }
      }
    })
}
