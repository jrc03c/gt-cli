module.exports = async function create(params) {
  const { Chalk } = await import("chalk")
  const { prettify, writeFileSafe } = require("../../src/helpers.js")
  const gt = require("../..")
  const inquirer = require("inquirer")

  const chalk = new Chalk()

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program name! See `gt help` for more info.",
    )
  }

  const name = params[params.length - 1]
  const program = await gt.program.create(name)
  let shouldUpdateConfig

  console.log(
    prettify(`
        Program "${name}" was created successfully!
        ID:       ${program.id}
        Key:      ${program.key}
        Edit:     https://www.guidedtrack.com/programs/${program.id}/edit
        Preview:  https://www.guidedtrack.com/programs/${program.key}/preview
        Run:      https://www.guidedtrack.com/programs/${program.key}/run
        ---
      `)
      .split("\n")
      .map(line => {
        const indentation = line.slice(
          0,
          line.split("").findIndex(s => !s.match(/\s/g)),
        )

        if (line.match(/Program.*?!/g)) {
          return indentation + chalk.green.bold(line.trim())
        }

        const itemsToReplace = ["ID:", "Key:", "Edit:", "Preview:", "Run:"]

        for (let i = 0; i < itemsToReplace.length; i++) {
          const item = itemsToReplace[i]

          if (line.trim().startsWith(item)) {
            return indentation + chalk.blue.bold(item) + line.split(item)[1]
          }
        }

        return line
      })
      .join("\n"),
  )

  if (params.indexOf("--add") > -1) {
    shouldUpdateConfig = true
  } else {
    const response = await inquirer.prompt([
      {
        type: "list",
        choices: [
          { name: "Yes", value: true },
          { name: "No", value: false },
        ],
        name: "answer",
        message: prettify(
          "Would you like for us to add this program to your .gtconfig file?",
        ),
      },
    ])

    shouldUpdateConfig = response.answer
  }

  if (shouldUpdateConfig) {
    const response = await inquirer.prompt([
      {
        type: "input",
        name: "path",
        message: prettify(
          "Where should we store this program's file? Please specify a path:",
        ),
      },
    ])

    gt.common.config.programs[program.key] = response.path
    writeFileSafe(response.path, "")
    await gt.common.config.save()
  }
}
