// NOTES
// curl flags:
//   -s = silent
//   -S = show errors

const fetch = require("node-fetch")
const fs = require("fs")
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

const Config = (() => {
  try {
    const temp = require("./config.json")

    Object.keys(temp).forEach(key => {
      temp[key.toUpperCase()] = temp[key]
      delete temp[key]
    })

    return temp
  } catch (e) {
    return {}
  }
})()

function btoa(x) {
  return Buffer.from(x).toString("base64")
}

async function sendRequest(options) {
  if (!options.path || !options.method) {
    throw new Error(
      [
        "The `options` object passed into the `sendRequest` function must",
        "have `path` and `method` properties!",
      ].join(" ")
    )
  }

  const { username, password } = await getCredentials()
  const credentials = btoa(`${username}:${password}`)
  const host = getHost()
  let url = `${host}${options.path}`

  if (options.query) {
    url = url + "?" + new URLSearchParams(options.query)
  }

  const requestOptions = {
    method: options.method,
    headers: { Authorization: `Basic ${credentials}` },
  }

  if (options.body) {
    requestOptions.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
  }

  const response = await fetch(url, requestOptions)
  return response
}

async function getCredentials() {
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

async function getEnvironment() {
  // NOTE: By this definition, the environment variable overrides the
  // "environment" property in the config file (if present). If neither is
  // present, the environment defaults to "development".
  Config.ENVIRONMENT = process.env.GT_ENV || Config.ENVIRONMENT

  if (!Config.ENVIRONMENT) {
    const { environment } = await inquirer.prompt([
      {
        type: "input",
        name: "environment",
      },
    ])

    Config.ENVIRONMENT = environment
  }

  return Config.ENVIRONMENT
}

function getHost() {
  switch (Config.ENVIRONMENT) {
    case Environment.DEVELOPMENT:
      return Host.DEVELOPMENT

    case Environment.STAGING:
      return Host.STAGING

    case Environment.PRODUCTION:
      return Host.PRODUCTION
  }
}

async function findProgram(query) {
  const response = await sendRequest({
    path: "/programs.json",
    method: "GET",
    query: { query },
  })

  const data = await response.json()
  return data
}

// _poll_job_status() {
//   curl -sS -u "${email}:${password}" "$host/delayed_jobs/$1" \
//     | jq '.status' --raw-output 2>&1
// }

function pollJobStatus() {}

// _program_contents() {
//   curl -Ss -u "${email}:${password}" -H "X-GuidedTrack-Access-Key: $access_key" $host/runs/$run_id/contents
// }

function getProgramContents() {}

// push() {
//   _authenticate
//   _detect_environment

//   selector="*"
//   while getopts ":o:b" opt
//   do
//     case $opt in
//       o)
//         selector=$OPTARG
//         ;;
//       b)
//         build="yes"
//         ;;
//       \?)
//         echo "Invalid option: -$OPTARG" >&2
//         exit 1
//         ;;
//       :)
//         echo "Option -$OPTARG requires an argument." >&2
//         exit 1
//         ;;
//     esac
//   done

//   echo "Pushing to $environment ($host)..."

//   for file in $selector
//   do
//     if [ -f "./$file" ]
//     then
//       id=`_find_program "$file" | jq '.id' 2>&1`

//       if [ $? -eq 0 ]
//       then
//         if [ $id = "null" ]
//         then
//           printf ">> Program named \"$file\" not found, skipping... "
//         else
//           printf ">> Updating \"${file}\" (id: $id)... "
//         fi
//       else
//         echo $id >&2
//         exit 1
//       fi

//       result=$(cat "./$file" | jq --slurp --raw-input '{code:{contents: .}}' | curl -X PUT -u "${email}:${password}" -d @- -H 'Content-Type: application/json' "$host/programs/$id.json" 2>&1)
//       if [ $? -eq 0 ]
//       then
//         echo "done"
//       else
//         echo "failed" >&2
//         echo $result >&2
//         exit 1
//       fi
//     fi
//   done

//   if [ -z $build ]
//   then
//     echo ""
//   else
//     build
//   fi

//   exit 0
// }

function push() {}

// create() {
//   _authenticate
//   _detect_environment

//   echo "Creating programs in $environment ($host)..."

//   for file in *
//   do
//     if [ -f "./$file" ]
//     then
//       printf ">> Creating \"${file}\"... "

//       response=$(jq -n "{name:\"$file\"}" | curl -X POST -u "${email}:${password}" -d @- -H 'Content-Type: application/json' "$host/programs" 2>/dev/null)
//       if [ $? -eq 0 ]
//       then
//         result=$(echo "${response}" | jq 'if .job_id then 0 else 1 end')
//         if [ $result -eq 0 ]
//         then
//           echo "done"
//         else
//           echo "failed" >&2
//           echo "${response} -- skipping" >&2
//         fi
//       else
//         echo "failed" >&2
//         echo ${response} >&2
//         exit 1
//       fi
//     fi
//   done

//   exit 0
// }

function create() {}

// build() {
//   if [ -z $environment ]
//   then
//     _detect_environment
//   fi

//   if [ -z $email ] || [ -z $password ]
//   then
//     _authenticate
//   fi

//   if [ -f ".gt_projects" ]
//   then
//     cat .gt_projects |\
//       while read proj
//       do
//         key=`_find_program "$proj" | jq '.key' --raw-output`
//         echo ">> Building project \"$proj\" (key: $key)"

//         embed_info=`curl -u "${email}:${password}" $host/programs/$key/embed -Ss`
//         run_id=`echo $embed_info | jq ".run_id" --raw-output`
//         access_key=`echo $embed_info | jq ".access_key" --raw-output`

//         job_id=$(_program_contents | jq '.job' --raw-output)

//         if [ $job_id = "null" ]
//         then
//           echo ">>>> No changes to build"
//         else
//           printf ">>>> Waiting for new build (job: $job_id)... "
//           while [ `_poll_job_status $job_id` = "running" ]
//           do
//             sleep 3
//           done
//           echo "done"
//         fi

//         errors=$(_program_contents | jq '[.[] | objects | .metadata.errors] | flatten | join("\n")' --raw-output)
//         if [ -z $errors ]
//         then
//           echo ">>>> No errors"
//         else
//           echo ">>>> Found compilation errors:"
//           echo $errors
//         fi
//       done
//   else
//     echo "No .gt_projects file, nothing to build"
//     exit 0
//   fi
// }

function build() {}

// if [[ $1 =~ ^(push|create|build)$ ]]
// then
//   "$@"
// else
//   echo "Invalid subcommand: $1" >&2
//   exit 1
// fi

if (typeof module !== "undefined") {
  module.exports = {
    Host,
    Environment,
    Config,
    btoa,
    getCredentials,
    getEnvironment,
    getHost,
    findProgram,
  }

  if (typeof require !== "undefined" && require.main === module) {
    async function run() {
      await getCredentials()
      await getEnvironment()
    }

    run()
  }
}
