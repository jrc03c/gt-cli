import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import type { Command } from "commander"
import { fetchProgramSource, getEnvironment, getProgram } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { loadConfig } from "../lib/config.js"
import { loadLock, saveLock } from "../lib/lock.js"
import { type ProgramRef, getPullFile } from "../types.js"

export function registerPull(program: Command): void {
  program
    .command("pull")
    .description(
      "Download program source from the server (into dist for split entries)",
    )
    .option("-o, --only <key>", "Pull only the specified program (by key)")
    .action(async options => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const config = await loadConfig()
      const lock = await loadLock()
      const programs = config.programs ?? {}

      let entries: [string, ProgramRef][]

      if (options.only) {
        const ref = programs[options.only]
        if (!ref) {
          console.error(
            `Program with key "${options.only}" not found in config.`,
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

      console.log(`Pulling from ${environment}...`)

      for (const [key, ref] of entries) {
        const pullFile = getPullFile(ref)
        process.stdout.write(`>> Downloading "${pullFile}" (id: ${ref.id})... `)

        const [source, meta] = await Promise.all([
          fetchProgramSource(ref.id, credentials, environment),
          getProgram(ref.id, credentials, environment),
        ])

        const target = resolve(process.cwd(), pullFile)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, source)

        if (meta?.updated_at) {
          lock.programs[key] = {
            id: ref.id,
            name: meta.name,
            updated_at: meta.updated_at,
            synced_at: new Date().toISOString(),
          }
        }

        console.log("done")
      }

      await saveLock(lock)
    })
}
