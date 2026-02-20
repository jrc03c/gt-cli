import type { Credentials, GtEnvironment } from "../types.js"
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

export function getEnvironment(): GtEnvironment {
  const env = process.env.GT_ENV ?? "development"
  if (env !== "development" && env !== "stage" && env !== "production") {
    throw new Error(
      `Invalid GT_ENV: "${env}". Must be development, stage, or production.`
    )
  }
  return env
}
