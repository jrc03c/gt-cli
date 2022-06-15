#!/usr/bin/env node
const gt = require(".")

const help = `
  ===========
  gt-cli help
  ===========

  Syntax:

    gt [command] [sub-command] [options]

  Commands:

    help = Shows this help message

    init = Creates a new .gtconfig file

    job

      poll [id] = shows the status of a job given a job ID

    program

      build [id or key] = compiles a program given an ID or key

      create [name] = creates a new program with the given name

      find [query] = searches for programs with names that match a given query

      get [id or key] = retrieves the metadata of a program with the given ID
        or key

      update [id, key, or --all] = updates the code contents of the program
        with the given ID or key (or all programs if --all is used)

    request
    
      send = sends an HTTP request to an API endpoint
        --path [path]
        --method [method]
        --headers [headers as JSON]
        --body [body as JSON]
        --query [query as JSON]

  Examples:

    gt help

    gt init

    gt job poll 12345

    gt program build 19868

    gt program create "My cool program"

    gt program find "Some query"

    gt program get 19868

    gt program get --all

    gt program update 19868

    gt program update --all

    gt request send \\
      --path "/some/api/endpoint" \\
      --method "POST" \\
      --headers { "Content-Type": "application/json" } \\
      --body { hello: "world" }
`

const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]
const params = args.slice(2)

if (command === "help") {
  console.log(help)
  process.exit(0)
}
