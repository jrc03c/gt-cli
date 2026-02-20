import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { GtConfig } from "../types.js"

export const CONFIG_FILENAME = "gt.config.json"

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

export async function saveConfig(
  config: GtConfig,
  dir?: string
): Promise<void> {
  const configPath = resolve(dir ?? process.cwd(), CONFIG_FILENAME)
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n")
}
