module.exports = async function request(subcommand, params) {
  const gt = require("../..")
  await gt.common.config.load()

  if (subcommand === "send") {
    if (params.length === 0) {
      throw new gt.common.GTError(
        "For requests, you must specify a path! See `gt help` for more info.",
      )
    }

    const path = params[params.length - 1]

    const method = (() => {
      const index = params.indexOf("--method")

      if (index > -1) {
        return params[index + 1]
      } else {
        return "GET"
      }
    })()

    const headers = (() => {
      const index = params.indexOf("--headers")

      if (index > -1) {
        try {
          return JSON.parse(params[index + 1])
        } catch {
          throw new gt.common.GTError(
            "The value you provided for the `--headers` option doesn't appear to be valid JSON! See `gt help` for more info.",
          )
        }
      } else {
        return null
      }
    })()

    const body = (() => {
      const index = params.indexOf("--body")

      if (index > -1) {
        try {
          return JSON.parse(params[index + 1])
        } catch {
          throw new gt.common.GTError(
            "The value you provided for the `--body` option doesn't appear to be valid JSON! See `gt help` for more info.",
          )
        }
      } else {
        return null
      }
    })()

    const query = (() => {
      const index = params.indexOf("--query")

      if (index > -1) {
        try {
          return JSON.parse(params[index + 1])
        } catch {
          throw new gt.common.GTError(
            "The value you provided for the `--query` option doesn't appear to be valid JSON! See `gt help` for more info.",
          )
        }
      } else {
        return null
      }
    })()

    const response = await gt.request.send({
      path,
      method,
      headers,
      body,
      query,
    })

    const data = await response.json()
    console.log(data)
  }
}
