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
    const program = await gt.program.find(p => p.name.includes("Hello"))
    const contents = "I've changed it again!"
    await gt.program.upload(program.id, contents, false, console.log)
    await gt.program.build(program.id, console.log)
  }

  run()
}
