import type { Command } from "commander"
import { apiRequest, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { getLocalFiles } from "../lib/files.js"

export function registerCreate(program: Command): void {
  program
    .command("create")
    .description("Create new programs on the server")
    .argument("[names...]", "Program names to create (defaults to all files in cwd)")
    .action(async (names: string[]) => {
      const credentials = resolveCredentials()
      const environment = getEnvironment()

      const filenames =
        names.length > 0 ? names : await getLocalFiles(process.cwd())

      if (filenames.length === 0) {
        console.error("No files to create.")
        process.exit(1)
      }

      console.log(`Creating programs in ${environment}...`)

      for (const filename of filenames) {
        process.stdout.write(`>> Creating "${filename}"... `)

        try {
          const response = await apiRequest("/programs", {
            method: "POST",
            credentials,
            environment,
            body: { name: filename },
          })

          const data = (await response.json()) as Record<string, unknown>

          if (data.job_id) {
            console.log("done")
          } else {
            console.error("failed")
            console.error(`${JSON.stringify(data)} -- skipping`)
          }
        } catch (e) {
          console.error("failed")
          console.error((e as Error).message)
          process.exit(1)
        }
      }
    })
}

