import type { Credentials } from "../types.js"
import { loadConfig } from "./config.js"

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

  // Priority 3: Interactive prompt (next task)

  throw new Error(
    "No credentials found. Provide credentials via:\n" +
      "  - GT_EMAIL and GT_PASSWORD environment variables\n" +
      "  - email and password fields in gt.config.json\n" +
      "  - Run in a terminal for interactive prompt"
  )
}
