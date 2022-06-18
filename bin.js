#!/usr/bin/env node

async function run() {
  const { Chalk } = await import("chalk")
  const { GTError } = require("./src/common.js")
  const { prettify } = require("./src/helpers.js")
  const fs = require("fs")
  const fsx = require("@jrc03c/fs-extras")
  const gt = require(".")
  const inquirer = require("inquirer")
  const path = require("path")
  const util = require("util")

  const chalk = new Chalk()

  const help = prettify(`
    ${chalk.bold("===========")}
    ${chalk.bold("gt-cli help")}
    ${chalk.bold("===========")}

    ------
    ${chalk.bold("Syntax")}
    ------

      ${chalk.blue.bold("gt [command] [sub-command] [parameters]")}

    --------
    ${chalk.bold("Commands")}
    --------

      ${chalk.green("help")} = Shows this help message

      ${chalk.green("init")} = Creates a new .gtconfig file

      ${chalk.green("program")}

        ${chalk.yellow(
          "build [id or key]"
        )} = compiles a program given an ID or key

        ${chalk.yellow(
          "create [name]"
        )} = creates a new program with the given name

        ${chalk.yellow(
          "download [options] [id or key]"
        )} = fetches the contents of the remote program with the given ID or key; options are:
          --save [path]
          --print

        ${chalk.yellow(
          "filter [query]"
        )} = searches for and returns all programs with names that include the query

        ${chalk.yellow(
          "find [query]"
        )} = searches for and returns the first program with a name that includes the query

        ${chalk.yellow(
          "get [id or key]"
        )} = retrieves the metadata of a program with the given ID or key, or gets all programs if --all is used

        ${chalk.yellow(
          "upload [key]"
        )} = uploads the code contents of the program with the given key (or all programs if --all is used); it automatically compiles the remote programs by default, but this behavior can be disabled with --no-build

      ${chalk.green(
        "pull"
      )} = fetches the code contents of all remote programs listed in .gtconfig and overwrites their corresponding local files

      ${chalk.green(
        "push"
      )} = overwrites remote programs listed in .gtconfig with their corresponding local file contents; it automatically compiles the remote programs by default, but this behavior can be disabled with --no-build

      ${chalk.green("request")}
      
        ${chalk.yellow(
          "send [options] [path]"
        )} = sends an HTTP request to an API endpoint; options are:
          --method [method] (default is "GET")
          --headers [headers as JSON]
          --body [body as JSON]
          --query [query as JSON]

    --------
    ${chalk.bold("Examples")}
    --------

      ${chalk.dim("# print this help message again")}
      gt help

      ${chalk.dim("# initialize a project by generating a .gtconfig file")}
      gt init

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

      ${chalk.dim("# upload the local contents of a program")}
      gt program upload "abcd123"

      ${chalk.dim("# upload all local contents of all programs")}
      gt program upload --all

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
        --method "POST" \\
        --headers { "Content-Type": "application/json" } \\
        --body { "hello": "world" } \\
        /some/api/endpoint
  `)

  const args = process.argv.slice(2)
  const command = args[0]
  const subcommand = args[1]
  const params = args.slice(2)
  const cwd = process.cwd()
  const configFilePath = path.join(cwd, ".gtconfig")

  // ==========================================================================
  // HELP
  // ==========================================================================

  if (command === "help") {
    return console.log(help)
  }

  // ==========================================================================
  // INIT
  // ==========================================================================

  if (command === "init") {
    const template = (() => {
      try {
        return JSON.parse(fs.readFileSync(configFilePath, "utf8"))
      } catch (e) {
        return {}
      }
    })()

    if (!template.username) {
      template.username = "YOUR_GT_USERNAME_OR_EMAIL"
    }

    if (!template.password) {
      template.password = "YOUR_GT_PASSWORD"
    }

    if (!template.environment) {
      template.environment = "production"
    }

    if (!template.programs) {
      template.programs = {}
    }

    console.log(prettify(`Searching for GT program files...`))

    const gtFiles = fsx.findSync(cwd, file => {
      const lowerFile = file.toLowerCase()
      return lowerFile.endsWith(".gt") || lowerFile.endsWith(".guidedtrack")
    })

    if (gtFiles && gtFiles.length > 0) {
      console.log(prettify("Found these files:"))

      gtFiles.forEach((file, i) => {
        const hasAlreadyBeenAdded = Object.keys(template.programs).some(key => {
          const previous = template.programs[key].replace(cwd, "")
          const current = file.replace(cwd, "")
          return previous === current
        })

        if (hasAlreadyBeenAdded) {
          console.log(
            chalk.dim(prettify(`➔ ${file.replace(cwd, "")} (already added)`))
          )
        } else {
          console.log(chalk.green(prettify(`➔ ${file.replace(cwd, "")}`)))
          template.programs["id" + i] = file
        }
      })

      console.log(
        prettify(
          `Note that while the above files will be inserted into the configuration file, you'll still need to get their actual keys from each program's "Publish" settings and replace the keys called "id0", "id1", etc. in the configuration file. (The key is usually a 7-character string of numbers and letters.)`
        )
      )
    }

    fs.writeFileSync(configFilePath, JSON.stringify(template, null, 2), "utf8")

    return console.log(
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

  // ==========================================================================
  // PROGRAM
  // ==========================================================================

  const config = await gt.common.config.load()

  if (command === "program") {
    if (subcommand === "build") {
      const idOrKey = params[0]

      await gt.program.build(idOrKey, info =>
        console.log(prettify(info.status))
      )

      return console.log(
        prettify(
          `Program ${
            typeof idOrKey === "string" ? `"${idOrKey}"` : idOrKey
          } was built successfully!`
        )
      )
    }

    if (subcommand === "create") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify a program name! See `gt help` for more info."
        )
      }

      const name = params[0]
      const data = await gt.program.create(name)

      console.log(
        prettify(`
          Program "${name}" was created successfully!

          ID:       ${data.id}
          Key:      ${data.key}
          Edit:     https://www.guidedtrack.com/programs/${data.id}/edit
          Preview:  https://www.guidedtrack.com/programs/${data.key}/preview
          Run:      https://www.guidedtrack.com/programs/${data.key}/run
        `)
          .split("\n")
          .map(line => {
            const indentation = line.slice(
              0,
              line.split("").findIndex(s => !s.match(/\s/g))
            )

            if (line.match(/Program.*?!/g)) {
              return indentation + chalk.green.bold(line.trim())
            }

            const itemsToReplace = ["ID:", "Key:", "Edit:", "Preview:", "Run:"]

            for (let i = 0; i < itemsToReplace.length; i++) {
              const item = itemsToReplace[i]

              if (line.trim().startsWith(item)) {
                return indentation + chalk.blue.bold(item) + line.split(item)[1]
              }
            }

            return line
          })
          .join("\n")
      )

      const response1 = await inquirer.prompt([
        {
          type: "list",
          choices: [
            { name: "Yes", value: true },
            { name: "No", value: false },
          ],
          message: `Would you like for us to add this program to your .gtconfig file?`,
          name: "answer",
        },
      ])

      if (response1.answer) {
        const response2 = await inquirer.prompt([
          {
            type: "list",
            choices: [
              { name: "Yes", value: true },
              { name: "No", value: false },
            ],
            message: `Do you already have a program file (i.e., a .gt or .guidedtrack file) that contains the contents of this program?`,
            name: "answer",
          },
        ])

        let file
        let specifiedAPath = false

        if (response2.answer) {
          const response3 = await inquirer.prompt([
            {
              type: "input",
              name: "answer",
              message: "What is the path to the program file?",
            },
          ])

          file = response3.answer
          specifiedAPath = true
        } else {
          file = `placeholder/path/to/${data.key}.gt`
        }

        if (!config.programs) {
          config.programs = {}
        }

        config.programs[data.key] = file

        fs.writeFileSync(
          configFilePath,
          JSON.stringify(config, null, 2),
          "utf8"
        )

        if (specifiedAPath) {
          console.log(
            prettify(
              `Your .gtconfig file was updated with the path you provided!`
            )
          )
        } else {
          console.log(
            prettify(
              `Since you don't already have a file for this program, your .gtconfig file was updated to include a placeholder path for this program. You'll need to change that placeholder path before running any other program operations.`
            )
          )
        }
      } else {
        console.log(prettify("Your configuration file was not updated."))
      }

      return
    }

    if (subcommand === "download") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify the ID or key of the program to download! See `gt help` for more info."
        )
      }

      const idOrKey = params.pop()
      let shouldSave, shouldPrint, file

      if (params.indexOf("--print") < 0) {
        if (params.indexOf("--save") > -1) {
          shouldSave = true
          file = params[params.indexOf("--save") + 1]
        } else {
          const response = await inquirer.prompt([
            {
              type: "list",
              choices: [
                { name: "Yes", value: true },
                { name: "No", value: false },
              ],
              name: "answer",
              message:
                "Would you like to save the contents of the program to a file?",
            },
          ])

          shouldSave = response.answer

          if (shouldSave) {
            const response = await inquirer.prompt([
              {
                type: "input",
                name: "answer",
                message: "Path for the new file:",
              },
            ])

            file = path.resolve(response.answer)
          }
        }
      }

      shouldPrint = params.indexOf("--save") < 0 && !shouldSave
      const contents = await gt.program.download(idOrKey)

      if (shouldSave) {
        fs.writeFileSync(file, contents, "utf8")
      }

      if (shouldPrint) {
        console.log(contents)
      }
    }

    if (subcommand === "filter") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify a string pattern to match! See `gt help` for more info."
        )
      }

      const query = params[0]

      const results = await gt.program.filter(program =>
        program.name.includes(query)
      )

      return console.log(prettify(util.inspect(results, { colors: true })))
    }

    if (subcommand === "find") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify a string pattern to match! See `gt help` for more info."
        )
      }

      const query = params[0]

      const results = await gt.program.find(program =>
        program.name.includes(query)
      )

      console.log(prettify(util.inspect(results, { colors: true })))
    }

    if (subcommand === "get") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify a program ID or key to retrieve a specific program, or use `--all` to retrieve all programs! See `gt help` for more info."
        )
      }

      let results

      if (params[0] === "--all") {
        results = await gt.program.get()
      } else {
        const idOrKey = params[0]
        results = await gt.program.get(idOrKey)
      }

      console.log(prettify(util.inspect(results, { colors: true })))
    }

    if (subcommand === "upload") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify at least one program ID or key! Multiple IDs and/or keys should be separated by spaces. See `gt-help` for more info."
        )
      }

      const shouldBuild = params.indexOf("--no-build") < 0
      const shouldUploadAll = params.indexOf("--all") > -1

      const keys = shouldUploadAll
        ? Object.keys(config.programs)
        : params.filter(p => p !== "--no-build" && p !== "--all")

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        let file

        if (config.programs[key]) {
          file = path.resolve(config.programs[key])
        } else {
          const response1 = await inquirer.prompt([
            {
              type: "input",
              name: "answer",
              message: `The program with key "${key}" is not listed in your .gtconfig file. What is the path to the GT program file (i.e., the file with a .gt or .guidedtrack extension) for this program?`,
            },
          ])

          file = path.resolve(response1.answer)

          const response2 = await inquirer.prompt([
            {
              type: "list",
              choices: [
                { name: "Yes", value: true },
                { name: "No", value: false },
              ],
              message: `Would you like for us to add program "${key}" to your .gtconfig file so that you don't need to answer these questions next time?`,
              name: "answer",
            },
          ])

          if (response2.answer) {
            config.programs[key] = response1.answer

            fs.writeFileSync(
              configFilePath,
              JSON.stringify(config, null, 2),
              "utf8"
            )
          }
        }

        const raw = fs.readFileSync(file, "utf8")

        await gt.program.upload(key, raw, shouldBuild, info =>
          console.log(info.status)
        )
      }
    }
  }

  // ==========================================================================
  // PULL
  // ==========================================================================

  if (command === "pull") {
    const keys = Object.keys(config.programs || {})

    if (keys.length === 0) {
      throw new GTError(
        "There are no programs listed in your .gtconfig file! Please add some programs first and then run `gt pull` again."
      )
    }

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      console.log(`Fetching the contents of program "${key}" ...`)

      const file = path.resolve(config.programs[key])
      const contents = await gt.program.getContents(key)
      fs.writeFileSync(file, contents, "utf8")
    }
  }

  // ==========================================================================
  // PUSH
  // ==========================================================================

  if (command === "push") {
    const keys = Object.keys(config.programs || {})

    if (keys.length === 0) {
      throw new GTError(
        "There are no programs listed in your .gtconfig file! Please add some programs first and then run `gt push` again."
      )
    }

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const file = path.resolve(config.programs[key])
      const contents = fs.readFileSync(file, "utf8")
      const shouldBuild = true

      gt.program.upload(key, contents, shouldBuild, info => {
        console.log(info.status)
      })
    }
  }

  // ==========================================================================
  // REQUEST
  // ==========================================================================

  if (command === "request") {
    if (subcommand === "send") {
      if (params.length === 0) {
        throw new GTError(
          `For requests, you must specify a path! See \`gt help\` for more info.`
        )
      }

      const path = params.pop()

      const method = (() => {
        const index = params.indexOf("--method")

        if (index > -1) {
          return params[index + 1]
        } else {
          return "GET"
        }
      })()

      const headers = (() => {
        const index = params.indexOf("--headers")

        if (index > -1) {
          try {
            return JSON.parse(params[index + 1])
          } catch (e) {
            throw new GTError(
              "The value you provided for the `--headers` option doesn't appear to be valid JSON!"
            )
          }
        } else {
          return null
        }
      })()

      const body = (() => {
        const index = params.indexOf("--body")

        if (index > -1) {
          try {
            return JSON.parse(params[index + 1])
          } catch (e) {
            throw new GTError(
              "The value you provided for the `--body` option doesn't appear to be valid JSON!"
            )
          }
        } else {
          return null
        }
      })()

      const query = (() => {
        const index = params.indexOf("--query")

        if (index > -1) {
          try {
            return JSON.parse(params[index + 1])
          } catch (e) {
            throw new GTError(
              "The value you provided for the `--query` option doesn't appear to be valid JSON!"
            )
          }
        } else {
          return null
        }
      })()

      const response = await gt.request.send({
        path,
        method,
        headers,
        body,
        query,
      })

      const data = await response.json()
      console.log(data)
    }
  }
}

run()
