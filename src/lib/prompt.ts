import { createInterface, type Interface } from "node:readline"

let iface: Interface | null = null
let closed = false
const unreadLines: string[] = []
const waiting: ((line: string) => void)[] = []

/**
 * One shared readline interface for the whole process. A fresh interface per
 * question would swallow any input buffered beyond the first line (so piped
 * answers after the first were lost), and gave no way to notice end of input.
 * Lines are queued as they arrive, since readline drops a line that shows up
 * while no question is pending. The interface is paused between questions so
 * an idle process can exit.
 */
function getInterface(): Interface {
  if (!iface) {
    iface = createInterface({ input: process.stdin, output: process.stdout })
    iface.on("line", line => {
      const waiter = waiting.shift()
      if (waiter) waiter(line)
      else unreadLines.push(line)
    })
    iface.on("close", () => {
      closed = true
      for (const waiter of waiting.splice(0)) waiter("")
    })
  }
  return iface
}

/**
 * Asks a question and resolves with the trimmed answer. Resolves with an
 * empty string once stdin has reached end of input.
 */
export async function ask(question: string): Promise<string> {
  const rl = getInterface()

  const buffered = unreadLines.shift()
  if (buffered !== undefined) {
    process.stdout.write(question)
    return buffered.trim()
  }

  if (closed) return ""

  rl.setPrompt(question)
  rl.resume()
  rl.prompt()

  return new Promise(resolve => {
    waiting.push(line => {
      // The close handler also resolves waiters; pausing then would throw.
      if (!closed) rl.pause()
      resolve(line.trim())
    })
  })
}

/** True once stdin has reached end of input and no buffered lines remain. */
export function inputClosed(): boolean {
  return closed && unreadLines.length === 0
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} (y/N) `)
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
}

export async function choose(
  question: string,
  options: string[],
): Promise<number> {
  console.log(question)
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}. ${options[i]}`)
  }
  const answer = await ask("Enter choice: ")
  const choice = parseInt(answer, 10)
  if (isNaN(choice) || choice < 1 || choice > options.length) {
    console.log("Invalid choice.")
    return -1
  }
  return choice - 1
}
