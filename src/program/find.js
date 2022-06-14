const request = require("../request")

module.exports = async function (query) {
  const options = {
    path: "/programs.json",
    method: "GET",
  }

  if (query) {
    options.query = { query }
  }

  const response = await request.send(options)
  const data = await response.json()
  return data
}
