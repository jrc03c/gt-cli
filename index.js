const gt = {
  credentials: require("./src/credentials"),
  program: require("./src/program"),
  job: require("./src/job"),
  request: require("./src/request"),
  common: require("./src/common.js"),
  util: require("./src/helpers.js"),
}

module.exports = gt

if (require.main === module) {
  async function run() {
    await getCredentials()
    await getEnvironment()
  }

  run()
}
