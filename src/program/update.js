const { GTError } = require("../common.js")
const { isUndefined } = require("../helpers.js")
const { poll } = require("../job")
const build = require("./build.js")
const get = require("./get.js")
const request = require("../request")

module.exports = async function (idOrKey, contents, shouldBuild, callback) {
  if (isUndefined(idOrKey)) {
    throw new GTError(
      `The first value passed into the \`gt.program.update\` function must be a string (i.e., a program key) or a number (i.e., a program ID)!`
    )
  }

  if (isUndefined(contents) || typeof contents !== "string") {
    throw new GTError(
      `The second value passed into the \`gt.program.update\` function must be a string (i.e., the code contents of the program).`
    )
  }

  if (!isUndefined(callback) && typeof callback !== "function") {
    throw new GTError(
      `The fourth value passed into the \`gt.program.update\` function must be a function!`
    )
  }

  callback = callback || (() => {})

  callback({
    finished: false,
    status: `Fetching program ${idOrKey}...`,
    step: 1 / 5,
  })

  const id = (await get(idOrKey)).id

  callback({
    finished: false,
    status: "Updating program contents...",
    step: 2 / 5,
  })

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
      step: 3 / 5,
    })

    status = (await poll(job)).status
  }

  shouldBuild = !isUndefined(shouldBuild) ? shouldBuild : true

  if (shouldBuild) {
    callback({
      finished: true,
      status: "Update succeeded! Now rebuilding the program...",
      step: 4 / 5,
    })

    await build(id, callback)
  }

  callback({
    finished: true,
    status: "Update and build finished successfully!",
    step: 5 / 5,
  })

  return true
}
