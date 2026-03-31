import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

export async function getLocalFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isFile()).map(e => e.name)
}

export async function getLocalGtFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  await scanDir(dir, dir, files)
  return files.sort()
}

async function scanDir(
  root: string,
  current: string,
  results: string[]
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(current, entry.name)
    if (entry.isDirectory() && entry.name !== "node_modules") {
      await scanDir(root, fullPath, results)
    } else if (entry.isFile() && entry.name.endsWith(".gt")) {
      results.push(relative(root, fullPath))
    }
  }
}
