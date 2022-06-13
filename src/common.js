const { findUpward, PrettyError } = require("./helpers.js")
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
    console.log(e)
    return {}
  }
})()

let _environment = config.environment
let _host

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
          throw new PrettyError(
            `
              Invalid environment value! The environment must be one of
              "development", "staging", or "production".
            `
          )
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

          throw new PrettyError(
            `
              The host could not be determined because the environment was
              either not specified or not set to a valid value! Please set the
              environment to one of "development", "staging", or "production".
            `
          )
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

// module.exports = async function () {
//   if (!Config.USERNAME) {
//     const { username } = await inquirer.prompt([
//       {
//         type: "input",
//         name: "username",
//         message: "GT username / email:",
//       },
//     ])

//     Config.USERNAME = username
//   }

//   if (!Config.PASSWORD) {
//     const { password } = await inquirer.prompt([
//       {
//         type: "password",
//         name: "password",
//         message: "GT password:",
//       },
//     ])

//     Config.PASSWORD = password
//   }

//   return { username: Config.USERNAME, password: Config.PASSWORD }
// }

Object.defineProperty(config, "username", {})

Object.defineProperty(config, "password", {})

Object.defineProperty(config, "credentials", {})

Object.defineProperty(config, "credentialsBase64", {})

module.exports = { config, Host, Environment }
