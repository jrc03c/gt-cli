import { Command } from "commander"
import { registerBuild } from "./commands/build.js"
import { registerCompare } from "./commands/compare.js"
import { registerConfig } from "./commands/config.js"
import { registerCreate } from "./commands/create.js"
import { registerInit } from "./commands/init.js"
import { registerProgram } from "./commands/program.js"
import { registerPull } from "./commands/pull.js"
import { registerPush } from "./commands/push.js"
import { registerRequest } from "./commands/request.js"

const program = new Command()

program
  .name("gt")
  .description("CLI for the GuidedTrack web API")
  .version("0.1.0")

registerPush(program)
registerPull(program)
registerCreate(program)
registerBuild(program)
registerCompare(program)
registerInit(program)
registerConfig(program)
registerProgram(program)
registerRequest(program)

program.parseAsync().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
