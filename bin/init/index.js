module.exports = async function init() {
  const { prettify } = require("../../src/helpers.js")
  const gt = require("../..")
  const path = require("path")

  await gt.common.config.load()
  const configFilePath = path.join(process.cwd(), ".gtconfig")
  await gt.common.config.save(configFilePath)

  console.log(prettify(`Your new config file was saved to ${configFilePath}!`))
}
