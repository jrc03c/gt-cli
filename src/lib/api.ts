import type { Credentials, GtEnvironment, Program } from "../types.js"
import { ENVIRONMENT_HOSTS } from "../types.js"

export function buildAuthHeader(credentials: Credentials): string {
  const encoded = Buffer.from(
    `${credentials.email}:${credentials.password}`
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
  }
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
      `API request failed: ${response.status} ${response.statusText}`
    )
  }

  return response
}

export async function findProgramByTitle(
  title: string,
  credentials: Credentials,
  environment?: GtEnvironment
): Promise<Program | null> {
  const query = encodeURIComponent(title)
  const response = await apiRequest(`/programs.json?query=${query}`, {
    credentials,
    environment,
  })
  const programs = (await response.json()) as Program[]
  return programs.find(p => p.name === title) ?? null
}

export { findProgramByTitle as findProgram }

export async function getProgram(
  id: number,
  credentials: Credentials,
  environment?: GtEnvironment
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
  environment?: GtEnvironment
): Promise<Program | null> {
  const response = await apiRequest("/programs.json", {
    credentials,
    environment,
  })
  const programs = (await response.json()) as Program[]
  return programs.find(p => p.key === key) ?? null
}

export async function listPrograms(
  credentials: Credentials,
  environment?: GtEnvironment
): Promise<Program[]> {
  const response = await apiRequest("/programs.json", {
    credentials,
    environment,
  })
  return (await response.json()) as Program[]
}

export async function fetchProgramSource(
  programId: number,
  credentials: Credentials,
  environment?: GtEnvironment
): Promise<string> {
  const env = environment ?? getEnvironment()
  const host = ENVIRONMENT_HOSTS[env]
  const response = await fetch(`${host}/programs/${programId}/edit`, {
    headers: { Authorization: buildAuthHeader(credentials) },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch program source: ${response.status} ${response.statusText}`
    )
  }

  const html = await response.text()
  const match = html.match(
    /<textarea[^>]*name="contents"[^>]*>([\s\S]*?)<\/textarea>/
  )

  if (!match) {
    throw new Error("Could not extract program source from edit page")
  }

  // Decode HTML entities
  return match[1]
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
      `Invalid GT_ENV: "${env}". Must be development, stage, or production.`
    )
  }
  return env
}
