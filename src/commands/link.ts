import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import {
  fetchProgramSource,
  findProgramByKey,
  getEnvironment,
  getProgram,
} from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { CONFIG_FILENAME, loadConfig, saveConfig } from "../lib/config.js"
import { promptForProgram, searchForProgram } from "../lib/lookup.js"
import { ask, inputClosed } from "../lib/prompt.js"
import { type Program, type ProgramRef, getPullFile } from "../types.js"

interface LinkOptions {
  id?: string
  key?: string
  file?: string
  pull?: boolean
}

export function registerLink(program: Command): void {
  program
    .command("link")
    .description("Add an existing server program to gt.config.json")
    .argument("[query]", "Program name to search for")
    .option("-i, --id <id>", "Look the program up by numeric ID")
    .option("-k, --key <key>", "Look the program up by 7-character key")
    .option(
      "-f, --file <file>",
      "Local .gt file to link it to (prompted for if omitted)",
    )
    .option("-p, --pull", "Download the program source into the file")
    .action(async (query: string | undefined, options: LinkOptions) => {
      const identifiers = [query, options.id, options.key].filter(
        v => v !== undefined,
      )

      if (identifiers.length > 1) {
        console.error("Give only one of: a name query, --id, or --key.")
        process.exit(1)
      }

      let id: number | undefined

      if (options.id !== undefined) {
        id = parseInt(options.id, 10)
        if (isNaN(id) || String(id) !== options.id.trim()) {
          console.error(`Invalid program ID: "${options.id}"`)
          process.exit(1)
        }
      }

      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      let found: Program | null

      if (id !== undefined) {
        process.stdout.write(`Looking up program ${id} in ${environment}... `)
        found = await getProgram(id, credentials, environment)
        console.log(found ? `found! ("${found.name}")` : "not found.")
      } else if (options.key !== undefined) {
        process.stdout.write(
          `Looking up program "${options.key}" in ${environment}... `,
        )
        found = await findProgramByKey(options.key, credentials, environment)
        console.log(found ? `found! ("${found.name}")` : "not found.")
      } else if (query !== undefined) {
        found = await searchForProgram(query, credentials, environment)
      } else {
        found = await promptForProgram(credentials, environment)
      }

      if (!found) {
        process.exit(1)
      }

      const config = await loadConfig()
      const programs: Record<string, ProgramRef> = config.programs ?? {}

      const existing = programs[found.key]
      if (existing) {
        console.log(
          `Program "${found.name}" is already linked to "${getPullFile(existing)}".`,
        )
        return
      }

      let file = options.file?.trim() ?? ""

      for (let attempt = 0; !file && attempt < 3; attempt++) {
        file = await ask(`Local file to link "${found.name}" to: `)
        if (!file) console.log("A file is required.")
        if (inputClosed()) break
      }

      if (!file) {
        console.error("No file given; nothing linked.")
        process.exit(1)
      }

      const fileOwner = Object.entries(programs).find(
        ([, ref]) => getPullFile(ref) === file,
      )

      if (fileOwner) {
        console.error(
          `"${file}" is already linked to program key "${fileOwner[0]}" (id: ${fileOwner[1].id}).`,
        )
        process.exit(1)
      }

      programs[found.key] = { file, id: found.id }
      await saveConfig({ ...config, programs })
      console.log(
        `Linked "${file}" → "${found.name}" (key: ${found.key}, id: ${found.id})`,
      )
      console.log(`Updated ${CONFIG_FILENAME}`)

      if (options.pull) {
        process.stdout.write(`>> Downloading "${file}" (id: ${found.id})... `)
        const source = await fetchProgramSource(
          found.id,
          credentials,
          environment,
        )
        await writeFile(resolve(process.cwd(), file), source)
        console.log("done")
      } else {
        console.log(
          `Run \`gt pull --only ${found.key}\` to download its source.`,
        )
      }
    })
}
