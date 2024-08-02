#!/usr/bin/env node

async function run() {
  const args = process.argv.slice(2)
  const command = args[0]
  const subcommand = args[1]
  const params = args.slice(2)

  if (command === "docs") {
    return await require("./docs")(subcommand, params)
  }

  if (command === "help") {
    return await require("./help")()
  }

  if (command === "init") {
    return await require("./init")()
  }

  if (command === "program") {
    return await require("./program")(subcommand, params)
  }

  if (command === "pull") {
    return await require("./pull")(subcommand, params)
  }

  if (command === "push") {
    return await require("./push")(subcommand, params)
  }

  if (command === "request") {
    return await require("./request")(subcommand, params)
  }

  const gt = require("..")

  throw new gt.common.GTError(
    `"${command}" is not a recognized command! See \`gt help\` for more info.`,
  )
}

run()
