module.exports = async function (jobID) {
  const response = await sendRequest({
    path: `/delayed_jobs/${jobID}`,
    method: "GET",
  })

  const data = await response.json()
  return data
}
