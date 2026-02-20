import type { Credentials, GtEnvironment, Job } from "../types.js"
import { apiRequest } from "./api.js"

const DEFAULT_POLL_INTERVAL_MS = 3000

export async function pollJob(
  jobId: number,
  credentials: Credentials,
  options?: {
    environment?: GtEnvironment
    intervalMs?: number
  }
): Promise<Job> {
  const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS

  while (true) {
    const response = await apiRequest(`/delayed_jobs/${jobId}`, {
      credentials,
      environment: options?.environment,
    })

    const job = (await response.json()) as Job

    if (job.status !== "running") {
      return job
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }
}
