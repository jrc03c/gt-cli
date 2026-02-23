import type { Credentials, EmbedInfo, GtEnvironment } from "../types.js"
import { apiRequest } from "./api.js"
import { pollJob } from "./jobs.js"

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

export async function buildProgram(
  name: string,
  key: string,
  credentials: Credentials,
  environment: GtEnvironment
): Promise<void> {
  console.log(`>> Building project "${name}" (key: ${key})`)

  const embed = await getEmbedInfo(key, credentials, environment)

  const contents = await getRunContents(
    embed.run_id,
    embed.access_key,
    credentials,
    environment
  )

  const jobId =
    contents && typeof contents === "object" && !Array.isArray(contents)
      ? (contents as Record<string, unknown>).job
      : null

  if (jobId && typeof jobId === "number") {
    process.stdout.write(`>>>> Waiting for new build (job: ${jobId})... `)
    await pollJob(jobId, credentials, { environment })
    console.log("done")
  } else {
    console.log(">>>> No changes to build")
  }

  const result = await getRunContents(
    embed.run_id,
    embed.access_key,
    credentials,
    environment
  )

  const errors = extractErrors(result)

  if (errors.length === 0) {
    console.log(">>>> No errors")
  } else {
    console.log(">>>> Found compilation errors:")
    console.log(errors.join("\n"))
  }
}
