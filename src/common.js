const { btoa, findUpward, GTError } = require("./helpers.js")
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
  let out = {}

  try {
    out = require(findUpward(".gtconfig"))
  } catch (e) {}

  out.load = async function () {
    if (!out.username) {
      const response = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: "GT username / email:",
        },
      ])

      out.username = response.value
    }

    if (!out.password) {
      const response = await inquirer.prompt([
        {
          type: "password",
          name: "value",
          message: "GT password:",
        },
      ])

      out.password = response.value
    }

    if (!out.environment) {
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

      out.environment = env
    }

    if (!out.host) {
      if (out.environment === Environment.DEVELOPMENT) {
        out.host = Host.DEVELOPMENT
      }

      if (out.environment === Environment.STAGING) {
        out.host = Host.STAGING
      }

      if (out.environment === Environment.PRODUCTION) {
        out.host = Host.PRODUCTION
      }

      if (!Object.values(Host).some(v => v.includes(out.host))) {
        throw new GTError(`
          The host could not be determined because the environment value was
          invalid. Please set the environment value to one of "development",
          "staging", or "production".
        `)
      }
    }

    Object.defineProperty(out, "credentials", {
      enumerable: true,
      configurable: false,

      get() {
        return {
          username: out.username,
          password: out.password,
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

    Object.defineProperty(out, "credentialsBase64", {
      enumerable: true,
      configurable: false,

      get() {
        const { username, password } = out
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

  return out
})()

module.exports = { config, Host, Environment }
