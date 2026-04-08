import type { Command } from "commander"
import {
  findProgramByKey,
  findProgramByTitle,
  getEnvironment,
  getProgram,
} from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { CONFIG_FILENAME, loadConfig, saveConfig } from "../lib/config.js"
import { getLocalGtFiles } from "../lib/files.js"
import { ask, choose, confirm } from "../lib/prompt.js"
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
      const linkedFiles = new Set(Object.values(programs).map(p => getPullFile(p)))

      for (const file of files) {
        if (linkedFiles.has(file)) {
          console.log(`\n"${file}" is already linked, skipping.`)
          continue
        }

        console.log(`\nFound "${file}"`)
        const shouldLink = await confirm(
          "Do you want to link it to a program on guidedtrack.com?"
        )

        if (!shouldLink) continue

        const idType = await choose(
          "Which identifier do you want to use to find the program?",
          [
            'The program\'s title (e.g., "My Cool Program")',
            "The program's ID (e.g., 12345)",
            'The program\'s key (e.g., "abc1234")',
          ]
        )

        if (idType === -1) continue

        let found = null

        if (idType === 0) {
          const title = await ask("Enter program title: ")
          if (!title) continue
          process.stdout.write(`Looking up "${title}" in ${environment}... `)
          found = await findProgramByTitle(title, credentials, environment)
        } else if (idType === 1) {
          const idStr = await ask("Enter program ID: ")
          const id = parseInt(idStr, 10)
          if (isNaN(id)) {
            console.log("Invalid ID.")
            continue
          }
          process.stdout.write(
            `Looking up program ${id} in ${environment}... `
          )
          found = await getProgram(id, credentials, environment)
        } else {
          const key = await ask("Enter program key: ")
          if (!key) continue
          process.stdout.write(
            `Looking up program "${key}" in ${environment}... `
          )
          found = await findProgramByKey(key, credentials, environment)
        }

        if (!found) {
          console.log("not found.")
          continue
        }

        console.log(`found! ("${found.name}")`)

        if (programs[found.key]) {
          console.log(
            `Program "${found.name}" is already linked to "${getPullFile(programs[found.key])}", skipping.`
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
