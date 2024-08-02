const get = require("./get.js")
const request = require("../request")

module.exports = async function getData(titleIdOrKey) {
  const program = await get(titleIdOrKey)
  const { id } = program
  const response = await request.send({ path: `/programs/${id}/csv` })
  return await response.text()
}
