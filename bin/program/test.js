const { exec } = require("child_process")

module.exports = async function test(params) {
  const gt = require("../..")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program title, ID, or key! See `gt help` for more info.",
    )
  }

  const mode =
    params.indexOf("--mode") > -1
      ? params[params.indexOf("--mode") + 1]
      : "preview"

  const titleIdOrKey = params[params.length - 1]
  const program = await gt.program.get(titleIdOrKey)
  const url = `https://gt-tester.vercel.app/test/?id=${program.id}&mode=${mode}`
  exec(`xdg-open "${url}"`)
}
