import type { Credentials, Program } from "../src/types.js"
import { apiRequest, fetchProgramSource, findProgram } from "../src/lib/api.js"
import { getEmbedInfo } from "../src/lib/build.js"

const ENV = "production" as const

export function getCredentials(): Credentials {
  const email = process.env.GT_EMAIL
  const password = process.env.GT_PASSWORD
  if (!email || !password) {
    throw new Error(
      "GT_EMAIL and GT_PASSWORD environment variables must be set to run tests"
    )
  }
  return { email, password }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function createTestProgram(
  credentials: Credentials,
  name?: string
): Promise<Program> {
  const programName = name ?? `gt-cli-test-${Date.now()}`

  await apiRequest("/programs", {
    method: "POST",
    credentials,
    environment: ENV,
    body: { name: programName },
  })

  // Wait for async program creation to complete, then find it
  let program: Program | null = null
  for (let attempt = 0; attempt < 15; attempt++) {
    await sleep(2000)
    program = await findProgram(programName, credentials, ENV)
    if (program) break
  }

  if (!program) {
    throw new Error(`Failed to find program "${programName}" after creation`)
  }

  // Wait until the program is fully operational (edit page + embed both work)
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await fetchProgramSource(program.id, credentials, ENV)
      await getEmbedInfo(program.key, credentials, ENV)
      return program
    } catch {
      await sleep(2000)
    }
  }

  return program
}

export async function deleteTestProgram(
  id: number,
  credentials: Credentials
): Promise<void> {
  try {
    await apiRequest(`/programs/${id}.json`, {
      method: "DELETE",
      credentials,
      environment: ENV,
    })
  } catch {
    // Ignore errors during cleanup (program may already be deleted)
  }
}

export async function pushProgramContents(
  id: number,
  contents: string,
  credentials: Credentials
): Promise<void> {
  await apiRequest(`/programs/${id}.json`, {
    method: "PUT",
    credentials,
    environment: ENV,
    body: { contents, program: { description: "" } },
  })
}
