import { describe, expect, it, vi } from "vitest"
import {
  findProgramByKey,
  findProgramByTitle,
  listPrograms,
  searchPrograms,
} from "../../src/lib/api.js"
import type { Credentials, Program } from "../../src/types.js"

const creds: Credentials = { email: "a@b.com", password: "secret" }

function makeProgram(n: number): Program {
  return { id: n, key: `key${n}`, name: `program-${n}` } as Program
}

/**
 * Stubs global fetch to serve a fixed set of pages. Returns the list of
 * requested URLs so tests can assert on how many pages were fetched.
 */
function stubPages(pages: Program[][]): string[] {
  const urls: string[] = []

  vi.stubGlobal("fetch", async (url: string) => {
    urls.push(url)
    const match = url.match(/[?&]page=(\d+)/)
    const page = match ? parseInt(match[1], 10) : 1
    const body = pages[page - 1] ?? []
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  })

  return urls
}

describe("listPrograms pagination", () => {
  it("returns programs from every page, not just the first", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 51))
    const page3 = Array.from({ length: 20 }, (_, i) => makeProgram(i + 101))
    stubPages([page1, page2, page3])

    const programs = await listPrograms(creds, "production")

    expect(programs).toHaveLength(120)
    expect(programs[0].id).toBe(1)
    expect(programs[119].id).toBe(120)
  })

  it("stops requesting once a page comes back empty", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const urls = stubPages([page1, []])

    await listPrograms(creds, "production")

    expect(urls).toHaveLength(2)
    expect(urls[1]).toContain("page=2")
  })

  it("requests a single page when the account has fewer than a full page", async () => {
    const urls = stubPages([[makeProgram(1), makeProgram(2)]])

    const programs = await listPrograms(creds, "production")

    expect(programs).toHaveLength(2)
    expect(urls).toHaveLength(1)
  })
})

describe("findProgramByKey pagination", () => {
  it("finds a program that lives past the first page", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 51))
    stubPages([page1, page2])

    const found = await findProgramByKey("key77", creds, "production")

    expect(found).not.toBeNull()
    expect(found!.id).toBe(77)
  })

  it("stops fetching as soon as the key matches", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 51))
    const urls = stubPages([page1, page2])

    await findProgramByKey("key10", creds, "production")

    expect(urls).toHaveLength(1)
  })

  it("returns null after exhausting every page", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    stubPages([page1])

    const found = await findProgramByKey("nope", creds, "production")

    expect(found).toBeNull()
  })
})

describe("searchPrograms pagination", () => {
  it("returns matches from every page of search results", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 12 }, (_, i) => makeProgram(i + 51))
    stubPages([page1, page2])

    const programs = await searchPrograms("program", creds, "production")

    expect(programs).toHaveLength(62)
    expect(programs[61].id).toBe(62)
  })

  it("url-encodes the query and appends the page param", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const urls = stubPages([page1, []])

    await searchPrograms("my program", creds, "production")

    expect(urls[0]).toContain("query=my%20program")
    expect(urls[1]).toContain("&page=2")
  })

  it("returns an empty array when nothing matches", async () => {
    stubPages([[]])

    const programs = await searchPrograms("nope", creds, "production")

    expect(programs).toEqual([])
  })
})

describe("findProgramByTitle pagination", () => {
  it("finds an exact name match past the first page of search results", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 51))
    stubPages([page1, page2])

    const found = await findProgramByTitle("program-83", creds, "production")

    expect(found).not.toBeNull()
    expect(found!.id).toBe(83)
  })

  it("stops at the first page when the exact match is already there", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const page2 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 51))
    const urls = stubPages([page1, page2])

    await findProgramByTitle("program-3", creds, "production")

    expect(urls).toHaveLength(1)
  })

  it("appends the page param to the existing query string", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => makeProgram(i + 1))
    const urls = stubPages([page1, []])

    await findProgramByTitle("no-such-program", creds, "production")

    expect(urls[0]).toContain("query=no-such-program")
    expect(urls[1]).toContain("query=no-such-program")
    expect(urls[1]).toContain("&page=2")
  })
})
