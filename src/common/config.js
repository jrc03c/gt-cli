const { btoa, findUpward } = require("../helpers.js")
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
              message: "GT username / email:",
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
              message: "GT password:",
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
              message: "Which environment / host would you like to use?",
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
                message: "Custom host address (e.g., https://example.com):",
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

    options = options || {}
    const configFilePath = options.file
    const { username, password, host } = options

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

    self.username = username ? username : await self.username
    self.password = password ? password : await self.password
    self.host = host ? host : await self.host

    self.hasBeenLoaded = true
    return self
  }

  async save(configFilePath) {
    const self = this

    if (configFilePath) {
      const out = {
        programs: self.programs,
      }

      configFilePath = path.resolve(configFilePath)
      const parts = configFilePath.split("/")
      const dir = parts.slice(0, parts.length - 1).join("/")

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(configFilePath, JSON.stringify(out, null, 2), "utf8")
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
