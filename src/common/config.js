const { btoa, findUpward, prettify, writeFileSafe } = require("../helpers.js")
const Environment = require("./environment.js")
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
    const self = this

    Object.defineProperty(self, "username", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!self._username) {
          const response = await inquirer.prompt([
            {
              type: "input",
              name: "username",
              message: prettify("GT username / email:"),
            },
          ])

          self._username = response.username
        }

        return self._username
      },

      set(value) {
        self._username = value
      },
    })

    Object.defineProperty(self, "password", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!self._password) {
          const response = await inquirer.prompt([
            {
              type: "password",
              name: "password",
              message: prettify("GT password:"),
            },
          ])

          self._password = response.password
        }

        return self._password
      },

      set(value) {
        self._password = value
      },
    })

    Object.defineProperty(self, "credentials", {
      enumerable: true,
      configurable: false,

      async get() {
        return {
          username: await self.username,
          password: await self.password,
        }
      },

      set() {
        throw new GTError(
          "The `credentials` property is a computed property and cannot be set directly! Please only set the `username` and `password` properties directly."
        )
      },
    })

    Object.defineProperty(self, "credentialsBase64", {
      enumerable: true,
      configurable: false,

      async get() {
        return btoa(`${await self.username}:${await self.password}`)
      },

      set() {
        throw new GTError(
          "The `credentialsBase64` property is a computed property and cannot be set directly! Please only set the `username` and `password` properties directly."
        )
      },
    })

    Object.defineProperty(self, "host", {
      enumerable: true,
      configurable: false,

      async get() {
        if (!self._host) {
          const response = await inquirer.prompt([
            {
              type: "list",
              name: "host",
              message: prettify(
                "Which environment / host would you like to use by default? (Note that this can still be overridden on individual pushes or pulls.)"
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
                  "Custom host address (e.g., https://example.com):"
                ),
              },
            ])

            self._host = response.host
          } else {
            self._host = Host[response.host]
          }
        }

        return self._host
      },

      set(value) {
        self._host = value
      },
    })
  }

  async load(options) {
    const self = this

    if (self.hasBeenLoaded) {
      return self
    }

    options = options || {}
    const configFilePath = options.file
    const { username, password, host, credentialsFile } = options

    if (configFilePath) {
      const temp = JSON.parse(fs.readFileSync(configFilePath))

      Object.keys(temp).forEach(key => {
        self[key] = temp[key]
      })
    } else {
      const file = findUpward(".gtconfig")

      if (file) {
        options.file = file
        return await self.load(options)
      }
    }

    if (credentialsFile) {
      self.credentialsFile = credentialsFile
    }

    if (self.credentialsFile) {
      if (!fs.existsSync(self.credentialsFile)) {
        throw new GTError(
          `The credentials file listed in your .gtconfig file doesn't exist! ("${path.resolve(
            self.credentialsFile
          )}")`
        )
      }

      const temp = JSON.parse(fs.readFileSync(self.credentialsFile, "utf8"))
      self.username = temp.username
      self.password = temp.password
    }

    if (!self._username) {
      self.username = username ? username : await self.username
    }

    if (!self._password) {
      self.password = password ? password : await self.password
    }

    if (!self._host) {
      self.host = host ? host : await self.host
    }

    self.hasBeenLoaded = true
    return self
  }

  async save(configFilePath) {
    console.log("saving config to:", configFilePath)
    const self = this

    if (configFilePath) {
      const out = {
        host: await self.host,
        programs: self.programs,
        credentialsFile: self.credentialsFile,
      }

      configFilePath = path.resolve(configFilePath)

      if (self.credentialsFile) {
        writeFileSafe(
          self.credentialsFile,
          JSON.stringify(await self.credentials, null, 2)
        )
      } else {
        const response = await inquirer.prompt([
          {
            type: "list",
            name: "shouldCreateCredentialsFile",
            message: prettify(
              "We recommend storing your credentials in a file that's NOT checked into version control but that is referenced in the `credentialsFile` property of your .gtconfig. If you don't store your credentials this way, then we'll ask you for your username and password each time. Would you like for us to create a credentials file for you and add it to the .gtconfig file?"
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
                "Where should we store the credentials file? Please specify a path:"
              ),
            },
          ])

          console.log(
            prettify(
              `Please add "${response.path}" to your .gitignore file if you're using git!`
            )
          )

          self.credentialsFile = response.path
          return await self.save(configFilePath)
        }
      }

      writeFileSafe(configFilePath, JSON.stringify(out, null, 2))
    } else {
      const file = findUpward(".gtconfig")

      if (file) {
        return await self.save(file)
      } else {
        throw new GTError(
          "A .gtconfig file was neither specified nor found! Please either create a .gtconfig file along the path to your program or pass a .gtconfig file path into the `gt.common.config.save` function!"
        )
      }
    }

    return self
  }
}

module.exports = new Config()
