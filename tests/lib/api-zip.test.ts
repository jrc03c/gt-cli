import { afterEach, describe, expect, it, vi } from "vitest"
import { downloadProgramZip, generateProgramZip } from "../../src/lib/api.js"
import type { Credentials } from "../../src/types.js"

const creds: Credentials = { email: "a@b.com", password: "secret" }

interface Call {
  url: string
  method: string
  authorization: string | undefined
}

/**
 * Stubs global fetch with a single canned response. Returns the list of calls
 * made so tests can assert on the request the client issued.
 */
function stubFetch(response: Response): Call[] {
  const calls: Call[] = []

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      authorization: (init?.headers as Record<string, string> | undefined)
        ?.Authorization,
    })
    return response
  })

  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("generateProgramZip", () => {
  it("PUTs to the json generate_zip route with basic auth", async () => {
    const calls = stubFetch(new Response("38772251", { status: 200 }))

    await generateProgramZip(37765, creds, "production")

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      "https://www.guidedtrack.com/programs/37765/generate_zip.json",
    )
    expect(calls[0].method).toBe("PUT")
    expect(calls[0].authorization).toBe(
      `Basic ${Buffer.from("a@b.com:secret").toString("base64")}`,
    )
  })

  it("returns the job id from the plain-text response body", async () => {
    stubFetch(new Response("38772251\n", { status: 200 }))

    const jobId = await generateProgramZip(37765, creds, "production")

    expect(jobId).toBe(38772251)
  })

  it("throws when the response body is not a job id", async () => {
    stubFetch(new Response("<html>nope</html>", { status: 200 }))

    await expect(
      generateProgramZip(37765, creds, "production"),
    ).rejects.toThrow(/job id/i)
  })
})

describe("downloadProgramZip", () => {
  it("GETs the json download route with basic auth", async () => {
    const calls = stubFetch(new Response(new Uint8Array([0x50, 0x4b])))

    await downloadProgramZip(37765, creds, "production")

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      "https://www.guidedtrack.com/programs/37765/download.json",
    )
    expect(calls[0].method).toBe("GET")
    expect(calls[0].authorization).toBe(
      `Basic ${Buffer.from("a@b.com:secret").toString("base64")}`,
    )
  })

  it("returns the archive bytes", async () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x99])
    stubFetch(new Response(zip))

    const result = await downloadProgramZip(37765, creds, "production")

    expect(Buffer.from(result.data)).toEqual(Buffer.from(zip))
  })

  it("reads the filename from a quoted content-disposition header", async () => {
    stubFetch(
      new Response(new Uint8Array([0x50, 0x4b]), {
        headers: {
          "content-disposition":
            'attachment; filename="@jrc03c_email_verify-with-otp.zip"',
        },
      }),
    )

    const result = await downloadProgramZip(37765, creds, "production")

    expect(result.filename).toBe("@jrc03c_email_verify-with-otp.zip")
  })

  it("reads the filename from an unquoted content-disposition header", async () => {
    stubFetch(
      new Response(new Uint8Array([0x50, 0x4b]), {
        headers: { "content-disposition": "attachment; filename=thing.zip" },
      }),
    )

    const result = await downloadProgramZip(37765, creds, "production")

    expect(result.filename).toBe("thing.zip")
  })

  it("returns a null filename when the server sends no content-disposition", async () => {
    stubFetch(new Response(new Uint8Array([0x50, 0x4b])))

    const result = await downloadProgramZip(37765, creds, "production")

    expect(result.filename).toBeNull()
  })
})
