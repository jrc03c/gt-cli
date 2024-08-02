const get = require("./get.js")
const request = require("../request")

module.exports = async function deleet(titleIdOrKey) {
  const program = await get(titleIdOrKey)

  await request.send({
    path: `/programs/${program.id}`,
    method: "DELETE",
  })

  return true
}
