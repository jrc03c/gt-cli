import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { GtConfig } from "../types.js"

const CONFIG_FILENAME = "gt.config.json"

export async function loadConfig(dir?: string): Promise<GtConfig> {
  const configPath = resolve(dir ?? process.cwd(), CONFIG_FILENAME)

  try {
    const raw = await readFile(configPath, "utf-8")
    return JSON.parse(raw) as GtConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {}
    }
    throw new Error(`Failed to read ${CONFIG_FILENAME}: ${err}`)
  }
}
