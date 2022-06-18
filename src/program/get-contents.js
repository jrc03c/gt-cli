const { JSDOM } = require("jsdom")
const get = require("./get.js")
const request = require("../request")

async function getContents(idOrKey) {
  const program = await get(idOrKey)
  const { id } = program
  const response = await request.send({ path: `/programs/${id}/edit` })
  const raw = await response.text()
  const dom = new JSDOM(raw)
  return dom.window.document.getElementById("code_contents").innerHTML
}

module.exports = getContents
