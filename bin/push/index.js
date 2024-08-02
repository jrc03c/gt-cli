module.exports = async function (subcommand) {
  const { prettify } = require("../../src/helpers.js")
  const fs = require("fs")
  const gt = require("../..")
  const path = require("path")

  const config = await gt.common.config.load()
  const keys = subcommand ? [subcommand] : Object.keys(config.programs || {})

  if (keys.length === 0) {
    throw new gt.common.GTError(
      "There are no programs listed in your .gtconfig file! Please add some programs first using `gt program add [title, id, or key]` and then run `gt push` again. See `gt help` for more info.",
    )
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const file = path.resolve(config.programs[key])
    const contents = fs.readFileSync(file, "utf8")
    const shouldBuild = true

    gt.program.upload(key, contents, shouldBuild, info => {
      console.log(prettify(info.status))
    })
  }
}
