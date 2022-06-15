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
    const contents = "*question: Why?\n\tWhy not?\n\tBecause..."
    const shouldBuild = true

    const result = await gt.program.update(
      19868,
      contents,
      shouldBuild,
      status => console.log(status.status)
    )

    console.log(result)
  }

  run()
}
