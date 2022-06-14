const { GTError } = require("../common.js")
const { isUndefined } = require("../helpers.js")
const request = require("../request")

module.exports = async function (fn) {
  if (!isUndefined(fn) && typeof fn !== "function") {
    throw new GTError(`
      The value passed into the \`gt.program.find\` function must be a
      function!
    `)
  }

  const response = await request.send({
    path: "/programs.json",
    method: "GET",
  })

  const all = await response.json()

  if (fn) {
    const program = all.find(fn)
    if (program) return program
    return null
  }

  return all
}
