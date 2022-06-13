module.exports = async function () {
  if (!Config.USERNAME) {
    const { username } = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "GT username / email:",
      },
    ])

    Config.USERNAME = username
  }

  if (!Config.PASSWORD) {
    const { password } = await inquirer.prompt([
      {
        type: "password",
        name: "password",
        message: "GT password:",
      },
    ])

    Config.PASSWORD = password
  }

  return { username: Config.USERNAME, password: Config.PASSWORD }
}
