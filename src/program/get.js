const find = require("./find.js")
const { GTError } = require("../helpers.js")

module.exports = async function (idOrKey) {
  if (typeof idOrKey !== "string" && typeof idOrKey !== "number") {
    throw new GTError(`
      The value passed into the \`get\` function must be a string (i.e., a
      program key) or a number (i.e., a program ID)!
    `)
  }

  const all = await find()

  const program = all.find(
    program =>
      program.id === parseInt(idOrKey) ||
      program.key.includes(idOrKey.toString())
  )

  if (program) return program
  return null
}
