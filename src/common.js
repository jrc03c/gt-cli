const { btoa, findUpward, PrettyError } = require("./helpers.js")
const inquirer = require("inquirer")

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

const config = (() => {
  try {
    return require(findUpward(".gtconfig"))
  } catch (e) {
    return {}
  }
})()

let _environment = config.environment
let _host
let _username = config.username
let _password = config.password

Object.defineProperty(config, "environment", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise(async (resolve, reject) => {
      try {
        if (_environment) {
          return resolve(_environment)
        }

        // NOTE: By this definition, the environment variable overrides the
        // "environment" property in the config file (if present). If neither is
        // present, the environment defaults to "development".
        if (process.env.GT_ENV) {
          _environment = process.env.GT_ENV
          return resolve(_environment)
        }

        const response = await inquirer.prompt([
          {
            type: "input",
            name: "answer",
            message: "Environment (i.e., development, staging, or production):",
          },
        ])

        const answer = response.answer.trim().toLowerCase()

        const answerWasValid = Object.values(Environment).some(v =>
          v.includes(answer)
        )

        if (!answerWasValid) {
          throw new PrettyError(`
            Invalid environment value! The environment must be one of
            "development", "staging", or "production".
          `)
        }

        _environment = answer
        return resolve(_environment)
      } catch (e) {
        return reject(e)
      }
    })
  },

  set(value) {
    _environment = value
  },
})

Object.defineProperty(config, "host", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise((resolve, reject) => {
      try {
        if (_host) {
          return resolve(_host)
        }

        config.environment.then(environment => {
          if (environment === Environment.DEVELOPMENT) {
            _host = Host.DEVELOPMENT
            return resolve(_host)
          }

          if (environment === Environment.STAGING) {
            _host = Host.STAGING
            return resolve(_host)
          }

          if (environment === Environment.PRODUCTION) {
            _host = Host.PRODUCTION
            return resolve(_host)
          }

          throw new PrettyError(`
            The host could not be determined because the environment was
            either not specified or not set to a valid value! Please set the
            environment to one of "development", "staging", or "production".
          `)
        })
      } catch (e) {
        return reject(e)
      }
    })
  },

  set(value) {
    _host = value
  },
})

Object.defineProperty(config, "username", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise(async (resolve, reject) => {
      try {
        if (_username) {
          return resolve(_username)
        }

        while (!_username || _username.length === 0) {
          const response = await inquirer.prompt([
            {
              type: "input",
              name: "answer",
              message: "Username:",
            },
          ])

          _username = response.answer.trim()
        }

        return resolve(_username)
      } catch (e) {
        return reject(e)
      }
    })
  },

  set(value) {
    _username = value
  },
})

Object.defineProperty(config, "password", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise(async (resolve, reject) => {
      try {
        if (_password) {
          return resolve(_password)
        }

        while (!_password || _password.length === 0) {
          const response = await inquirer.prompt([
            {
              type: "password",
              name: "answer",
              message: "Password:",
            },
          ])

          _password = response.answer.trim()
        }

        return resolve(_password)
      } catch (e) {
        return reject(e)
      }
    })
  },

  set(value) {
    _password = value
  },
})

Object.defineProperty(config, "credentials", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise(async (resolve, reject) => {
      try {
        return resolve({
          username: await config.username,
          password: await config.password,
        })
      } catch (e) {
        return reject(e)
      }
    })
  },

  set(value) {
    _username = value.username
    _password = value.password
  },
})

Object.defineProperty(config, "credentialsBase64", {
  enumerable: true,
  configurable: false,

  get() {
    return new Promise(async (resolve, reject) => {
      try {
        const username = await config.username
        const password = await config.password
        return resolve(btoa(`${username}:${password}`))
      } catch (e) {
        return reject(e)
      }
    })
  },

  set() {
    throw new PrettyError(`
      The value of the \`credentialsBase64\` property cannot be set directly.
      Please set the \`username\` / \`password\` or \`credentials\` fields
      instead.
    `)
  },
})

module.exports = { config, Host, Environment }
