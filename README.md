# Intro

This tool makes it easy to communicate with the GuidedTrack API from the command line and/or Node.

# Installation

```bash
npm install -g https://github.com/jrc03c/gt-cli
```

Or:

```bash
git clone https://github.com/jrc03c/gt-cli
cd gt-cli
npm link
```

# Usage

## Node

```js
const gt = require("gt-cli")

gt.program.find("My program").then(program => {
  // ...
})
```

See the full Node API below.

## Command line

```bash
gt program source "My program" > program.gt
```

See the full command line API below and/or run `gt help`.

# API

## Node

[coming soon...]

## Command line

Syntax:

```bash
gt [command] [sub-command] [parameters]
```

### Commands

#### `config`

prints the current project's configuration (i.e., from the project's `.gtconfig` file)

#### `docs`

opens the GuidedTrack docs website

#### `search [query]`

opens the GuidedTrack docs website and searches for the given query

#### `help`

shows a help message

#### `init`

creates a new .gtconfig file in the current directory and searches the directory and its subdirectories for any GuidedTrack program files (i.e., files with .gt or .guidedtrack extensions)

#### `program`

Subcommands:

- `add [options] [title, id, or key]` = downloads a program's source code and adds the program to the `.gtconfig` file; options are:
  - `--file [path]`
- `build [title, ID, or key]` = compiles a program given an title, ID, or key
- `create [options] [name]` = creates a new program with the given name; options are:
  - `--add`
  - `--file [path]`
- `csv [title, ID, or key]` = (see the `data` subcommand)
- `data [title, ID, or key]` = retrieves the data CSV of a program with the given title, ID, or key, or gets all programs' CSVs if `--all` is used (same as `gt program list`); options are:
  - `--all`
- `delete [options] [title, ID, or key]` = deletes the program with the given title, ID, or key; by default, you'll be prompted to confirm the deletion before the request is sent, but this behavior can be disabled by using `--unsafe`; options are:
  - `--unsafe`
- `filter [query]` = searches for and returns all programs with names that include the query
- `find [query]` = searches for and returns the first program with a name that includes the query
- `get [title, ID, or key]` = retrieves the metadata of a program with the given title, ID, or key, or gets all programs if `--all` is used (same as `gt program list`); options are:
  - `--all`
- `list` = lists all programs (same as `gt program get --all`)
- `preview [title, id, or key]` = opens the default browser to the public preview page of the program with the given title, ID, or key
- `run [title, id, or key]` = opens the default browser to the public run page of the program with the given title, ID, or key
- `source [title, ID, or key]` = fetches the source code of the remote program with the given title, ID, or key
- `test [options] [title, id, or key]` = opens the default browser to the automated testing page for the program with the given title, ID, or key; see https://github.com/jrc03c/gt-tester for more info; options are:
  - `--mode [run or preview]`
- `upload [options] [title, ID, or key]` = uploads the code contents of the program with the given title, ID, or key (same as `gt push [title, ID, or key]`); it automatically compiles the remote program by default, but this behavior can be disabled with `--no-build`; options are:
  - `--no-build`
- `view [title, ID, or key]` = opens the default browser to the editing page for the program with the given title, ID, or key; or opens the default browser to the editing pages for all programs if `--all` is used (same as `gt  program list`); options are:
  - `--all`

#### `pull [title, id, or key]`

fetches the code contents of a remote program if a title, ID, or key is given and overwrites the program's local file (assuming the program is listed in `programs` in the `.gtconfig` file); otherwise, fetches the code contents of all remote programs listed in `.gtconfig` and overwrites their corresponding local files

#### `push [options] [title, id, or key]`

overwrites a remote program with its local copy if a title, ID, or key is given; otherwise, overwrites all remote programs listed in .gtconfig with their corresponding local file contents; it automatically compiles the remote programs by default, but this behavior can be disabled with `--no-build`; options are:

- `--no-build`

#### `request`

Subcommands:

- `send [options] [path]` = sends an HTTP request to an API endpoint; options are:
  - `--method [method]` (default is "GET")
  - `--headers [headers as JSON]`
  - `--body [body as JSON]`
  - `--query [query as JSON]`

---

## Examples

```bash
# print the current project's config
gt config

# open the docs website
gt docs

# open the docs website and search for the \*email keyword
gt docs search \*email

# print this help message again
gt help

# initialize a project by generating a .gtconfig file
gt init

# fetch the metadata of all programs and print them to `stdout`

# (same as `gt program get --all`)
gt program list

# build a program
gt program build 19868

# create a new program
gt program create "My cool program"

# download a program's data in CSV format and save it to a file
gt program csv 19868 > 19868.csv
gt program data 19868 > 19868.csv

# download data from all programs as CSVs
gt program csv --all
gt program data --all

# delete a program
gt program delete 19868

# search for a single program by name
gt program find "Some query"

# search for multiple programs by name
gt program filter "Some query"

# fetch the metadata of a program and print it to `stdout`
gt program get 19868

# fetch the metadata of all programs and print them to `stdout`
# (same as `gt program list`)
gt program get --all

# open the default browser to a program's preview page
gt program preview 19868

# open the default browser to a program's (public) run page
gt program run 19868

# download a program's source code and save it to a file
gt program source 19868 > 19868.gt

# open the default browser to the `gt-tester` app to test the program
gt program test 19868

# upload the local contents of a program
gt program upload abcd123

# open the default browser to a program's edit page
gt program view 19868

# fetch all remote programs and overwrite their local counterparts
gt pull

# overwrite all remote programs with their local counterparts
gt push

# overwrite a particular program with its local copy
gt push abcd123

# send a custom API request
gt request send \
 --method "POST" \
 --headers { "Content-Type": "application/json" } \
 --body { "hello": "world" } \
 /some/api/endpoint
```
