import type { Credentials, EmbedInfo, GtEnvironment } from "../types.js"
import { apiRequest } from "./api.js"

export async function getEmbedInfo(
  key: string,
  credentials: Credentials,
  environment: GtEnvironment
): Promise<EmbedInfo> {
  const response = await apiRequest(`/programs/${key}/embed`, {
    credentials,
    environment,
  })
  return (await response.json()) as EmbedInfo
}

export async function getRunContents(
  runId: number,
  accessKey: string,
  credentials: Credentials,
  environment: GtEnvironment
): Promise<unknown> {
  const response = await apiRequest(`/runs/${runId}/contents`, {
    credentials,
    environment,
    headers: { "X-GuidedTrack-Access-Key": accessKey },
  })
  return response.json()
}

export function extractErrors(contents: unknown): string[] {
  if (!Array.isArray(contents)) {
    if (contents && typeof contents === "object") {
      // Single-program response: { "program-name": { metadata: { errors } } }
      const errors: string[] = []
      for (const value of Object.values(
        contents as Record<string, unknown>
      )) {
        if (value && typeof value === "object" && "metadata" in value) {
          const metadata = (value as { metadata?: { errors?: string[] } })
            .metadata
          if (metadata?.errors) {
            errors.push(...metadata.errors)
          }
        }
      }
      return errors
    }
    return []
  }

  const errors: string[] = []
  for (const item of contents) {
    if (item && typeof item === "object" && "metadata" in item) {
      const metadata = (item as { metadata?: { errors?: string[] } }).metadata
      if (metadata?.errors) {
        errors.push(...metadata.errors)
      }
    }
  }
  return errors
}
