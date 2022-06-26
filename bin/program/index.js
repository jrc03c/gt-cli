module.exports = async function (subcommand, params) {
  await gt.common.config.load()

  if (subcommand === "add") {
    return await require("./add.js")(params)
  }

  if (subcommand === "build") {
    return await require("./build.js")(params)
  }

  if (subcommand === "create") {
    return await require("./create.js")(params)
  }

  if (subcommand === "delete") {
    return await require("./delete.js")(params)
  }

  if (subcommand === "download") {
    return await require("./download.js")(params)
  }

  if (subcommand === "filter") {
    return await require("./filter.js")(params)
  }

  if (subcommand === "find") {
    return await require("./find.js")(params)
  }

  if (subcommand === "get") {
    return await require("./get.js")(params)
  }

  if (subcommand === "list") {
    return await require("./get.js")()
  }

  if (subcommand === "upload") {
    return await require("./upload.js")(params)
  }
}
