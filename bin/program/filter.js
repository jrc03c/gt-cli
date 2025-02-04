module.exports = async function filter(params) {
  const gt = require("../..")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a string pattern to match! See `gt help` for more info.",
    )
  }

  const query = params[0]

  const results = await gt.program.filter(program =>
    program.name.includes(query),
  )

  return console.log(JSON.stringify(results, null, 2))
}
