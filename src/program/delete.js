const get = require("./get.js")
const request = require("../request")

module.exports = async function (idOrKey) {
  const program = await get(idOrKey)

  await request.send({
    path: `/programs/${program.id}`,
    method: "DELETE",
  })

  return true
}
