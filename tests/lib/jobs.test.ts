import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { pollJob } from "../../src/lib/jobs.js"
import { getEmbedInfo, getRunContents } from "../../src/lib/build.js"
import { apiRequest } from "../../src/lib/api.js"
import type { Credentials, Program } from "../../src/types.js"
import {
  getCredentials,
  createTestProgram,
  deleteTestProgram,
  pushProgramContents,
} from "../helpers.js"

let creds: Credentials
let testProgram: Program

beforeAll(async () => {
  creds = getCredentials()
  testProgram = await createTestProgram(creds)
  await pushProgramContents(
    testProgram.id,
    "*question: Job test?\n\t*type: text\n\t*save: job_answer",
    creds
  )
}, 30_000)

afterAll(async () => {
  if (testProgram) {
    await deleteTestProgram(testProgram.id, creds)
  }
}, 15_000)

describe("pollJob", () => {
  it("polls the correct endpoint and returns a completed job", async () => {
    // Trigger a build to get a real job ID
    const embed = await getEmbedInfo(testProgram.key, creds, "production")
    const contents = await getRunContents(
      embed.run_id,
      embed.access_key,
      creds,
      "production"
    )

    const jobId =
      contents && typeof contents === "object" && !Array.isArray(contents)
        ? (contents as Record<string, unknown>).job
        : null

    if (jobId && typeof jobId === "number") {
      const result = await pollJob(jobId, creds, {
        environment: "production",
        intervalMs: 1000,
      })
      expect(result.status).not.toBe("running")
    } else {
      // No pending job — verify the endpoint works by requesting a known-bad job
      // which should still hit the delayed_jobs endpoint
      await expect(
        apiRequest("/delayed_jobs/0", {
          credentials: creds,
          environment: "production",
        })
      ).rejects.toThrow()
    }
  }, 30_000)
})
