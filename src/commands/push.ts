import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import { apiRequest, findProgram, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { getLocalFiles } from "../lib/files.js"

export function registerPush(program: Command): void {
  program
    .command("push")
    .description("Upload local program files to the server")
    .option("-o, --only <name>", "Push only the specified program")
    .option("-b, --build", "Build after pushing")
    .action(async options => {
      const credentials = resolveCredentials()
      const environment = getEnvironment()

      const filenames = options.only
        ? [options.only]
        : await getLocalFiles(process.cwd())

      if (filenames.length === 0) {
        console.error("No files to push.")
        process.exit(1)
      }

      console.log(`Pushing to ${environment}...`)

      for (const filename of filenames) {
        const found = await findProgram(filename, credentials, environment)

        if (!found) {
          console.log(`>> Program named "${filename}" not found, skipping...`)
          continue
        }

        process.stdout.write(`>> Updating "${filename}" (id: ${found.id})... `)

        const contents = await readFile(resolve(process.cwd(), filename), "utf-8")

        await apiRequest(`/programs/${found.id}.json`, {
          method: "PUT",
          credentials,
          environment,
          body: { contents, program: { description: "" } },
        })

        console.log("done")
      }

      if (options.build) {
        console.error("build after push: not yet implemented")
        process.exit(1)
      }
    })
}

