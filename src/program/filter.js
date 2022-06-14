const { GTError } = require("../common.js")
const { isUndefined } = require("../helpers.js")
const find = require("./find.js")

module.exports = async function (fn) {
  if (!isUndefined(fn) && typeof fn !== "function") {
    throw new GTError(`
      The value passed into the \`gt.program.filter\` function must be a
      function!
    `)
  }

  const all = await find()

  if (fn) {
    return all.filter(fn)
  }

  return all
}
