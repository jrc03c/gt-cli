const request = require("../request")
const get = require("./get.js")
const { GTError } = require("../common.js")

module.exports = async function (name) {
  const response = await request.send({
    path: "/programs",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { name },
  })

  const data = await response.json()

  if (data.name && data.name[0] === "has already been taken") {
    throw new GTError(`
      This program name has already been taken! Please try a different name.
    `)
  }

  const parts = data.program_path.split("/")
  const id = parts[parts.length - 1]
  return await get(id)

  // note: we should ask if people want to add the newly-created files to the
  // configuration file (and provide an equivalent parameter)!
}
