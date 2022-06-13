module.exports = async function (query) {
  const response = await sendRequest({
    path: "/programs.json",
    method: "GET",
    query: { query },
  })

  const data = await response.json()
  return data
}
