module.exports = async function view(params) {
  const { execSync } = require("node:child_process")
  const gt = require("../..")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program title, ID, or key to view a specific program, or use `--all` to view all programs! See `gt help` for more info.",
    )
  }

  if (params[0] === "--all") {
    for (const key of Object.keys(gt.common.config.programs)) {
      const program = await gt.program.get(key)
      const { id } = program
      console.log(`Opening program "${id}" ...`)

      execSync(`xdg-open "https://www.guidedtrack.com/programs/${id}/edit"`, {
        encoding: "utf8",
      })
    }
  } else {
    const titleIdOrKey = params[0]
    const program = await gt.program.get(titleIdOrKey)
    const { id } = program
    console.log(`Opening program "${id}" ...`)

    execSync(`xdg-open "https://www.guidedtrack.com/programs/${id}/edit"`, {
      encoding: "utf8",
    })
  }
}
