import { createInterface } from "node:readline"

const rl = () =>
  createInterface({ input: process.stdin, output: process.stdout })

export async function ask(question: string): Promise<string> {
  const iface = rl()
  return new Promise(resolve => {
    iface.question(question, answer => {
      iface.close()
      resolve(answer.trim())
    })
  })
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} (y/N) `)
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
}

export async function choose(
  question: string,
  options: string[]
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
