import type { Command } from "commander"
import { apiRequest, findProgram, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { getLocalGtFiles } from "../lib/files.js"
import { loadConfig, saveConfig } from "../lib/config.js"
import { pollJob } from "../lib/jobs.js"

export function registerCreate(program: Command): void {
  program
    .command("create")
    .description("Create new programs on the server")
    .argument(
      "[names...]",
      "Program names to create (defaults to all .gt files in cwd)"
    )
    .action(async (names: string[]) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const filenames =
        names.length > 0 ? names : await getLocalGtFiles(process.cwd())

      if (filenames.length === 0) {
        console.error("No .gt files to create.")
        process.exit(1)
      }

      console.log(`Creating programs in ${environment}...`)

      const config = await loadConfig()
      const programs = config.programs ?? {}
      let configChanged = false

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
            await pollJob(data.job_id as number, credentials, {
              environment,
              intervalMs: 1000,
            }).catch(() => {
              // Job may complete before we can poll it
            })

            const found = await findProgram(filename, credentials, environment)

            if (found) {
              console.log(`done (id: ${found.id}, key: ${found.key})`)
              programs[found.key] = { file: filename, id: found.id }
              configChanged = true
            } else {
              console.log("done")
            }
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

      if (configChanged) {
        await saveConfig({ ...config, programs })
        console.log("Updated gt.config.json")
      }
    })
}
