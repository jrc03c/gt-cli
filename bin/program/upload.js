module.exports = async function (params) {
  const { prettify } = require("../../src/helpers.js")
  const fs = require("fs")
  const gt = require("../..")
  const path = require("path")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify at least one program title, ID, or key! Multiple IDs and/or keys should be separated by spaces. See `gt help` for more info.",
    )
  }

  const shouldBuild = params.indexOf("--no-build") < 0
  const titleIdOrKey = params[params.length - 1]
  const program = await gt.program.get(titleIdOrKey)

  if (!gt.common.config.programs[program.key]) {
    throw new gt.common.GTError(
      `The program "${titleIdOrKey}" (which has a key of "${program.key}") isn't listed in your .gtconfig file! First add it using \`gt program add [title, id, or key]\`!`,
    )
  }

  const file = path.resolve(gt.common.config.programs[program.key])
  const raw = fs.readFileSync(file, "utf8")

  await gt.program.upload(program.key, raw, shouldBuild, info =>
    console.log(prettify(info.status)),
  )
}
