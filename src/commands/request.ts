import type { Command } from "commander"
import { apiRequest, getEnvironment } from "../lib/api.js"
import { resolveCredentials } from "../lib/auth.js"

export function registerRequest(program: Command): void {
  program
    .command("request")
    .description("Send a generic API request")
    .argument("<path>", "API path (e.g., /programs.json)")
    .option("-X, --method <method>", "HTTP method", "GET")
    .option("-d, --data <json>", "Request body (JSON string)")
    .option(
      "-H, --header <header...>",
      "Additional headers (key:value)"
    )
    .action(
      async (
        path: string,
        options: { method: string; data?: string; header?: string[] }
      ) => {
        const credentials = resolveCredentials()
        const environment = getEnvironment()

        const headers: Record<string, string> = {}
        if (options.header) {
          for (const h of options.header) {
            const idx = h.indexOf(":")
            if (idx === -1) {
              console.error(`Invalid header format: "${h}" (expected key:value)`)
              process.exit(1)
            }
            headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim()
          }
        }

        let body: unknown
        if (options.data) {
          try {
            body = JSON.parse(options.data)
          } catch {
            console.error("Invalid JSON body")
            process.exit(1)
          }
        }

        const response = await apiRequest(path, {
          method: options.method,
          credentials,
          environment,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body,
        })

        const text = await response.text()
        try {
          const json = JSON.parse(text)
          console.log(JSON.stringify(json, null, 2))
        } catch {
          console.log(text)
        }
      }
    )
}
