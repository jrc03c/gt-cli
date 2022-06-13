const gt = {
  // credentials: require("./src/credentials"),
  // program: require("./src/program"),
  // job: require("./src/job"),
  // request: require("./src/request"),
  common: require("./src/common.js"),
  // util: require("./src/helpers.js"),
}

module.exports = gt

if (require.main === module) {
  async function run() {
    await gt.common.config.load()
    console.log(gt.common.config.environment)
    console.log(gt.common.config.host)
    console.log(gt.common.config.username)
    console.log(gt.common.config.password)
    console.log(gt.common.config.credentials)
    console.log(gt.common.config.credentialsBase64)
  }

  run()
}
