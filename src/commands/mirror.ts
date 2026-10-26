import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import type { Command } from "commander"
import { fetchProgramSource, getEnvironment, listPrograms } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"
import { loadConfig } from "../lib/config.js"
import { getLocalGtFiles } from "../lib/files.js"
import {
  INDEX_FILENAME,
  type MirrorEntry,
  type MirrorIndex,
  assignPaths,
  parseRelatedPrograms,
  planMirror,
  sha256,
} from "../lib/mirror.js"
import { type GtConfig, getPullFile } from "../types.js"

async function loadIndex(dir: string): Promise<MirrorIndex> {
  try {
    const raw = await readFile(join(dir, INDEX_FILENAME), "utf-8")
    const parsed = JSON.parse(raw) as Partial<MirrorIndex>
    return { programs: parsed.programs ?? {} }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { programs: {} }
    }
    throw new Error(`Failed to read ${INDEX_FILENAME}: ${err}`)
  }
}

async function saveIndex(dir: string, index: MirrorIndex): Promise<void> {
  const sorted: Record<string, MirrorEntry> = {}
  const keys = Object.keys(index.programs).sort((a, b) =>
    index.programs[a].name.localeCompare(index.programs[b].name),
  )
  for (const key of keys) sorted[key] = index.programs[key]
  await writeFile(
    join(dir, INDEX_FILENAME),
    JSON.stringify({ programs: sorted }, null, 2) + "\n",
  )
}

async function hashLocalFiles(dir: string): Promise<Map<string, string>> {
  const hashes = new Map<string, string>()
  let files: string[] = []
  try {
    files = await getLocalGtFiles(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }
  for (const file of files) {
    hashes.set(file, sha256(await readFile(join(dir, file), "utf-8")))
  }
  return hashes
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++]
        await fn(item)
      }
    },
  )
  await Promise.all(workers)
}

export function registerMirror(program: Command): void {
  program
    .command("mirror")
    .description(
      "Download every program on the account into a directory, one file per program, named by program name",
    )
    .option("-d, --dir <dir>", "Mirror directory", "programs")
    .option("--full", "Refetch every program, not just changed ones")
    .option("-f, --force", "Overwrite or delete locally modified files")
    .option("-c, --concurrency <n>", "Parallel downloads", "4")
    .action(async options => {
      const credentials = await resolveCredentials()
      const environment = getEnvironment()
      const dir = resolve(process.cwd(), options.dir)
      const concurrency = Math.max(1, Number(options.concurrency) || 1)

      await mkdir(dir, { recursive: true })

      console.log(
        `Mirroring ${environment} into ${relative(process.cwd(), dir) || "."}/ ...`,
      )

      const [programs, index, localHashes] = await Promise.all([
        listPrograms(credentials, environment),
        loadIndex(dir),
        hashLocalFiles(dir),
      ])

      console.log(`${programs.length} programs on the server`)

      const plan = planMirror({
        programs,
        index,
        localHashes,
        force: Boolean(options.force),
        full: Boolean(options.full),
      })

      for (const skip of plan.skipped) {
        console.warn(`!! Skipping "${skip.path}" (${skip.key}): ${skip.reason}`)
      }

      for (const path of plan.delete) {
        await rm(join(dir, path), { force: true })
        console.log(`-- Removed "${path}"`)
      }

      // Drop index entries for programs that are gone or moved. Entries whose
      // files were kept because of local edits are dropped too: the file is
      // now an orphan the user chose to keep, not something the mirror owns.
      const liveKeys = new Set(programs.map(p => p.key))
      const paths = assignPaths(programs)
      for (const [key, entry] of Object.entries(index.programs)) {
        if (!liveKeys.has(key) || paths.get(key) !== entry.path) {
          delete index.programs[key]
        }
      }

      let fetched = 0
      const failures: { path: string; error: string }[] = []

      await runWithConcurrency(plan.fetch, concurrency, async item => {
        try {
          const source = await fetchProgramSource(
            item.program.id,
            credentials,
            environment,
          )
          const target = join(dir, item.path)
          await mkdir(dirname(target), { recursive: true })
          await writeFile(target, source)
          index.programs[item.key] = {
            id: item.program.id,
            name: item.program.name,
            path: item.path,
            updated_at: item.program.updated_at ?? "",
            related_programs: parseRelatedPrograms(
              item.program.related_programs,
            ),
            sha256: sha256(source),
            mirrored_at: new Date().toISOString(),
          }
          fetched++
          console.log(`>> ${item.path}`)
        } catch (err) {
          failures.push({ path: item.path, error: (err as Error).message })
        }
      })

      // The listing is already in hand, so refresh the dependency list of
      // unchanged programs too. It costs nothing and repairs an index written
      // by an older version that did not record it.
      for (const key of plan.unchanged) {
        const live = programs.find(p => p.key === key)
        const entry = index.programs[key]
        if (live && entry) {
          entry.related_programs = parseRelatedPrograms(live.related_programs)
        }
      }

      await saveIndex(dir, index)

      const config: GtConfig = await loadConfig(dir).catch(() => ({}))
      for (const [key, ref] of Object.entries(config.programs ?? {})) {
        const expected = paths.get(key)
        if (expected && getPullFile(ref) !== expected) {
          console.warn(
            `!! ${key} is linked to "${getPullFile(ref)}" but the mirror writes it to "${expected}"`,
          )
        }
      }

      console.log(
        `\n${fetched} fetched, ${plan.unchanged.length} unchanged, ${plan.delete.length} removed, ${plan.skipped.length} skipped`,
      )

      if (failures.length > 0) {
        console.error(`\n${failures.length} failed:`)
        for (const f of failures) console.error(`  ${f.path}: ${f.error}`)
        process.exit(1)
      }
    })
}
