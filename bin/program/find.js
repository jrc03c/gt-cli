module.exports = async function (params) {
  const { prettify } = require("../../src/helpers.js")
  const gt = require("../..")
  const util = require("util")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a string pattern to match! See `gt help` for more info."
    )
  }

  const query = params[0]
  const results = await gt.program.find(program => program.name.includes(query))
  console.log(prettify(util.inspect(results, { colors: true })))
}
