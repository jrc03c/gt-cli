import type { Command } from "commander"
import { getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { CONFIG_FILENAME, loadConfig, saveConfig } from "../lib/config.js"
import { getLocalGtFiles } from "../lib/files.js"
import { promptForProgram } from "../lib/lookup.js"
import { confirm } from "../lib/prompt.js"
import { type GtConfig, type ProgramRef, getPullFile } from "../types.js"

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create gt.config.json by linking local .gt files to programs")
    .action(async () => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const existing = await loadConfig()
      const programs: Record<string, ProgramRef> = existing.programs ?? {}

      const files = await getLocalGtFiles(process.cwd())

      if (files.length === 0) {
        console.log("No .gt files found.")
        return
      }

      // Build a set of already-linked files for quick lookup
      const linkedFiles = new Set(
        Object.values(programs).map(p => getPullFile(p)),
      )

      for (const file of files) {
        if (linkedFiles.has(file)) {
          console.log(`\n"${file}" is already linked, skipping.`)
          continue
        }

        console.log(`\nFound "${file}"`)
        const shouldLink = await confirm(
          "Do you want to link it to a program on guidedtrack.com?",
        )

        if (!shouldLink) continue

        const found = await promptForProgram(credentials, environment)

        if (!found) continue

        if (programs[found.key]) {
          console.log(
            `Program "${found.name}" is already linked to "${getPullFile(programs[found.key])}", skipping.`,
          )
          continue
        }

        programs[found.key] = { file, id: found.id }
        linkedFiles.add(file)
        console.log(`Linked "${file}" → "${found.name}" (key: ${found.key})`)
      }

      const config: GtConfig = { ...existing, programs }
      await saveConfig(config)
      console.log(`\nWrote ${CONFIG_FILENAME}`)
    })
}
