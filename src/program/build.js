const { GTError } = require("../common.js")
const { isUndefined, pause } = require("../helpers.js")
const { poll } = require("../job")
const get = require("./get.js")
const request = require("../request")

async function getProgramEmbedInfo(key) {
  const response = await request.send({ path: `/programs/${key}/embed` })
  return await response.json()
}

async function getProgramContents(key) {
  const embedInfo = await getProgramEmbedInfo(key)
  const runID = embedInfo.run_id
  const accessKey = embedInfo.access_key

  const response = await request.send({
    path: `/runs/${runID}/contents`,
    headers: { "X-GuidedTrack-Access-Key": accessKey },
  })

  return await response.json()
}

async function build(idOrKey, callback) {
  if (!isUndefined(callback) && typeof callback !== "function") {
    throw new GTError(
      `The second argument to the \`gt.program.build\` function (if used) must be a function!`
    )
  }

  callback = callback || (() => {})

  // fetch the program
  callback({ finished: false, status: `Fetching program ${idOrKey}...` })

  const program = await get(idOrKey)
  const key = program.key

  // get the program's contents
  callback({ finished: false, status: `Getting program contents...` })

  const contents = await getProgramContents(key)
  const { job } = contents

  if (isUndefined(job)) {
    callback({
      finished: true,
      status: "No changes were made, so building was not initiated.",
    })

    return undefined
  }

  // poll the build job status
  let status = "running"

  while (status === "running") {
    callback({
      finished: false,
      status: "Waiting for build job to finish...",
    })

    status = (await poll(job)).status
  }

  // get the updated program contents; if there were any compilation errors,
  // then throw them; otherwise, return true
  callback({ finished: false, status: "Checking for compilation errors..." })
  const updatedContents = await getProgramContents(key)
  const name = updatedContents.starting_program
  const errors = updatedContents[name].metadata.errors

  if (errors && errors.length > 0) {
    throw new GTError(
      [`The update succeeded, but there were some syntax errors:`]
        .concat(errors.map((e, i) => `(${i + 1}) ${e}`))
        .join("\n")
    )
  }

  callback({ finished: true, status: "Build finished successfully!" })
  return true
}

module.exports = build
