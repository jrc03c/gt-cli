const { GTError } = require("../common.js")
const { isUndefined } = require("../helpers.js")
const build = require("./build.js")
const get = require("./get.js")
const { poll } = require("../job")
const request = require("../request")

module.exports = async function (idOrKey, contents, shouldBuild, callback) {
  if (isUndefined(idOrKey)) {
    throw new GTError(`
      The first value passed into the \`gt.program.update\` function must be a
      string (i.e., a program key) or a number (i.e., a program ID)!
    `)
  }

  if (isUndefined(contents) || typeof contents !== "string") {
    throw new GTError(`
      The second value passed into the \`gt.program.update\` function must be a
      string (i.e., the code contents of the program).
    `)
  }

  if (!isUndefined(callback) && typeof callback !== "function") {
    throw new GTError(`
      The fourth value passed into the \`gt.program.update\` function must be a
      function!
    `)
  }

  callback = callback || (() => {})
  callback({ finished: false, status: `Fetching program ${idOrKey}...` })

  const id = (await get(idOrKey)).id

  callback({ finished: false, status: "Updating program contents..." })

  const response = await request.send({
    path: `/programs/${id}.json`,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: { contents },
  })

  const data = await response.json()
  const job = data.job_id
  let status = "running"

  while (status === "running") {
    callback({
      finished: false,
      status: "Waiting for update job to finish...",
    })

    status = (await poll(job)).status
  }

  shouldBuild = !isUndefined(shouldBuild) ? shouldBuild : true

  if (shouldBuild) {
    callback({
      finished: true,
      status: "Update succeeded! Now rebuilding the program...",
    })

    await build(id, callback)
  }

  callback({
    finished: true,
    status: "Update and build finished successfully!",
  })

  return true
}
