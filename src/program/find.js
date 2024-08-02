const { GTError } = require("../common")
const get = require("./get.js")

module.exports = async function (fn) {
  if (typeof fn !== "function") {
    throw new GTError(
      `The value passed into the \`gt.program.find\` function must be a function!`,
    )
  }

  const all = await get()
  return all.find(fn)
}
