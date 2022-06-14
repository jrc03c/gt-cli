const request = require("../request")

module.exports = async function (jobID) {
  const response = await request.send({
    path: `/delayed_jobs/${jobID}`,
    method: "GET",
  })

  return await response.json()
}
