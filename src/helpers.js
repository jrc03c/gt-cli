const fs = require("fs")

function btoa(x) {
  return Buffer.from(x).toString("base64")
}

function findUpward(pattern, startingDirectory) {
  const cwd = startingDirectory || process.cwd()
  const parts = cwd.split("/")

  while (parts.length > 0) {
    const files = fs.readdirSync(parts.join("/"))
    const file = files.find(f => f.match(pattern) || f.includes(pattern))
    if (file) return file
  }

  const files = fs.readdirSync("/")
  const file = files.find(f => f.match(pattern) || f.includes(pattern))
  if (file) return file
  return null
}

module.exports = { btoa, findUpward }
