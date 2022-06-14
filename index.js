const gt = {
  program: require("./src/program"),
  job: require("./src/job"),
  request: require("./src/request"),
  common: require("./src/common.js"),
  helpers: require("./src/helpers.js"),
}

module.exports = gt

if (require.main === module) {
  async function run() {
    const result = await gt.program.build(19868)
    console.log(result)
  }

  run()
}
