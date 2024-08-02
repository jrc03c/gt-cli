module.exports = async function config() {
  const gt = require("../..")
  await gt.common.config.load()
  gt.common.config.print()
}
