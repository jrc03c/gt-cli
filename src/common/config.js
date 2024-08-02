const { btoa, findUpward, prettify, writeFileSafe } = require("../helpers.js")
const fs = require("fs")
const GTError = require("./gt-error.js")
const Host = require("./host.js")
const inquirer = require("inquirer")
const path = require("path")

class Config {
  hasBeenLoaded = false
  programs = {}

  _username = null
  _password = null
  _host = null

  constructor() {
    Object.defineProperty(this, "username", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!this._username) {
          const response = await inquirer.prompt([
            {
              type: "input",
              name: "username",
              message: prettify("GT username / email:"),
            },
          ])

          this._username = response.username
        }

        return this._username
      },

      set(value) {
        this._username = value
      },
    })

    Object.defineProperty(this, "password", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!this._password) {
          const response = await inquirer.prompt([
            {
              type: "password",
              name: "password",
              message: prettify("GT password:"),
            },
          ])

          this._password = response.password
        }

        return this._password
      },

      set(value) {
        this._password = value
      },
    })

    Object.defineProperty(this, "credentials", {
      enumerable: true,
      configurable: false,

      async get() {
        return {
          username: await this.username,
          password: await this.password,
        }
      },

      set() {
        throw new GTError(
          "The `credentials` property is a computed property and cannot be set directly! Please only set the `username` and `password` properties directly.",
        )
      },
    })

    Object.defineProperty(this, "credentialsBase64", {
      enumerable: true,
      configurable: false,

      async get() {
        return btoa(`${await this.username}:${await this.password}`)
      },

      set() {
        throw new GTError(
          "The `credentialsBase64` property is a computed property and cannot be set directly! Please only set the `username` and `password` properties directly.",
        )
      },
    })

    Object.defineProperty(this, "host", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!this._host) {
          const response = await inquirer.prompt([
            {
              type: "list",
              name: "host",
              message: prettify(
                "Which environment / host would you like to use by default? (Note that this can still be overridden on individual pushes or pulls.)",
              ),
              choices: Object.keys(Host)
                .map(key => {
                  return { name: `${key} = ${Host[key]}`, value: key }
                })
                .concat([
                  { name: "CUSTOM = <your_custom_host_url>", value: "CUSTOM" },
                ]),
            },
          ])

          if (response.host === "CUSTOM") {
            const response = await inquirer.prompt([
              {
                type: "input",
                name: "host",
                message: prettify(
                  "Custom host address (e.g., https://example.com):",
                ),
              },
            ])

            this._host = response.host
          } else {
            this._host = Host[response.host]
          }
        }

        return this._host
      },

      set(value) {
        this._host = value
      },
    })
  }

  async load(options) {
    if (this.hasBeenLoaded) {
      return this
    }

    options = options || {}
    const configFilePath = options.file
    const { username, password, host, credentialsFile } = options

    if (configFilePath) {
      const temp = JSON.parse(fs.readFileSync(configFilePath))

      Object.keys(temp).forEach(key => {
        this[key] = temp[key]
      })
    } else {
      const file = findUpward(".gtconfig")

      if (file) {
        options.file = file
        return await this.load(options)
      }
    }

    if (credentialsFile) {
      this.credentialsFile = credentialsFile
    }

    if (this.credentialsFile) {
      if (!fs.existsSync(this.credentialsFile)) {
        throw new GTError(
          `The credentials file listed in your .gtconfig file doesn't exist! ("${path.resolve(
            this.credentialsFile,
          )}")`,
        )
      }

      const temp = JSON.parse(fs.readFileSync(this.credentialsFile, "utf8"))
      this.username = temp.username
      this.password = temp.password
    }

    if (!this._username) {
      this.username = username ? username : await this.username
    }

    if (!this._password) {
      this.password = password ? password : await this.password
    }

    if (!this._host) {
      this.host = host ? host : await this.host
    }

    this.hasBeenLoaded = true
    return this
  }

  async save(configFilePath) {
    if (configFilePath) {
      const out = {
        host: await this.host,
        programs: this.programs,
        credentialsFile: this.credentialsFile,
      }

      configFilePath = path.resolve(configFilePath)

      if (this.credentialsFile) {
        writeFileSafe(
          this.credentialsFile,
          JSON.stringify(await this.credentials, null, 2),
        )
      } else {
        const response = await inquirer.prompt([
          {
            type: "list",
            name: "shouldCreateCredentialsFile",
            message: prettify(
              "We recommend storing your credentials in a file that's NOT checked into version control but that is referenced in the `credentialsFile` property of your .gtconfig. If you don't store your credentials this way, then we'll ask you for your username and password each time. Would you like for us to create a credentials file for you and add it to the .gtconfig file?",
            ),
            choices: [
              { name: "Yes", value: true },
              { name: "No", value: false },
            ],
          },
        ])

        if (response.shouldCreateCredentialsFile) {
          const response = await inquirer.prompt([
            {
              type: "input",
              name: "path",
              message: prettify(
                "Where should we store the credentials file? Please specify a path:",
              ),
            },
          ])

          console.log(
            prettify(
              `Please add "${response.path}" to your .gitignore file if you're using git!`,
            ),
          )

          this.credentialsFile = response.path
          return await this.save(configFilePath)
        }
      }

      writeFileSafe(configFilePath, JSON.stringify(out, null, 2))
    } else {
      const file = findUpward(".gtconfig")

      if (file) {
        return await this.save(file)
      } else {
        throw new GTError(
          "A .gtconfig file was neither specified nor found! Please either create a .gtconfig file along the path to your program or pass a .gtconfig file path into the `gt.common.config.save` function!",
        )
      }
    }

    return this
  }
}

module.exports = new Config()
