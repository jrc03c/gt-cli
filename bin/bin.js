#!/usr/bin/env node
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const process = require("node:process")

const command = `node --no-warnings ${path.resolve(__dirname, "index.js")} ${process.argv.slice(2).join(" ")}`

spawnSync(command, { stdio: "inherit", shell: true })
