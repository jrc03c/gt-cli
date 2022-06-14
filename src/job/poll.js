const request = require("../request")

module.exports = async function (jobID) {
  const response = await request.send({
    path: `/delayed_jobs/${jobID}`,
    method: "GET",
  })

  const data = await response.json()
  return data
}
