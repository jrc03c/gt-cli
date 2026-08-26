import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"

const credentials = loadCredentials()

const authString = `Basic ${Buffer.from(
  credentials.email + ":" + credentials.password,
).toString("base64")}`

function fetchWithAuth(url, options) {
  options = options ?? {}
  options.headers = options.headers ?? {}

  options.headers["Authorization"] =
    options.headers["Authorization"] ?? authString

  return fetch(url, options)
}

function loadCredentials() {
  // 1. look at environment variables
  if (
    typeof process.env.GT_EMAIL !== "undefined" &&
    typeof process.env.GT_PASS !== "undefined"
  ) {
    return { email: process.env.GT_EMAIL, password: process.env.GT_PASS }
  }

  // 2. look in ~/.config/gt/config.json
  const configDir = path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
    "gt",
  )

  const configFile = path.join(configDir, "config.json")

  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, "utf8"))

      if (config.email && config.password) {
        return { email: config.email, password: config.password }
      }
    } catch {}
  }

  throw new Error(
    "No credentials found! Please define credentials either as environment variables or in `~/.config/gt/config.json`. See the docs for more info.",
  )
}

export { fetchWithAuth, loadCredentials }
