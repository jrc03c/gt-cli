import { createInterface } from "node:readline"
import type { Credentials } from "../types.js"
import { loadConfig } from "./config.js"

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

function promptSecret(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const originalWrite = process.stdout.write.bind(process.stdout)
  let muted = false

  process.stdout.write = ((
    ...args: Parameters<typeof process.stdout.write>
  ) => {
    if (muted) {
      return true
    }
    return originalWrite(...args)
  }) as typeof process.stdout.write

  return new Promise(resolve => {
    rl.question(question, answer => {
      muted = false
      process.stdout.write = originalWrite
      originalWrite("\n")
      rl.close()
      resolve(answer)
    })
    muted = true
  })
}

async function promptCredentials(): Promise<Credentials> {
  const email = await prompt("GT email: ")
  const password = await promptSecret("GT password: ")
  return { email, password }
}

export async function resolveCredentials(): Promise<Credentials> {
  // Priority 1: Environment variables
  const email = process.env.GT_EMAIL
  const password = process.env.GT_PASSWORD

  if (email && password) {
    return { email, password }
  }

  // Priority 2: Config file
  const config = await loadConfig()
  if (config.email && config.password) {
    return { email: config.email, password: config.password }
  }

  // Priority 3: Interactive prompt
  if (process.stdin.isTTY) {
    return promptCredentials()
  }

  throw new Error(
    "No credentials found. Provide credentials via:\n" +
      "  - GT_EMAIL and GT_PASSWORD environment variables\n" +
      "  - email and password fields in gt.config.json\n" +
      "  - Run in a terminal for interactive prompt",
  )
}
