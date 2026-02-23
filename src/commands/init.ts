import type { Command } from "commander"
import { findProgram, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { CONFIG_FILENAME, loadConfig, saveConfig } from "../lib/config.js"
import { getLocalFiles } from "../lib/files.js"
import type { GtConfig, ProgramRef } from "../types.js"

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create gt.config.json by scanning for program files")
    .action(async () => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const existing = await loadConfig()
      const programs: Record<string, ProgramRef> = existing.programs ?? {}

      const files = await getLocalFiles(process.cwd())

      if (files.length === 0) {
        console.log("No files found in current directory.")
        return
      }

      console.log(`Scanning for programs in ${environment}...`)

      for (const filename of files) {
        if (programs[filename]) {
          console.log(`>> "${filename}" already in config, skipping...`)
          continue
        }

        const found = await findProgram(filename, credentials, environment)

        if (found) {
          console.log(
            `>> Found "${filename}" (id: ${found.id}, key: ${found.key})`
          )
          programs[filename] = { id: found.id, key: found.key }
        } else {
          console.log(`>> "${filename}" not found on server, skipping...`)
        }
      }

      const config: GtConfig = { ...existing, programs }
      await saveConfig(config)
      console.log(`\nWrote ${CONFIG_FILENAME}`)
    })
}
