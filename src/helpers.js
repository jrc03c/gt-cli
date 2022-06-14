const fs = require("fs")
const path = require("path")

function btoa(x) {
  return Buffer.from(x).toString("base64")
}

function match(text, pattern) {
  if (pattern instanceof RegExp) {
    return text.match(pattern)
  } else {
    return text.includes(pattern.toString())
  }
}

function findUpward(pattern, startingDirectory) {
  const cwd = startingDirectory || process.cwd()
  const parts = cwd.split("/")

  while (parts.length > 1) {
    const files = fs.readdirSync(parts.join("/"))
    const file = files.find(f => match(f, pattern))

    if (file) {
      return path.join(parts.join("/"), file)
    }

    parts.pop()
  }

  const files = fs.readdirSync("/")
  const file = files.find(f => match(f, pattern))

  if (file) {
    return "/" + file
  }

  return null
}

function isUndefined(x) {
  return typeof x === "undefined" || x === null
}

module.exports = { btoa, findUpward, isUndefined }
