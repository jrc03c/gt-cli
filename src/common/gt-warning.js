const { prettify } = require("../helpers.js")

class GTWarning {
  constructor(text) {
    console.log(`\x1b[1m\x1b[33mWARNING:\x1b[0m ${prettify(text)}`)
  }
}

module.exports = GTWarning
