const gt = {
  program: require("./src/program"),
  job: require("./src/job"),
  request: require("./src/request"),
  common: require("./src/common"),
  helpers: require("./src/helpers.js"),
}

module.exports = gt

if (require.main === module) {
  async function run() {
    const config = await gt.common.config.load()
    config.save()
  }

  run()
}
