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
    console.log(await gt.common.config.environment)
    console.log(await gt.common.config.host)
    console.log(await gt.common.config.username)
    console.log(await gt.common.config.password)
    console.log(await gt.common.config.credentials)
    console.log(await gt.common.config.credentialsBase64)
  }

  run()
}
