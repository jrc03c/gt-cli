const common = require("../common.js")
const fetch = require("node-fetch")

module.exports = async function (options) {
  // options = {
  //   path: "/foo/bar",
  //   method: "GET",
  //   headers: { ... },
  //   body: { ... },
  //   query: { ... },
  // }
  //
  // note: the only required field is `path`!

  await common.config.load()

  if (typeof options === "string") {
    options = { path: options }
  }

  if (typeof options !== "object") {
    throw new common.GTError(`
      The value passed into the \`gt.request.send\` function must be a string
      (i.e., an API endpoint path) or an object with a \`path\` property!
    `)
  }

  if (!options.path) {
    throw new common.GTError(`
      The \`options\` object passed into the \`gt.request.send\` function must
      have a \`path\` property!
    `)
  }

  const credentials = common.config.credentialsBase64
  const host = common.config.host
  let url = `${host}${options.path}`

  if (options.query) {
    url = url + "?" + new URLSearchParams(options.query)
  }

  const requestOptions = {
    method: options.method || "GET",
    headers: { Authorization: `Basic ${credentials}` },
  }

  if (options.headers) {
    requestOptions.headers = {
      ...requestOptions.headers,
      ...options.headers,
    }
  }

  if (options.body) {
    requestOptions.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
  }

  const response = await fetch(url, requestOptions)
  return response
}
