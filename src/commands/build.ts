import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import { findProgram, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import {
  extractErrors,
  getEmbedInfo,
  getRunContents,
} from "../lib/build.js"
import { pollJob } from "../lib/jobs.js"

const PROJECTS_FILENAME = ".gt_projects"

export function registerBuild(program: Command): void {
  program
    .command("build")
    .description("Compile programs and report errors")
    .action(async () => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const projects = await loadProjects()

      if (!projects) {
        console.log(`No ${PROJECTS_FILENAME} file, nothing to build`)
        return
      }

      for (const project of projects) {
        const found = await findProgram(project, credentials, environment)

        if (!found) {
          console.error(`>> Program "${project}" not found, skipping...`)
          continue
        }

        console.log(`>> Building project "${project}" (key: ${found.key})`)

        const embed = await getEmbedInfo(
          found.key,
          credentials,
          environment
        )

        const contents = await getRunContents(
          embed.run_id,
          embed.access_key,
          credentials,
          environment
        )

        const jobId =
          contents && typeof contents === "object" && !Array.isArray(contents)
            ? (contents as Record<string, unknown>).job
            : null

        if (jobId && typeof jobId === "number") {
          process.stdout.write(`>>>> Waiting for new build (job: ${jobId})... `)
          await pollJob(jobId, credentials, { environment })
          console.log("done")
        } else {
          console.log(">>>> No changes to build")
        }

        // Fetch contents again to check for errors
        const result = await getRunContents(
          embed.run_id,
          embed.access_key,
          credentials,
          environment
        )

        const errors = extractErrors(result)

        if (errors.length === 0) {
          console.log(">>>> No errors")
        } else {
          console.log(">>>> Found compilation errors:")
          console.log(errors.join("\n"))
        }
      }
    })
}

async function loadProjects(): Promise<string[] | null> {
  try {
    const raw = await readFile(
      resolve(process.cwd(), PROJECTS_FILENAME),
      "utf-8"
    )
    return raw
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
  } catch {
    return null
  }
}
