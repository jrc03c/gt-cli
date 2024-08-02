module.exports = async function (params) {
  const { prettify } = require("../../src/helpers.js")
  const gt = require("../..")
  const util = require("util")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program title, ID, or key to retrieve a specific program, or use `--all` to retrieve all programs! See `gt help` for more info.",
    )
  }

  let results

  if (params[0] === "--all") {
    results = await gt.program.get()
  } else {
    const titleIdOrKey = params[0]
    results = await gt.program.get(titleIdOrKey)
  }

  console.log(prettify(util.inspect(results, { colors: true })))
}
