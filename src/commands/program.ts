import { exec } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createInterface } from "node:readline"
import type { Command } from "commander"
import {
  apiRequest,
  fetchProgramSource,
  findProgram,
  getEnvironment,
  listPrograms,
} from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import {
  extractErrors,
  getEmbedInfo,
  getRunContents,
} from "../lib/build.js"
import { pollJob } from "../lib/jobs.js"
import { ENVIRONMENT_HOSTS } from "../types.js"

export function registerProgram(parent: Command): void {
  const program = parent
    .command("program")
    .description("Manage programs on the server")

  program
    .command("list")
    .description("List all programs")
    .action(async () => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const programs = await listPrograms(credentials, environment)

      if (programs.length === 0) {
        console.log("No programs found.")
        return
      }

      for (const p of programs) {
        console.log(`${p.id}\t${p.key}\t${p.name}`)
      }
    })

  program
    .command("get")
    .description("Fetch program metadata")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      console.log(JSON.stringify(found, null, 2))
    })

  program
    .command("source")
    .description("Fetch program source code")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      const source = await fetchProgramSource(
        found.id,
        credentials,
        environment
      )
      process.stdout.write(source)
    })

  program
    .command("find")
    .description("Search programs by name")
    .argument("<query>", "Search query")
    .action(async (query: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const encoded = encodeURIComponent(query)
      const response = await apiRequest(`/programs.json?query=${encoded}`, {
        credentials,
        environment,
      })

      const programs = (await response.json()) as {
        id: number
        name: string
        key: string
      }[]

      if (programs.length === 0) {
        console.log("No programs found.")
        return
      }

      for (const p of programs) {
        console.log(`${p.id}\t${p.key}\t${p.name}`)
      }
    })

  program
    .command("delete")
    .description("Delete a program (with confirmation)")
    .argument("<name>", "Program name")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (name: string, options: { yes?: boolean }) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      if (!options.yes) {
        const confirmed = await confirm(
          `Delete "${name}" (id: ${found.id})? This cannot be undone. [y/N] `
        )
        if (!confirmed) {
          console.log("Aborted.")
          return
        }
      }

      await apiRequest(`/programs/${found.id}.json`, {
        method: "DELETE",
        credentials,
        environment,
      })

      console.log(`Deleted "${name}" (id: ${found.id})`)
    })

  program
    .command("build")
    .description("Build a specific program")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      console.log(`Building "${name}" (key: ${found.key})...`)

      const embed = await getEmbedInfo(found.key, credentials, environment)
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
        process.stdout.write(`Waiting for build (job: ${jobId})... `)
        await pollJob(jobId, credentials, { environment })
        console.log("done")
      } else {
        console.log("No changes to build")
      }

      const result = await getRunContents(
        embed.run_id,
        embed.access_key,
        credentials,
        environment
      )
      const errors = extractErrors(result)

      if (errors.length === 0) {
        console.log("No errors")
      } else {
        console.log("Found compilation errors:")
        console.log(errors.join("\n"))
      }
    })

  program
    .command("view")
    .description("Open program edit page in browser")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      const url = `${ENVIRONMENT_HOSTS[environment]}/programs/${found.id}/edit`
      openBrowser(url)
    })

  program
    .command("preview")
    .description("Open program preview in browser")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      const url = `${ENVIRONMENT_HOSTS[environment]}/programs/${found.key}/preview`
      openBrowser(url)
    })

  program
    .command("run")
    .description("Open program run page in browser")
    .argument("<name>", "Program name")
    .action(async (name: string) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      const url = `${ENVIRONMENT_HOSTS[environment]}/programs/${found.key}/run`
      openBrowser(url)
    })

  program
    .command("data")
    .alias("csv")
    .description("Download program data as CSV")
    .argument("<name>", "Program name")
    .option("-o, --output <file>", "Save to file instead of stdout")
    .action(async (name: string, options: { output?: string }) => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()

      const found = await findProgram(name, credentials, environment)

      if (!found) {
        console.error(`Program "${name}" not found.`)
        process.exit(1)
      }

      const response = await apiRequest(`/programs/${found.id}/csv`, {
        credentials,
        environment,
      })

      const csv = await response.text()

      if (options.output) {
        await writeFile(resolve(process.cwd(), options.output), csv)
        console.log(`Saved to ${options.output}`)
      } else {
        process.stdout.write(csv)
      }
    })
}

function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
      resolve(answer.toLowerCase() === "y")
    })
  })
}

function openBrowser(url: string): void {
  console.log(url)
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open"
  exec(`${cmd} ${JSON.stringify(url)}`)
}

