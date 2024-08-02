module.exports = async function help() {
  const { Chalk } = await import("chalk")
  const { prettify } = require("../../src/helpers.js")
  const chalk = new Chalk()

  const help = prettify(`
    ${chalk.bold("===========")}
    ${chalk.bold("gt-cli help")}
    ${chalk.bold("===========")}

    ------
    ${chalk.bold("Syntax")}
    ------

      ${chalk.blue.bold("gt [command] [sub-command] [parameters]")}

    --------
    ${chalk.bold("Commands")}
    --------

      ${chalk.green("config")} = prints the current project's configuration (i.e., from the project's .gtconfig file)

      ${chalk.green("docs")} = opens the GuidedTrack docs website

        ${chalk.yellow(
          "search [query]",
        )} = opens the GuidedTrack docs website and searches for the given query

      ${chalk.green("help")} = shows this help message

      ${chalk.green(
        "init",
      )} = creates a new .gtconfig file in the current directory and searches the directory and its subdirectories for any GuidedTrack program files (i.e., files with .gt or .guidedtrack extensions)

      ${chalk.green("program")}

        ${chalk.yellow(
          "add [options] [title, id, or key]",
        )} = downloads a program's source code and adds the program to the .gtconfig file; options are:

          --file [path]

        ${chalk.yellow(
          "build [title, ID, or key]",
        )} = compiles a program given an title, ID, or key

        ${chalk.yellow(
          "create [options] [name]",
        )} = creates a new program with the given name; options are:
          
          --add
          --file [path]

        ${chalk.yellow("csv [title, ID, or key]")} = (see the \`data\` subcommand)

        ${chalk.yellow("data [title, ID, or key]")} = retrieves the data CSV of a program with the given title, ID, or key, or gets all programs' CSVs if --all is used (same as \`gt program list\`); options are:

          --all

        ${chalk.yellow(
          "delete [options] [title, ID, or key]",
        )} = deletes the program with the given title, ID, or key; by default, you'll be prompted to confirm the deletion before the request is sent, but this behavior can be disabled by using --unsafe; options are:

          --unsafe

        ${chalk.yellow(
          "filter [query]",
        )} = searches for and returns all programs with names that include the query

        ${chalk.yellow(
          "find [query]",
        )} = searches for and returns the first program with a name that includes the query

        ${chalk.yellow(
          "get [title, ID, or key]",
        )} = retrieves the metadata of a program with the given title, ID, or key, or gets all programs if --all is used (same as \`gt program list\`); options are:

          --all

        ${chalk.yellow(
          "list",
        )} = lists all programs (same as \`gt program get --all\`)

        ${chalk.yellow(
          "preview [title, id, or key]",
        )} = opens the default browser to the public preview page of the program with the given title, ID, or key

        ${chalk.yellow(
          "run [title, id, or key]",
        )} = opens the default browser to the public run page of the program with the given title, ID, or key

        ${chalk.yellow(
          "source [title, ID, or key]",
        )} = fetches the source code of the remote program with the given title, ID, or key

        ${chalk.yellow(
          "test [options] [title, id, or key]",
        )} = opens the default browser to the automated testing page for the program with the given title, ID, or key; see https://github.com/jrc03c/gt-tester for more info; options are:

          --mode [run or preview]

        ${chalk.yellow(
          "upload [options] [title, ID, or key]",
        )} = uploads the code contents of the program with the given title, ID, or key (same as \`gt push [title, ID, or key]\`); it automatically compiles the remote program by default, but this behavior can be disabled with --no-build; options are:

          --no-build

        ${chalk.yellow("view [title, ID, or key]")} = opens the default browser to the editing page for the program with the given title, ID, or key; or opens the default browser to the editing pages for all programs if --all is used (same as \`gt program list\`); options are:

          --all

      ${chalk.green(
        "pull [title, id, or key]",
      )} = fetches the code contents of a remote program if a title, ID, or key is given and overwrites the program's local file (assuming the program is listed in \`programs\` in the .gtconfig file); otherwise, fetches the code contents of all remote programs listed in .gtconfig and overwrites their corresponding local files

      ${chalk.green(
        "push [options] [title, id, or key]",
      )} = overwrites a remote program with its local copy if a title, ID, or key is given; otherwise, overwrites all remote programs listed in .gtconfig with their corresponding local file contents; it automatically compiles the remote programs by default, but this behavior can be disabled with --no-build; options are:

        --no-build

      ${chalk.green("request")}
      
        ${chalk.yellow(
          "send [options] [path]",
        )} = sends an HTTP request to an API endpoint; options are:

          --method [method] (default is "GET")
          --headers [headers as JSON]
          --body [body as JSON]
          --query [query as JSON]

    --------
    ${chalk.bold("Examples")}
    --------

      ${chalk.dim("# print the current project's config")}
      gt config

      ${chalk.dim("# open the docs website")}
      gt docs

      ${chalk.dim("# open the docs website and search for the *email keyword")}
      gt docs search *email

      ${chalk.dim("# print this help message again")}
      gt help

      ${chalk.dim("# initialize a project by generating a .gtconfig file")}
      gt init

      ${chalk.dim("# fetch the metadata of all programs and print them to `stdout`")}
      ${chalk.dim("# (same as `gt program get --all`)")}
      gt program list

      ${chalk.dim("# build a program")}
      gt program build 19868

      ${chalk.dim("# create a new program")}
      gt program create "My cool program"

      ${chalk.dim("# download a program's data in CSV format and save it to a file")}
      gt program csv 19868 > 19868.csv
      gt program data 19868 > 19868.csv

      ${chalk.dim("# download data from all programs as CSVs")}
      gt program csv --all
      gt program data --all

      ${chalk.dim("# delete a program")}
      gt program delete 19868

      ${chalk.dim("# search for a single program by name")}
      gt program find "Some query"

      ${chalk.dim("# search for multiple programs by name")}
      gt program filter "Some query"

      ${chalk.dim("# fetch the metadata of a program and print it to `stdout`")}
      gt program get 19868

      ${chalk.dim(
        "# fetch the metadata of all programs and print them to `stdout`",
      )}
      ${chalk.dim("# (same as `gt program list`)")}
      gt program get --all

      ${chalk.dim("# open the default browser to a program's preview page")}
      gt program preview 19868

      ${chalk.dim("# open the default browser to a program's (public) run page")}
      gt program run 19868

      ${chalk.dim("# download a program's source code and save it to a file")}
      gt program source 19868 > 19868.gt

      ${chalk.dim("# open the default browser to the `gt-tester` app to test the program")}
      gt program test 19868

      ${chalk.dim("# upload the local contents of a program")}
      gt program upload abcd123

      ${chalk.dim("# open the default browser to a program's edit page")}
      gt program view 19868

      ${chalk.dim(
        "# fetch all remote programs and overwrite their local counterparts",
      )}
      gt pull

      ${chalk.dim(
        "# overwrite all remote programs with their local counterparts",
      )}
      gt push

      ${chalk.dim("# overwrite a particular program with its local copy")}
      gt push abcd123

      ${chalk.dim("# send a custom API request")}
      gt request send \\
        --method "POST" \\
        --headers { "Content-Type": "application/json" } \\
        --body { "hello": "world" } \\
        /some/api/endpoint
  `)

  console.log("")
  console.log(help)
  console.log("")
}
