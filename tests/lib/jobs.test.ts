import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/api.js", () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from "../../src/lib/api.js"
import { pollJob } from "../../src/lib/jobs.js"
import type { Credentials, Job } from "../../src/types.js"

const mockApiRequest = vi.mocked(apiRequest)
const creds: Credentials = { email: "test@example.com", password: "secret" }

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function mockJobResponse(job: Job) {
  mockApiRequest.mockResolvedValueOnce({
    json: () => Promise.resolve(job),
  } as Response)
}

describe("pollJob", () => {
  it("returns immediately when first poll shows completed", async () => {
    mockJobResponse({ id: 42, status: "completed" })

    const result = await pollJob(42, creds, { environment: "development" })

    expect(result).toEqual({ id: 42, status: "completed" })
    expect(mockApiRequest).toHaveBeenCalledTimes(1)
  })

  it("returns immediately when first poll shows failed", async () => {
    mockJobResponse({ id: 42, status: "failed" })

    const result = await pollJob(42, creds, { environment: "development" })

    expect(result).toEqual({ id: 42, status: "failed" })
    expect(mockApiRequest).toHaveBeenCalledTimes(1)
  })

  it("polls multiple times until job completes", async () => {
    mockJobResponse({ id: 42, status: "running" })
    mockJobResponse({ id: 42, status: "running" })
    mockJobResponse({ id: 42, status: "completed" })

    const promise = pollJob(42, creds, { environment: "development" })

    // Advance past the first two polling intervals
    await vi.advanceTimersByTimeAsync(3000)
    await vi.advanceTimersByTimeAsync(3000)

    const result = await promise

    expect(result).toEqual({ id: 42, status: "completed" })
    expect(mockApiRequest).toHaveBeenCalledTimes(3)
  })

  it("calls the correct endpoint", async () => {
    mockJobResponse({ id: 99, status: "completed" })

    await pollJob(99, creds, { environment: "development" })

    expect(mockApiRequest).toHaveBeenCalledWith("/delayed_jobs/99", {
      credentials: creds,
      environment: "development",
    })
  })

  it("uses default 3s interval", async () => {
    mockJobResponse({ id: 1, status: "running" })
    mockJobResponse({ id: 1, status: "completed" })

    const promise = pollJob(1, creds, { environment: "development" })

    // At 2.9s, should still be waiting
    await vi.advanceTimersByTimeAsync(2900)
    expect(mockApiRequest).toHaveBeenCalledTimes(1)

    // At 3s, second poll fires
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise

    expect(result).toEqual({ id: 1, status: "completed" })
    expect(mockApiRequest).toHaveBeenCalledTimes(2)
  })

  it("respects custom interval", async () => {
    mockJobResponse({ id: 1, status: "running" })
    mockJobResponse({ id: 1, status: "completed" })

    const promise = pollJob(1, creds, {
      environment: "development",
      intervalMs: 500,
    })

    // At 400ms, should still be waiting
    await vi.advanceTimersByTimeAsync(400)
    expect(mockApiRequest).toHaveBeenCalledTimes(1)

    // At 500ms, second poll fires
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise

    expect(result).toEqual({ id: 1, status: "completed" })
    expect(mockApiRequest).toHaveBeenCalledTimes(2)
  })
})
