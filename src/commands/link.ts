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
import { ask, confirm, inputClosed } from "../lib/prompt.js"
import {
  type Program,
  type ProgramRef,
  getPullFile,
  getPushFile,
} from "../types.js"

interface LinkOptions {
  id?: string
  key?: string
  file?: string
  fileSrc?: string
  fileDist?: string
  pull?: boolean
}

/**
 * Asks for a required answer, retrying a few times on blank input. Resolves
 * with an empty string if the user never answers or stdin closes.
 */
async function askRequired(question: string, what: string): Promise<string> {
  let answer = ""
  for (let attempt = 0; !answer && attempt < 3; attempt++) {
    answer = await ask(question)
    if (!answer) console.log(`${what} is required.`)
    if (inputClosed()) break
  }
  return answer
}

function describeFile(file: ProgramRef["file"]): string {
  return typeof file === "string"
    ? `"${file}"`
    : `"${file.src}" (src) / "${file.dist}" (dist)`
}

/**
 * Builds a `{ src, dist }` file entry, prompting for whichever half wasn't
 * given on the command line. Returns undefined if either is still missing.
 */
async function resolveSplitFile(
  found: Program,
  src?: string,
  dist?: string,
): Promise<{ src: string; dist: string } | undefined> {
  src = src?.trim() ?? ""
  dist = dist?.trim() ?? ""

  if (!src) {
    src = await askRequired(
      `Local source file for "${found.name}" (gt pull writes here): `,
      "A source file",
    )
    if (!src) return undefined
  }

  if (!dist) {
    dist = await askRequired(
      `Local dist file for "${found.name}" (gt push reads here): `,
      "A dist file",
    )
    if (!dist) return undefined
  }

  if (src === dist) {
    console.error("Source and dist are the same path; use --file instead.")
    process.exit(1)
  }

  return { src, dist }
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
    .option(
      "--file-src <file>",
      "Local source file (`gt pull` writes here); use with --file-dist instead of --file",
    )
    .option(
      "--file-dist <file>",
      "Local built file (`gt push` reads here); use with --file-src instead of --file",
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

      const hasSplit =
        options.fileSrc !== undefined || options.fileDist !== undefined

      if (options.file !== undefined && hasSplit) {
        console.error(
          "--file cannot be combined with --file-src or --file-dist.",
        )
        process.exit(1)
      }

      if (
        options.fileSrc !== undefined &&
        options.fileDist !== undefined &&
        options.fileSrc.trim() === options.fileDist.trim()
      ) {
        console.error(
          "--file-src and --file-dist are the same path; use --file instead.",
        )
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

      let file: ProgramRef["file"] | undefined

      if (hasSplit) {
        file = await resolveSplitFile(found, options.fileSrc, options.fileDist)
      } else if (options.file !== undefined && options.file.trim()) {
        file = options.file.trim()
      } else if (
        await confirm(`Use separate source and dist files for "${found.name}"?`)
      ) {
        file = await resolveSplitFile(found)
      } else {
        file = await askRequired(
          `Local file to link "${found.name}" to: `,
          "A file",
        )
      }

      if (!file) {
        console.error("No file given; nothing linked.")
        process.exit(1)
      }

      const newFiles = typeof file === "string" ? [file] : [file.src, file.dist]

      for (const [key, ref] of Object.entries(programs)) {
        const taken = newFiles.find(
          f => f === getPullFile(ref) || f === getPushFile(ref),
        )
        if (taken) {
          console.error(
            `"${taken}" is already linked to program key "${key}" (id: ${ref.id}).`,
          )
          process.exit(1)
        }
      }

      programs[found.key] = { file, id: found.id }
      await saveConfig({ ...config, programs })
      console.log(
        `Linked ${describeFile(file)} → "${found.name}" (key: ${found.key}, id: ${found.id})`,
      )
      console.log(`Updated ${CONFIG_FILENAME}`)

      const pullFile = getPullFile({ file, id: found.id })

      if (options.pull) {
        process.stdout.write(
          `>> Downloading "${pullFile}" (id: ${found.id})... `,
        )
        const source = await fetchProgramSource(
          found.id,
          credentials,
          environment,
        )
        await writeFile(resolve(process.cwd(), pullFile), source)
        console.log("done")
      } else {
        console.log(
          `Run \`gt pull --only ${found.key}\` to download its source.`,
        )
      }
    })
}
