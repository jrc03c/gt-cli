const { GTError } = require("../common")
const { isUndefined } = require("../helpers.js")
const request = require("../request")

module.exports = async function (idOrKey) {
  if (
    !isUndefined(idOrKey) &&
    typeof idOrKey !== "string" &&
    typeof idOrKey !== "number"
  ) {
    throw new GTError(
      `The value passed into the \`gt.program.get\` function must be a string (i.e., a program key), a number (i.e., a program ID), or null / undefined (to fetch all programs)!`
    )
  }

  const response = await request.send({
    path: "/programs.json",
    method: "GET",
  })

  const results = await response.json()

  if (isUndefined(idOrKey)) {
    return results
  } else {
    const out = results.find(
      program =>
        program.id === parseInt(idOrKey) || program.key === idOrKey.toString()
    )

    if (!out) {
      throw new GTError(`No such program exists!`)
    }

    return out
  }
}
