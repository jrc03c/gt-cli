const { GTError } = require("../common")
const { isUndefined } = require("../helpers.js")
const { poll } = require("../job")
const build = require("./build.js")
const get = require("./get.js")
const request = require("../request")

module.exports = async function (
  titleIdOrKey,
  contents,
  shouldBuild,
  callback
) {
  if (isUndefined(titleIdOrKey)) {
    throw new GTError(
      `The first value passed into the \`gt.program.upload\` function must be a string (i.e., a program key) or a number (i.e., a program ID)!`
    )
  }

  if (isUndefined(contents) || typeof contents !== "string") {
    throw new GTError(
      `The second value passed into the \`gt.program.upload\` function must be a string (i.e., the code contents of the program).`
    )
  }

  if (!isUndefined(callback) && typeof callback !== "function") {
    throw new GTError(
      `The fourth value passed into the \`gt.program.upload\` function must be a function!`
    )
  }

  callback = callback || (() => {})

  callback({
    finished: false,
    status: `Fetching program ${titleIdOrKey}...`,
    progress: 1 / 5,
  })

  const id = (await get(titleIdOrKey)).id

  callback({
    finished: false,
    status: "Uploading program contents...",
    progress: 2 / 5,
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
      status: "Waiting for upload job to finish...",
      progress: 3 / 5,
    })

    status = (await poll(job)).status
  }

  shouldBuild = !isUndefined(shouldBuild) ? shouldBuild : true

  if (shouldBuild) {
    callback({
      finished: false,
      status: "Upload succeeded! Now rebuilding the program...",
      progress: 4 / 5,
    })

    await build(id, info => {
      callback({
        finished: false,
        status: info.status,
        progress: 4 / 5,
      })
    })
  }

  callback({
    finished: true,
    status: "Upload and build finished successfully!",
    progress: 5 / 5,
  })

  return true
}
