const { GTError } = require("../common.js")
const { isUndefined } = require("../helpers.js")
const request = require("../request")

module.exports = async function (jobID) {
  if (isUndefined(jobID)) {
    throw new GTError(
      `The value passed into the \`gt.job.poll\` function must be a number representing a job ID number!`
    )
  }

  const response = await request.send({
    path: `/delayed_jobs/${jobID}`,
    method: "GET",
  })

  return await response.json()
}
