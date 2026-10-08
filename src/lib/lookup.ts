import type { Credentials, GtEnvironment, Program } from "../types.js"
import {
  findProgramByKey,
  findProgramByTitle,
  getProgram,
  searchPrograms,
} from "./api.js"
import { ask, choose } from "./prompt.js"

/**
 * Looks up a program by name search. An exact title match wins; otherwise,
 * when several programs match, the user picks one. Returns null when nothing
 * matches or the user declines to pick.
 */
export async function searchForProgram(
  query: string,
  credentials: Credentials,
  environment: GtEnvironment,
): Promise<Program | null> {
  process.stdout.write(`Searching for "${query}" in ${environment}... `)
  const matches = await searchPrograms(query, credentials, environment)

  if (matches.length === 0) {
    console.log("no matches.")
    return null
  }

  const exact = matches.find(p => p.name === query)
  if (exact) {
    console.log(`found! ("${exact.name}")`)
    return exact
  }

  if (matches.length === 1) {
    console.log(`found! ("${matches[0].name}")`)
    return matches[0]
  }

  console.log(`${matches.length} matches.`)
  const index = await choose(
    "Which program do you mean?",
    matches.map(p => `${p.name} (id: ${p.id}, key: ${p.key})`),
  )

  return index === -1 ? null : matches[index]
}

/**
 * Interactively asks which identifier to use (title, ID, or key), prompts for
 * its value, and looks the program up. Returns null when the user gives an
 * unusable answer or no program matches.
 */
export async function promptForProgram(
  credentials: Credentials,
  environment: GtEnvironment,
): Promise<Program | null> {
  const idType = await choose(
    "Which identifier do you want to use to find the program?",
    [
      'The program\'s title (e.g., "My Cool Program")',
      "The program's ID (e.g., 12345)",
      'The program\'s key (e.g., "abc1234")',
    ],
  )

  if (idType === -1) return null

  let found: Program | null = null

  if (idType === 0) {
    const title = await ask("Enter program title: ")
    if (!title) return null
    process.stdout.write(`Looking up "${title}" in ${environment}... `)
    found = await findProgramByTitle(title, credentials, environment)
  } else if (idType === 1) {
    const idStr = await ask("Enter program ID: ")
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      console.log("Invalid ID.")
      return null
    }
    process.stdout.write(`Looking up program ${id} in ${environment}... `)
    found = await getProgram(id, credentials, environment)
  } else {
    const key = await ask("Enter program key: ")
    if (!key) return null
    process.stdout.write(`Looking up program "${key}" in ${environment}... `)
    found = await findProgramByKey(key, credentials, environment)
  }

  if (!found) {
    console.log("not found.")
    return null
  }

  console.log(`found! ("${found.name}")`)
  return found
}
