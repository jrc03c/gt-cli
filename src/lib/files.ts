import { readdir } from "node:fs/promises"
import { basename, join, relative } from "node:path"

/**
 * Picks the name to save a downloaded program bundle under. The server's
 * Content-Disposition name is preferred, reduced to its basename so a stray
 * path in the header cannot write outside the target directory. When the
 * server sends no usable name, one is derived from the program name using the
 * server's own convention of replacing slashes with underscores.
 */
export function bundleFilename(
  serverFilename: string | null,
  programName: string,
): string {
  const supplied = serverFilename ? basename(serverFilename.trim()) : ""

  if (supplied !== "" && supplied !== "." && supplied !== "..") {
    return supplied
  }

  return `${programName.replace(/[/\\]/g, "_")}.zip`
}

export async function getLocalGtFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  await scanDir(dir, dir, files)
  return files.sort()
}

async function scanDir(
  root: string,
  current: string,
  results: string[],
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
