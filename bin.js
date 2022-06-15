#!/usr/bin/env node

async function run() {
  const { Chalk } = await import("chalk")
  const { indent, unindent, wrap } = require("@jrc03c/js-text-tools")
  const fs = require("fs")
  const fsx = require("@jrc03c/fs-extras")
  const gt = require(".")
  const inquirer = require("inquirer")
  const chalk = new Chalk()
  const path = require("path")

  function prettify(text) {
    return wrap(indent(unindent(text), "  "), null, "  ")
  }

  const help = prettify(`
    ${chalk.bold("===========")}
    ${chalk.bold("gt-cli help")}
    ${chalk.bold("===========")}

    ${chalk.bold("Syntax")}

      ${chalk.blue.bold("gt [command] [sub-command] [options]")}

    ${chalk.bold("Commands")}

      ${chalk.green("help")} = Shows this help message

      ${chalk.green("init")} = Creates a new .gtconfig file

      ${chalk.green("job")}

        ${chalk.yellow("poll [id]")} = shows the status of a job given a job ID

      ${chalk.green("program")}

        ${chalk.yellow(
          "build [id or key]"
        )} = compiles a program given an ID or key

        ${chalk.yellow(
          "create [name]"
        )} = creates a new program with the given name

        ${chalk.yellow(
          "find [query]"
        )} = searches for programs with names that match a given query

        ${chalk.yellow(
          "get [id or key]"
        )} = retrieves the metadata of a program with the given ID or key

        ${chalk.yellow(
          "update [id or key]"
        )} = updates the code contents of the program with the given ID or key (or all programs if no value is given); automatically builds remote programs by default, but this behavior can be disabled with --no-build

      ${chalk.green(
        "pull"
      )} = fetches the code contents of all remote programs listed in .gtconfig and overwrites their corresponding local files

      ${chalk.green(
        "push"
      )} = overwrites remote programs listed in .gtconfig with their corresponding local file contents; automatically builds remote programs by default, but this behavior can be disabled with --no-build

      ${chalk.green("request")}
      
        ${chalk.yellow("send")} = sends an HTTP request to an API endpoint
          --path [path]
          --method [method]
          --headers [headers as JSON]
          --body [body as JSON]
          --query [query as JSON]

    ${chalk.bold("Examples")}

      ${chalk.dim("# print this help message again")}
      gt help

      ${chalk.dim("# initialize a project by generating a .gtconfig file")}
      gt init

      ${chalk.dim("# check the status of a running job")}
      gt job poll 12345

      ${chalk.dim("# build a program")}
      gt program build 19868

      ${chalk.dim("# create a new program")}
      gt program create "My cool program"

      ${chalk.dim("# search for a program by name")}
      gt program find "Some query"

      ${chalk.dim("# fetch the metadata of a program and print it to `stdout`")}
      gt program get 19868

      ${chalk.dim(
        "# fetch the metadata of all programs and print it to `stdout`"
      )}
      gt program get --all

      ${chalk.dim("# update the remote program with the local contents")}
      gt program update 19868

      ${chalk.dim("# update all remote programs with all local contents")}
      gt program update --all

      ${chalk.dim(
        "# fetch all remote programs and overwrite their local counterparts"
      )}
      gt pull

      ${chalk.dim(
        "# overwrite all remote programs with their local counterparts"
      )}
      gt push

      ${chalk.dim("# send a custom API request")}
      gt request send \\
        --path "/some/api/endpoint" \\
        --method "POST" \\
        --headers { "Content-Type": "application/json" } \\
        --body { hello: "world" }
  `)

  const args = process.argv.slice(2)
  const command = args[0]
  const subcommand = args[1]
  const params = args.slice(2)

  if (command === "help") {
    console.log(help)
    process.exit(0)
  }

  if (command === "init") {
    const template = {
      username: "YOUR_GT_USERNAME_OR_EMAIL",
      password: "YOUR_GT_PASSWORD",
      environment: "production",
      programs: {},
    }

    console.log(prettify(`\nSearching for GT program files...`))

    const cwd = process.cwd()

    const gtFiles = fsx.findSync(cwd, file => {
      const lowerFile = file.toLowerCase()
      return lowerFile.endsWith(".gt") || lowerFile.endsWith(".guidedtrack")
    })

    if (gtFiles && gtFiles.length > 0) {
      console.log(prettify("\nFound these files:\n"))

      gtFiles.forEach((file, i) => {
        console.log(chalk.green(prettify(`➔ ${file.replace(cwd, "")}`)))
        template.programs["id" + i] = file
      })

      console.log(
        prettify(
          `\nNote that while the above files will be inserted into the configuration file, you'll still need to get their actual keys from each program's "Publish" settings and replace the keys called "id0", "id1", etc. in the configuration file. (The key is usually a 7-character string of numbers and letters.)`
        )
      )
    }

    fs.writeFileSync(".gtconfig", JSON.stringify(template, null, 2), "utf8")

    console.log(
      prettify(`
        ---

        The configuration has been stored in .gtconfig!
        
        Note that the \`environment\` property is set by default to 'production' but can be changed to 'development' or 'staging' as needed (though 'development' only makes sense if you're running a local version of the GT server, which you probably aren't doing unless you're a GT engineer).

        Also note that you'll need to update the \`username\` and \`password\` fields in .gtconfig with their actual values!

        Run ${chalk.magenta(
          "`gt help`"
        )} to show the help menu if you get stuck!
      `)
        .replace(".gtconfig", chalk.yellow.bold(".gtconfig"))
        .replaceAll("`environment`", chalk.blue("`environment`"))
        .replaceAll("'production'", chalk.blue("'production'"))
        .replaceAll("`username`", chalk.blue("`username`"))
        .replaceAll("`password`", chalk.blue("`password`"))
    )
  }
}

run()
