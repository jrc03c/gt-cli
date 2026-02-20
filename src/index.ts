import { Command } from "commander"
import { registerPush } from "./commands/push.js"
import { registerCreate } from "./commands/create.js"
import { registerBuild } from "./commands/build.js"
import { registerCompare } from "./commands/compare.js"

const program = new Command()

program
  .name("gt")
  .description("CLI for the GuidedTrack web API")
  .version("0.1.0")

registerPush(program)
registerCreate(program)
registerBuild(program)
registerCompare(program)

program.parse()
