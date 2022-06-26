module.exports = async function (subcommand, params) {
  const { exec } = require("child_process")
  const gt = require("../..")

  if (subcommand && subcommand === "search") {
    if (params.length === 0) {
      throw new gt.common.GTError(
        "You didn't provide a search query! See `gt help` for more info."
      )
    }

    exec(`xdg-open https://docs.guidedtrack.com/search/?query=${params[0]}`)
  } else {
    exec(`xdg-open https://docs.guidedtrack.com`)
  }
}
