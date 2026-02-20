import { readdir } from "node:fs/promises"

export async function getLocalFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isFile()).map(e => e.name)
}
