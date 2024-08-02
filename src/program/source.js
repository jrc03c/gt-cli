const { JSDOM } = require("jsdom")
const get = require("./get.js")
const request = require("../request")

module.exports = async function getSource(titleIdOrKey) {
  const program = await get(titleIdOrKey)
  const { id } = program
  const response = await request.send({ path: `/programs/${id}/edit` })
  const raw = await response.text()
  const dom = new JSDOM(raw)
  return dom.window.document.getElementById("code_contents").innerHTML
}
