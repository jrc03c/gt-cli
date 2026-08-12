import type { Credentials, GtEnvironment, Program } from "../types.js"
import { ENVIRONMENT_HOSTS } from "../types.js"

export function buildAuthHeader(credentials: Credentials): string {
  const encoded = Buffer.from(
    `${credentials.email}:${credentials.password}`,
  ).toString("base64")
  return `Basic ${encoded}`
}

export async function apiRequest(
  path: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
    credentials: Credentials
    environment?: GtEnvironment
  },
): Promise<Response> {
  const env = options.environment ?? getEnvironment()
  const host = ENVIRONMENT_HOSTS[env]
  const url = `${host}${path}`

  const headers: Record<string, string> = {
    Authorization: buildAuthHeader(options.credentials),
    ...options.headers,
  }

  if (options.body) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    )
  }

  return response
}

/**
 * The server pages /programs.json at a fixed size and ignores per_page. There
 * is no total-count header, so the end of the list is detected by a short or
 * empty page.
 */
const PROGRAMS_PAGE_SIZE = 50

function withPage(path: string, page: number): string {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}page=${page}`
}

/**
 * Yields each page of /programs.json in turn. Callers that only need one match
 * can stop iterating early, costing a single request in the common case.
 */
async function* iterateProgramPages(
  path: string,
  credentials: Credentials,
  environment?: GtEnvironment,
): AsyncGenerator<Program[]> {
  for (let page = 1; ; page++) {
    const response = await apiRequest(withPage(path, page), {
      credentials,
      environment,
    })
    const programs = (await response.json()) as Program[]

    if (programs.length > 0) {
      yield programs
    }

    if (programs.length < PROGRAMS_PAGE_SIZE) return
  }
}

function searchPath(query: string): string {
  return `/programs.json?query=${encodeURIComponent(query)}`
}

/**
 * Returns every program matching a search query, across all result pages.
 */
export async function searchPrograms(
  query: string,
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<Program[]> {
  const all: Program[] = []
  const pages = iterateProgramPages(searchPath(query), credentials, environment)

  for await (const programs of pages) {
    all.push(...programs)
  }

  return all
}

export async function findProgramByTitle(
  title: string,
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<Program | null> {
  const pages = iterateProgramPages(searchPath(title), credentials, environment)

  for await (const programs of pages) {
    const match = programs.find(p => p.name === title)
    if (match) return match
  }

  return null
}

export { findProgramByTitle as findProgram }

export async function getProgram(
  id: number,
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<Program | null> {
  try {
    const response = await apiRequest(`/programs/${id}.json`, {
      credentials,
      environment,
    })
    return (await response.json()) as Program
  } catch {
    return null
  }
}

export async function findProgramByKey(
  key: string,
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<Program | null> {
  const pages = iterateProgramPages("/programs.json", credentials, environment)

  for await (const programs of pages) {
    const match = programs.find(p => p.key === key)
    if (match) return match
  }

  return null
}

export async function listPrograms(
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<Program[]> {
  const all: Program[] = []
  const pages = iterateProgramPages("/programs.json", credentials, environment)

  for await (const programs of pages) {
    all.push(...programs)
  }

  return all
}

export async function fetchProgramSource(
  programId: number,
  credentials: Credentials,
  environment?: GtEnvironment,
): Promise<string> {
  const env = environment ?? getEnvironment()
  const host = ENVIRONMENT_HOSTS[env]
  const response = await fetch(`${host}/programs/${programId}/edit`, {
    headers: { Authorization: buildAuthHeader(credentials) },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch program source: ${response.status} ${response.statusText}`,
    )
  }

  const html = await response.text()
  const match = html.match(
    /<textarea[^>]*name="contents"[^>]*>([\s\S]*?)<\/textarea>/,
  )

  if (!match) {
    throw new Error("Could not extract program source from edit page")
  }

  // Decode HTML entities; strip leading newline from textarea content
  return match[1]
    .replace(/^\n/, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function getEnvironment(): GtEnvironment {
  const env = process.env.GT_ENV ?? "production"
  if (env !== "development" && env !== "stage" && env !== "production") {
    throw new Error(
      `Invalid GT_ENV: "${env}". Must be development, stage, or production.`,
    )
  }
  return env
}
