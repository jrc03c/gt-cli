class GTError extends Error {
  constructor(message) {
    message = message.replaceAll(
      "`gt help`",
      "\x1b[1m\x1b[31m`gt help`\x1b[0m\x1b[33m"
    )

    super(`🚨 \x1b[33m${message}\x1b[0m`)
  }
}

module.exports = GTError
