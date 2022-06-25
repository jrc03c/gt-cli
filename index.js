const gt = {
  program: require("./src/program"),
  job: require("./src/job"),
  request: require("./src/request"),
  common: require("./src/common"),
  helpers: require("./src/helpers.js"),
}

module.exports = gt

if (require.main === module) {
  function makeKey(n) {
    let out = ""
    const alpha = "0123456789abcdef"
    while (out.length < n) out += alpha[parseInt(Math.random() * alpha.length)]
    return out
  }

  async function run() {
    const secrets = require("./secrets.json")
    const config = await gt.common.config.load(secrets)
    const data = await gt.program.create(makeKey(32))
    console.log(data)
  }

  run()
}
