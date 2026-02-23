import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import {
  fetchProgramSource,
  findProgram,
  getEnvironment,
} from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { getLocalFiles } from "../lib/files.js"

export function registerPull(program: Command): void {
  program
    .command("pull")
    .description("Download program source from the server")
    .option("-o, --only <name>", "Pull only the specified program")
    .action(async options => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const filenames = options.only
        ? [options.only]
        : await getLocalFiles(process.cwd())

      if (filenames.length === 0) {
        console.error("No files to pull.")
        process.exit(1)
      }

      console.log(`Pulling from ${environment}...`)

      for (const filename of filenames) {
        const found = await findProgram(filename, credentials, environment)

        if (!found) {
          console.log(`>> Program named "${filename}" not found, skipping...`)
          continue
        }

        process.stdout.write(`>> Downloading "${filename}" (id: ${found.id})... `)

        const source = await fetchProgramSource(
          found.id,
          credentials,
          environment
        )

        await writeFile(resolve(process.cwd(), filename), source)
        console.log("done")
      }
    })
}
