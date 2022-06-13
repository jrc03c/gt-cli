// const Host = {
//   DEVELOPMENT: "http://localhost:3000",
//   STAGING: "https://guidedtrack-stage.herokuapp.com",
//   PRODUCTION: "https://www.guidedtrack.com",
// }

// const Environment = {
//   DEVELOPMENT: "development",
//   STAGING: "staging",
//   PRODUCTION: "production",
// }

// const Config = (() => {
//   try {
//     const temp = require("./config.json")

//     Object.keys(temp).forEach(key => {
//       temp[key.toUpperCase()] = temp[key]
//       delete temp[key]
//     })

//     return temp
//   } catch (e) {
//     return {}
//   }
// })()

// async function getEnvironment() {
//   // NOTE: By this definition, the environment variable overrides the
//   // "environment" property in the config file (if present). If neither is
//   // present, the environment defaults to "development".
//   Config.ENVIRONMENT = process.env.GT_ENV || Config.ENVIRONMENT

//   if (!Config.ENVIRONMENT) {
//     const { environment } = await inquirer.prompt([
//       {
//         type: "input",
//         name: "environment",
//       },
//     ])

//     Config.ENVIRONMENT = environment
//   }

//   return Config.ENVIRONMENT
// }

// function getHost() {
//   switch (Config.ENVIRONMENT) {
//     case Environment.DEVELOPMENT:
//       return Host.DEVELOPMENT

//     case Environment.STAGING:
//       return Host.STAGING

//     case Environment.PRODUCTION:
//       return Host.PRODUCTION
//   }
// }

module.exports = { host, environment, config, Host, Environment }
