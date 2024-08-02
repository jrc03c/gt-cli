const { GTError } = require("../common")
const { isUndefined } = require("../helpers.js")
const { poll } = require("../job")
const get = require("./get.js")
const request = require("../request")

module.exports = async function create(name) {
  if (isUndefined(name)) {
    throw new GTError(
      `The value passed into the \`gt.program.create\` function must be a string representing the name of the new program!`,
    )
  }

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
  const jobID = data.job_id
  let status = "running"

  while (status === "running") {
    status = (await poll(jobID)).status
  }

  return await get(id)
}
