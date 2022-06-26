module.exports = async function (params) {
  const { prettify, writeFileSafe } = require("../../src/helpers.js")
  const gt = require("../..")
  const inquirer = require("inquirer")
  const path = require("path")

  const file = await (async () => {
    if (params.indexOf("--file") > -1) {
      return path.resolve(params[params.indexOf("--file") + 1])
    } else {
      const response = await inquirer.prompt([
        {
          type: "input",
          name: "path",
          message: prettify(
            "Where should the downloaded program file be stored? Please specify a path:"
          ),
        },
      ])

      return path.resolve(response.path)
    }
  })()

  const titleIdOrKey = params[params.length - 1].trim()

  const program = await gt.program.find(program => {
    return (
      program.name === titleIdOrKey ||
      program.id === parseInt(titleIdOrKey) ||
      program.key === titleIdOrKey
    )
  })

  if (program) {
    const configFilePath = findUpward(".gtconfig")
    const parts = configFilePath.split("/")
    const dir = parts.slice(0, parts.length - 1).join("/")
    gt.common.config.programs[program.key] = file.replace(dir + "/", "")
    await gt.common.config.save()

    const code = await gt.program.download(program.key)
    writeFileSafe(file, code)

    console.log(
      prettify(
        `The program "${titleIdOrKey}" was added to your .gtconfig file, and its source code was saved to "${file}"!`
      )
    )
  } else {
    throw new gt.common.GTError("No such program was found!")
  }
}
