module.exports = async function () {
  const { prettify, writeFileSafe } = require("../../src/helpers.js")
  const gt = require("../..")
  const path = require("path")

  const config = await gt.common.config.load()
  const keys = Object.keys(config.programs || {})

  if (keys.length === 0) {
    throw new gt.common.GTError(
      "There are no programs listed in your .gtconfig file! Please add some programs first using `gt program add [title, id, or key]` and then run `gt pull` again. See `gt help` for more info.",
    )
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    console.log(prettify(`Fetching the contents of program "${key}" ...`))

    const file = path.resolve(config.programs[key])
    const contents = await gt.program.download(key)
    writeFileSafe(file, contents)
  }
}
