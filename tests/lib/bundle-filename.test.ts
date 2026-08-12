import { describe, expect, it } from "vitest"
import { bundleFilename } from "../../src/lib/files.js"

describe("bundleFilename", () => {
  it("uses the filename the server supplied", () => {
    expect(
      bundleFilename(
        "@jrc03c_email_verify-with-otp.zip",
        "@jrc03c/email/verify-with-otp",
      ),
    ).toBe("@jrc03c_email_verify-with-otp.zip")
  })

  it("strips directory components from the server filename", () => {
    expect(bundleFilename("../../etc/evil.zip", "whatever")).toBe("evil.zip")
  })

  it("derives from the program name when the server sends none", () => {
    expect(bundleFilename(null, "@jrc03c/email/verify-with-otp")).toBe(
      "@jrc03c_email_verify-with-otp.zip",
    )
  })

  it("falls back to the program name when the server filename has no basename", () => {
    expect(bundleFilename("/", "my-program")).toBe("my-program.zip")
  })
})
