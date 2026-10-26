import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import {
  getEnvironment,
  getProgram,
  updateProgramContents,
} from "../lib/api.js"
import { buildProgram } from "../lib/build.js"
import { resolveCredentials } from "../lib/auth.js"
import { loadConfig } from "../lib/config.js"
import { pollJob } from "../lib/jobs.js"
import { LOCK_FILENAME, checkDrift, loadLock, saveLock } from "../lib/lock.js"
import { type ProgramRef, getPushFile } from "../types.js"

export function registerPush(program: Command): void {
  program
    .command("push")
    .description("Upload local program files to the server")
    .option("-o, --only <key>", "Push only the specified program (by key)")
    .option("--no-build", "Skip building after push")
    .option(
      "-f, --force",
      `Push even if the server copy changed since the last sync recorded in ${LOCK_FILENAME}`,
    )
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

      console.log(`Pushing to ${environment}...`)

      const pushed: { file: string; key: string }[] = []
      const refused: string[] = []

      for (const [key, ref] of entries) {
        const pushFile = getPushFile(ref)
        process.stdout.write(`>> Updating "${pushFile}" (id: ${ref.id})... `)

        const before = await getProgram(ref.id, credentials, environment)

        if (!before) {
          console.log("not found on server, skipped")
          refused.push(key)
          continue
        }

        const drift = checkDrift(lock.programs[key], before.updated_at)

        if (drift.status === "drift" && !options.force) {
          console.log("refused")
          console.error(
            `   The server copy of "${before.name}" changed at ${drift.server}, after the last sync at ${drift.locked}.\n` +
              `   Run \`gt pull --only ${key}\` to see the change, or \`gt push --only ${key} --force\` to overwrite it.`,
          )
          refused.push(key)
          continue
        }

        if (drift.status === "unknown") {
          process.stdout.write(
            `(no entry in ${LOCK_FILENAME}, pushing anyway) `,
          )
        }

        const contents = await readFile(
          resolve(process.cwd(), pushFile),
          "utf-8",
        )

        const jobId = await updateProgramContents(
          ref.id,
          contents,
          credentials,
          environment,
        )

        // The update is applied by a server job; wait for it so that a build
        // started below compiles the new contents rather than the old ones.
        await pollJob(jobId, credentials, { environment })

        const after = await getProgram(ref.id, credentials, environment)

        if (after?.updated_at) {
          lock.programs[key] = {
            id: ref.id,
            name: after.name,
            updated_at: after.updated_at,
            synced_at: new Date().toISOString(),
          }
          await saveLock(lock)
        }

        console.log("done")
        pushed.push({ file: pushFile, key })
      }

      if (options.build && pushed.length > 0) {
        console.log("\nBuilding pushed programs...")
        for (const { file, key } of pushed) {
          await buildProgram(file, key, credentials, environment)
        }
      }

      if (refused.length > 0) {
        console.error(`\n${refused.length} program(s) not pushed.`)
        process.exit(1)
      }
    })
}
