module.exports = async function build(params) {
  const { prettify } = require("../../src/helpers.js")
  const gt = require("../..")

  const titleIdOrKey = params[0]

  await gt.program.build(titleIdOrKey, info =>
    console.log(prettify(info.status)),
  )

  console.log(
    prettify(
      `Program ${
        typeof titleIdOrKey === "string" ? `"${titleIdOrKey}"` : titleIdOrKey
      } was built successfully!`,
    ),
  )
}
