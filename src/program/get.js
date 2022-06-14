const find = require("./find.js")
const { GTError } = require("../common.js")

module.exports = async function (idOrKey) {
  if (typeof idOrKey !== "string" && typeof idOrKey !== "number") {
    throw new GTError(`
      The value passed into the \`gt.program.get\` function must be a string
      (i.e., a program key) or a number (i.e., a program ID)!
    `)
  }

  return await find(
    program =>
      program.id === parseInt(idOrKey) ||
      program.key.includes(idOrKey.toString())
  )
}
