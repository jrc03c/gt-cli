const { GTError } = require("../common")
const { isUndefined } = require("../helpers.js")
const request = require("../request")

module.exports = async function getInfo(titleIdOrKey) {
  if (
    !isUndefined(titleIdOrKey) &&
    typeof titleIdOrKey !== "string" &&
    typeof titleIdOrKey !== "number"
  ) {
    throw new GTError(
      `The value passed into the \`gt.program.get\` function must be a string (i.e., a program key or title), a number (i.e., a program ID), or null / undefined (to fetch all programs)!`,
    )
  }

  const response = await request.send({
    path: "/programs.json",
    method: "GET",
  })

  const results = await response.json()

  if (isUndefined(titleIdOrKey)) {
    return results
  } else {
    const out = results.find(
      program =>
        program.id === parseInt(titleIdOrKey) ||
        program.key === titleIdOrKey.toString() ||
        program.name === titleIdOrKey.toString(),
    )

    if (!out) {
      throw new GTError(
        `Either the target program doesn't exist or you don't have permission to access it!`,
      )
    }

    return out
  }
}
