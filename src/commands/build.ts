import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Command } from "commander"
import { findProgram, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { buildProgram } from "../lib/build.js"

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

        await buildProgram(project, found.key, credentials, environment)
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
