import type { Credentials } from "../types.js"

export function resolveCredentials(): Credentials {
  // Priority 1: Environment variables
  const email = process.env.GT_EMAIL
  const password = process.env.GT_PASSWORD

  if (email && password) {
    return { email, password }
  }

  // TODO: Priority 2 — read from gt.config.json
  // TODO: Priority 3 — interactive prompt

  throw new Error(
    "No credentials found. Set GT_EMAIL and GT_PASSWORD environment variables."
  )
}
