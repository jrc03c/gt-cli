module.exports = async function (params) {
  const fs = require("node:fs")
  const gt = require("../..")
  const path = require("node:path")
  const process = require("node:process")

  if (params.length === 0) {
    throw new gt.common.GTError(
      "You must specify a program title, ID, or key to retrieve the data CSV from a specific program, or use `--all` to retrieve data CSVs from all programs listed in your .gtconfig file! See `gt help` for more info.",
    )
  }

  if (params[0] === "--all") {
    const programs = (await gt.program.get()).filter(
      p => !!gt.common.config.programs[p.key],
    )

    if (programs.length > 0) {
      console.log("")

      for (const program of programs) {
        const raw = await gt.program.data(program.id)
        const csvPath = path.join(process.cwd(), program.id + ".csv")
        fs.writeFileSync(csvPath, raw, "utf8")

        console.log(
          `Saved data from program "${program.name}" (${program.id}) to:`,
        )

        console.log(`"${csvPath}"`)
        console.log("")
      }
    } else {
      throw new gt.common.GTError(
        "There are no programs listed in your .gtconfig file! Please add some programs first using `gt program add [title, id, or key]` and then run `gt program data` again. See `gt help` for more info.",
      )
    }
  } else {
    const titleIdOrKey = params[params.length - 1]
    const contents = await gt.program.data(titleIdOrKey)
    console.log(contents)
  }
}
