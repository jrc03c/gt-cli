#!/usr/bin/env node

async function run() {
  const { Chalk } = await import("chalk")
  const { exec } = require("child_process")
  const { GTError } = require("./src/common")
  const { findUpward, prettify, writeFileSafe } = require("./src/helpers.js")
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

      ${chalk.green("docs")} = Opens the GuidedTrack docs website

        ${chalk.yellow(
          "search [query]"
        )} = Opens the GuidedTrack docs website and searches for the given query

      ${chalk.green("help")} = Shows this help message

      ${chalk.green(
        "init"
      )} = Creates a new .gtconfig file in the current directory and searches the directory and its subdirectories for any GuidedTrack program files (i.e., files with .gt or .guidedtrack extensions)

      ${chalk.green("program")}

        ${chalk.yellow(
          "add [options] [title, id, or key]"
        )} = downloads a program's source code and adds the program to the .gtconfig file; options are:

          --file [path]

        ${chalk.yellow(
          "build [id or key]"
        )} = compiles a program given an ID or key

        ${chalk.yellow(
          "create [options] [name]"
        )} = creates a new program with the given name; options are:
          
          --add
          --file [path]

        ${chalk.yellow(
          "delete [options] [id or key]"
        )} = deletes the program with the given ID or key; by default, you'll be prompted to confirm the deletion before the request is sent, but this behavior can be disabled by using --unsafe; options are:

          --unsafe

        ${chalk.yellow(
          "download [id or key]"
        )} = fetches the contents of the remote program with the given ID or key

        ${chalk.yellow(
          "filter [query]"
        )} = searches for and returns all programs with names that include the query

        ${chalk.yellow(
          "find [query]"
        )} = searches for and returns the first program with a name that includes the query

        ${chalk.yellow(
          "get [id or key]"
        )} = retrieves the metadata of a program with the given ID or key, or gets all programs if --all is used (same as \`gt program list\`); options are:

          --all

        ${chalk.yellow(
          "list"
        )} = lists all programs (same as \`gt program get --all\`)

        ${chalk.yellow(
          "upload [id or key]"
        )} = uploads the code contents of the program with the given key (or all programs if --all is used); it automatically compiles the remote program by default, but this behavior can be disabled with --no-build; options are:

          --all
          --no-build

      ${chalk.green(
        "pull"
      )} = fetches the code contents of all remote programs listed in .gtconfig and overwrites their corresponding local files

      ${chalk.green(
        "push"
      )} = overwrites remote programs listed in .gtconfig with their corresponding local file contents; it automatically compiles the remote programs by default, but this behavior can be disabled with --no-build; options are:

        --no-build

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

      ${chalk.dim("# opens the docs website")}
      gt docs

      ${chalk.dim("# opens the docs website and searches for the given query")}
      gt docs search *email

      ${chalk.dim("# print this help message again")}
      gt help

      ${chalk.dim("# initialize a project by generating a .gtconfig file")}
      gt init

      ${chalk.dim("# build a program")}
      gt program build 19868

      ${chalk.dim("# create a new program")}
      gt program create "My cool program"

      ${chalk.dim("# download a program's source code and save it to a file")}
      gt program download abcd123 > path/to/my_program.gt

      ${chalk.dim("# search for a program by name")}
      gt program find "Some query"

      ${chalk.dim("# fetch the metadata of a program and print it to `stdout`")}
      gt program get 19868

      ${chalk.dim(
        "# fetch the metadata of all programs and print it to `stdout`"
      )}
      gt program get --all

      ${chalk.dim("# upload the local contents of a program")}
      gt program upload abcd123

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

  // ==========================================================================
  // DOCS
  // ==========================================================================

  if (command === "docs") {
    if (subcommand && subcommand === "search") {
      if (params.length === 0) {
        throw new GTError(
          "You didn't provide a search query! See `gt help` for more info."
        )
      }

      exec(`xdg-open https://docs.guidedtrack.com/search/?query=${params[0]}`)
    } else {
      exec(`xdg-open https://docs.guidedtrack.com`)
    }
  }

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
    const { config } = gt.common
    await config.load()
    const configFilePath = path.join(process.cwd(), ".gtconfig")
    await config.save(configFilePath)

    console.log(
      prettify(`Your new config file was saved to ${configFilePath}!`)
    )
  }

  // ==========================================================================
  // PROGRAM
  // ==========================================================================

  if (command === "program") {
    const config = await gt.common.config.load()

    if (subcommand === "add") {
      const file = await (async () => {
        if (params.indexOf("--file") > -1) {
          return path.resolve(params[params.indexOf("--file") + 1])
        } else {
          const response = await inquirer.prompt([
            {
              type: "input",
              name: "path",
              message: prettify(
                "Where should the downloaded program file be stored? Please specify a path:"
              ),
            },
          ])

          return path.resolve(response.path)
        }
      })()

      const titleIdOrKey = params[params.length - 1].trim()

      const program = await gt.program.find(program => {
        return (
          program.name === titleIdOrKey ||
          program.id === parseInt(titleIdOrKey) ||
          program.key === titleIdOrKey
        )
      })

      if (program) {
        const configFilePath = findUpward(".gtconfig")
        const parts = configFilePath.split("/")
        const dir = parts.slice(0, parts.length - 1).join("/")
        gt.common.config.programs[program.key] = file.replace(dir + "/", "")
        await gt.common.config.save()

        const code = await gt.program.download(program.key)
        writeFileSafe(file, code)

        console.log(
          prettify(
            `The program "${titleIdOrKey}" was added to your .gtconfig file, and its source code was saved to "${file}"!`
          )
        )
      } else {
        throw new GTError("No such program found!")
      }
    }

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

      const name = params.pop()
      const data = await gt.program.create(name)
      let shouldUpdateConfig, file

      console.log(
        prettify(`
          Program "${name}" was created successfully!
          ID:       ${data.id}
          Key:      ${data.key}
          Edit:     https://www.guidedtrack.com/programs/${data.id}/edit
          Preview:  https://www.guidedtrack.com/programs/${data.key}/preview
          Run:      https://www.guidedtrack.com/programs/${data.key}/run
          ---
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

      if (params.indexOf("--add") > -1) {
        shouldUpdateConfig = true
      } else {
        const response = await inquirer.prompt([
          {
            type: "list",
            choices: [
              { name: "Yes", value: true },
              { name: "No", value: false },
            ],
            name: "answer",
            message: prettify(
              "Would you like for us to add this program to your .gtconfig file?"
            ),
          },
        ])

        shouldUpdateConfig = response.answer
      }

      if (shouldUpdateConfig) {
        const response = await inquirer.prompt([
          {
            type: "input",
            name: "path",
            message: prettify(
              "Where should we store this program's file? Please specify a path:"
            ),
          },
        ])

        gt.common.config.programs[data.key] = response.path
        writeFileSafe(response.path, "")
        await gt.common.config.save()
      }
    }

    if (subcommand === "delete") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify the ID or key of the program to delete! See `gt help` for more info."
        )
      }

      const idOrKey = params.pop()
      const program = await gt.program.get(idOrKey)
      const isUnsafe = params.indexOf("--unsafe") > -1
      let shouldDelete = false

      if (isUnsafe) {
        shouldDelete = true
      } else {
        const response1 = await inquirer.prompt([
          {
            type: "list",
            choices: [
              { name: "Yes, I want to delete this program", value: true },
              { name: "No, I don't want to delete this program", value: false },
            ],
            name: "answer",
            message: chalk.red.bold(
              prettify(
                `You are about to delete the program called "${program.name}" from the GuidedTrack servers. (Any local copies will not be deleted.) This action cannot be undone! Are you sure you want to delete this program?`
              )
            ),
          },
        ])

        if (response1.answer) {
          const response2 = await inquirer.prompt([
            {
              type: "input",
              name: "answer",
              message: chalk.yellow.bold(
                prettify(
                  `To initiate deletion of the program called "${program.name}", please type the program's name here:`
                )
              ),
            },
          ])

          if (response2.answer.trim() !== program.name.trim()) {
            throw new GTError(
              "The name you typed doesn't match the name of the program!"
            )
          }

          shouldDelete = true
        }
      }

      if (shouldDelete) {
        await gt.program.delete(idOrKey)
        delete gt.common.config.programs[program.key]
        await gt.common.config.save()
        console.log(prettify(`The program was deleted!`))
      } else {
        console.log(prettify("The program was not deleted."))
      }
    }

    if (subcommand === "download") {
      if (params.length === 0) {
        throw new GTError(
          "You must specify the ID or key of the program to download! See `gt help` for more info."
        )
      }

      const idOrKey = params.pop()
      const contents = await gt.program.download(idOrKey)
      console.log(contents)
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

    if (subcommand === "list") {
      console.log(await gt.program.get())
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

        if (!config.programs[key]) {
          throw new GTError(
            `The program "${key}" isn't listed in your .gtconfig file! First add it using \`gt program add ${key}\`!`
          )
        }

        file = path.resolve(config.programs[key])
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
    const config = await gt.common.config.load()
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
      const contents = await gt.program.download(key)
      writeFileSafe(file, contents)
    }
  }

  // ==========================================================================
  // PUSH
  // ==========================================================================

  if (command === "push") {
    const config = await gt.common.config.load()
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
    const config = await gt.common.config.load()

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
