const { btoa, findUpward } = require("./helpers.js")
const inquirer = require("inquirer")

class GTError extends Error {
  constructor(message) {
    if (message instanceof Array) {
      message = message.join("\n")
    } else {
      message = message
        .split("\n")
        .map(line => line.trim())
        .join(" ")
        .trim()
    }

    super(message)
  }
}

const Host = {
  DEVELOPMENT: "http://localhost:3000",
  STAGING: "https://guidedtrack-stage.herokuapp.com",
  PRODUCTION: "https://www.guidedtrack.com",
}

const Environment = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
}

let hasBeenLoaded = false

const config = {
  async load() {
    if (hasBeenLoaded) {
      return config
    }

    try {
      const temp = require(findUpward(".gtconfig"))

      Object.keys(temp).forEach(key => {
        config[key] = temp[key]
      })
    } catch (e) {}

    if (!config.username) {
      const response = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: "GT username / email:",
        },
      ])

      config.username = response.value
    }

    if (!config.password) {
      const response = await inquirer.prompt([
        {
          type: "password",
          name: "value",
          message: "GT password:",
        },
      ])

      config.password = response.value
    }

    if (!config.environment) {
      const response = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: "Environment (i.e., development, staging, or production):",
        },
      ])

      const env = response.value.trim()

      if (!Object.values(Environment).some(v => v.includes(env))) {
        throw new GTError(`
          Invalid environment! The environment value must be one of
          "development", "staging", or "production".
        `)
      }

      config.environment = env
    }

    if (!config.host) {
      if (config.environment === Environment.DEVELOPMENT) {
        config.host = Host.DEVELOPMENT
      }

      if (config.environment === Environment.STAGING) {
        config.host = Host.STAGING
      }

      if (config.environment === Environment.PRODUCTION) {
        config.host = Host.PRODUCTION
      }

      if (!Object.values(Host).some(v => v.includes(config.host))) {
        throw new GTError(`
          The host could not be determined because the environment value was
          invalid. Please set the environment value to one of "development",
          "staging", or "production".
        `)
      }
    }

    if (!config.credentials) {
      Object.defineProperty(config, "credentials", {
        enumerable: true,
        configurable: false,

        get() {
          return {
            username: config.username,
            password: config.password,
          }
        },

        set() {
          throw new GTError(`
            The \`credentials\` property of the configuration cannot be set
            directly; instead, please set the \`username\` and \`password\`
            properties.
          `)
        },
      })
    }

    if (!config.credentialsBase64) {
      Object.defineProperty(config, "credentialsBase64", {
        enumerable: true,
        configurable: false,

        get() {
          const { username, password } = config
          return btoa(`${username}:${password}`)
        },

        set() {
          throw new GTError(`
          The \`credentialsBase64\` property of the configuration cannot be set
          directly; instead, please set the \`username\` and \`password\`
          properties.
        `)
        },
      })
    }

    hasBeenLoaded = true
    return config
  },
}

module.exports = { config, GTError, Host, Environment }
