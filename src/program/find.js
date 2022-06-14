const request = require("../request")

module.exports = async function (query) {
  const response = await request.send({
    path: "/programs.json",
    method: "GET",
    query: { query },
  })

  const data = await response.json()
  return data
}
