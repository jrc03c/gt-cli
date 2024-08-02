module.exports = async function deleet(params) {
  const { Chalk } = await import("chalk")
  const { prettify } = require("../../src/helpers.js")
  const gt = require("../..")
  const inquirer = require("inquirer")

  const chalk = new Chalk()

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify the title, ID, or key of the program to delete! See `gt help` for more info.",
    )
  }

  const titleIdOrKey = params[params.length - 1]
  const program = await gt.program.get(titleIdOrKey)
  const isUnsafe = params.indexOf("--unsafe") > -1
  let shouldDelete = false

  if (isUnsafe) {
    shouldDelete = true
  } else {
    const response1 = await inquirer.prompt([
      {
        type: "list",
        choices: [
          { name: "Yes, I want to delete this program", value: true },
          { name: "No, I don't want to delete this program", value: false },
        ],
        name: "answer",
        message: chalk.red.bold(
          prettify(
            `You are about to delete the program called "${program.name}" from the GuidedTrack servers. (No local copies will be deleted, but the program will be removed from the \`programs\` list in your .gtconfig file.) This action cannot be undone! Are you sure you want to delete this program?`,
          ),
        ),
      },
    ])

    if (response1.answer) {
      const response2 = await inquirer.prompt([
        {
          type: "input",
          name: "answer",
          message: chalk.yellow.bold(
            prettify(
              `To initiate deletion of the program called "${program.name}", please type the program's name here:`,
            ),
          ),
        },
      ])

      if (response2.answer.trim() !== program.name.trim()) {
        throw new gt.common.GTError(
          "The name you typed doesn't match the name of the program!",
        )
      }

      shouldDelete = true
    }
  }

  if (shouldDelete) {
    await gt.program.delete(titleIdOrKey)
    delete gt.common.config.programs[program.key]
    await gt.common.config.save()
    console.log(prettify(`The program was deleted!`))
  } else {
    console.log(prettify("The program was not deleted."))
  }
}
