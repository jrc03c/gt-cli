import { createHash } from "node:crypto"
import type { Program } from "../types.js"

export const INDEX_FILENAME = "index.json"

/** One program's record in a mirror directory's index.json. */
export interface MirrorEntry {
  id: number
  name: string
  /** Path of the program's source file, relative to the mirror directory. */
  path: string
  updated_at: string
  related_programs: string[]
  /** Hash of the file as last written by the mirror. */
  sha256: string
  mirrored_at: string
}

export interface MirrorIndex {
  programs: Record<string, MirrorEntry>
}

export function sha256(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex")
}

const INVALID_SEGMENT_CHARS = /[\\:*?"<>|\u0000-\u001f\u007f]/g

/**
 * Turns a program name into a file path under the mirror directory, so that
 * `*program: a/b/c` can be found at `a/b/c.gt` by inspection. Slashes stay as
 * directory separators; everything else that a file system might reject is
 * replaced with an underscore.
 */
export function mirrorPath(name: string): string {
  const segments = name.split("/").map(segment => {
    const cleaned = segment
      .replace(INVALID_SEGMENT_CHARS, "_")
      .trim()
      .replace(/\.+$/, "")
      .trim()
    return cleaned === "" || cleaned === "." || cleaned === ".." ? "_" : cleaned
  })
  return segments.join("/") + ".gt"
}

/**
 * Assigns each program its mirror path. Programs whose paths collide (compared
 * case-insensitively, since the mirror may be checked out on a case-insensitive
 * file system) all get `~<key>` inserted before the extension.
 */
export function assignPaths(programs: Program[]): Map<string, string> {
  const byPath = new Map<string, Program[]>()

  for (const program of programs) {
    const path = mirrorPath(program.name).toLowerCase()
    byPath.set(path, [...(byPath.get(path) ?? []), program])
  }

  const result = new Map<string, string>()

  for (const group of byPath.values()) {
    for (const program of group) {
      const path = mirrorPath(program.name)
      result.set(
        program.key,
        group.length > 1 ? path.replace(/\.gt$/, `~${program.key}.gt`) : path,
      )
    }
  }

  return result
}

export function parseRelatedPrograms(
  value: string[] | string | undefined,
): string[] {
  let list: unknown = value

  if (typeof value === "string") {
    try {
      list = JSON.parse(value)
    } catch {
      return []
    }
  }

  if (!Array.isArray(list)) return []

  return [...new Set(list.filter((v): v is string => typeof v === "string"))]
}

export interface MirrorPlan {
  fetch: { key: string; path: string; program: Program }[]
  delete: string[]
  skipped: { key: string; path: string; reason: string }[]
  unchanged: string[]
}

export interface PlanMirrorArgs {
  programs: Program[]
  index: MirrorIndex
  /** Hash of each existing file in the mirror directory, by relative path. */
  localHashes: Map<string, string>
  force?: boolean
  full?: boolean
}

/**
 * Decides what a mirror run should do, from the server listing, the index
 * from the previous run, and the hashes of the files currently on disk. Pure,
 * so that the rules are testable without a server or a file system.
 */
export function planMirror(args: PlanMirrorArgs): MirrorPlan {
  const { programs, index, localHashes, force = false, full = false } = args
  const paths = assignPaths(programs)
  const plan: MirrorPlan = { fetch: [], delete: [], skipped: [], unchanged: [] }
  const liveKeys = new Set(programs.map(p => p.key))
  const livePaths = new Set(paths.values())

  const locallyModified = (path: string, entry: MirrorEntry | undefined) => {
    const hash = localHashes.get(path)
    return hash !== undefined && entry !== undefined && hash !== entry.sha256
  }

  for (const program of programs) {
    const path = paths.get(program.key)!
    const entry = index.programs[program.key]
    const onDisk = localHashes.has(path)
    const samePath = entry?.path === path
    const sameStamp = entry?.updated_at === program.updated_at

    if (samePath && sameStamp && onDisk && !full) {
      // Nothing new on the server. A local edit, if any, is awaiting push.
      plan.unchanged.push(program.key)
      continue
    }

    if (samePath && locallyModified(path, entry) && !force) {
      plan.skipped.push({ key: program.key, path, reason: "locally modified" })
      continue
    }

    plan.fetch.push({ key: program.key, path, program })
  }

  for (const [key, entry] of Object.entries(index.programs)) {
    const live = liveKeys.has(key)
    const stillAtPath = live && paths.get(key) === entry.path

    if (stillAtPath) continue
    if (!localHashes.has(entry.path)) continue
    if (livePaths.has(entry.path)) continue

    if (locallyModified(entry.path, entry) && !force) {
      plan.skipped.push({
        key,
        path: entry.path,
        reason: "locally modified, not deleted",
      })
      continue
    }

    plan.delete.push(entry.path)
  }

  return plan
}
