const { exec } = require("child_process")

module.exports = async function (params) {
  const gt = require("../..")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program title, ID, or key! See `gt help` for more info."
    )
  }

  const titleIdOrKey = params[params.length - 1]
  const program = await gt.program.get(titleIdOrKey)
  exec(`xdg-open https://www.guidedtrack.com/programs/${program.key}/run`)
}
