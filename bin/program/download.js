module.exports = async function (params) {
  const gt = require("../..")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify the title, ID, or key of the program to download! See `gt help` for more info."
    )
  }

  const titleIdOrKey = params[params.length - 1]
  const contents = await gt.program.download(titleIdOrKey)
  console.log(contents)
}
