import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

export const LOCK_FILENAME = "gt.lock.json"

/**
 * What the server's `updated_at` was for a program the last time this
 * project pulled or pushed it. `gt push` compares against it to avoid
 * overwriting an edit made on the server (for example in the browser) since.
 */
export interface LockEntry {
  id: number
  name: string
  updated_at: string
  synced_at: string
}

export interface GtLock {
  programs: Record<string, LockEntry>
}

export async function loadLock(dir?: string): Promise<GtLock> {
  const lockPath = resolve(dir ?? process.cwd(), LOCK_FILENAME)

  try {
    const raw = await readFile(lockPath, "utf-8")
    const parsed = JSON.parse(raw) as Partial<GtLock>
    return { programs: parsed.programs ?? {} }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { programs: {} }
    }
    throw new Error(`Failed to read ${LOCK_FILENAME}: ${err}`)
  }
}

export async function saveLock(lock: GtLock, dir?: string): Promise<void> {
  const lockPath = resolve(dir ?? process.cwd(), LOCK_FILENAME)
  const programs: Record<string, LockEntry> = {}

  for (const key of Object.keys(lock.programs).sort()) {
    programs[key] = lock.programs[key]
  }

  await writeFile(lockPath, JSON.stringify({ programs }, null, 2) + "\n")
}

export type DriftResult =
  | { status: "ok" }
  | { status: "unknown" }
  | { status: "drift"; locked: string; server: string }

export function checkDrift(
  entry: LockEntry | undefined,
  serverUpdatedAt: string | undefined,
): DriftResult {
  if (!entry) return { status: "unknown" }
  if (serverUpdatedAt === undefined) return { status: "unknown" }
  if (entry.updated_at === serverUpdatedAt) return { status: "ok" }
  return { status: "drift", locked: entry.updated_at, server: serverUpdatedAt }
}
