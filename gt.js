const http = require("http")
const https = require("https")
const inquirer = require("inquirer")
const DEVELOPMENT = "http://localhost:3000"
const STAGE = "https://guidedtrack-stage.herokuapp.com"
const PRODUCTION = "https://www.guidedtrack.com"

function fetch(options){
  return new Promise(function(resolve, reject){
    try {
      let protocol
      
      if (options.hostname.split("://")[0] === "http"){
        protocol = http
        options.port = 80
      } else {
        protocol = https
        options.port = 443
      }

      options.hostname = options.hostname.split("://")[1]

      let request = protocol.request(options, function(response){
        response.on("data", function(data){
          return resolve(data)
        })
      })

      request.on("error", function(error){
        return reject(error)
      })
    } catch(e) {
      return reject(e)
    }
  })
}

function btoa(s){
  return Buffer.from(s, "utf8").toString("base64")
}

async function authenticate(){
  let credentials = await inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "GT Email:"
    },

    {
      type: "password",
      name: "password",
      message: "GT Password:"
    }
  ])

  return credentials
}

async function setEnvironment(){
  let answer
  let hosts = {
    development: DEVELOPMENT,
    stage: STAGE,
    production: PRODUCTION,
  }

  answer = await inquirer.prompt([
    {
      type: "list",
      message: "Environment:",
      name: "environment",
      choices: ["development", "stage", "production"],
    }
  ])

  if (answer.environment === "production"){
    let confirmation = await inquirer.prompt([
      {
        type: "list",
        message: "WARNING: You're about to change programs in production, which will have an immediate effect on your users. Are you sure that you want to use the production environment?",
        name: "confirmation",
        choices: ["yes", "no"],
      }
    ])

    if (confirmation.confirmation === "no"){
      return process.exit()
    }
  }
  
  return {
    environment: answer.environment,
    host: hosts[answer.environment],
  }
}

// _find_program() {
//   name_query=`echo -n "$1" | jq --slurp --raw-input --raw-output '@uri'`
//   url="$host/programs.json?query=$name_query"
//   curl -sS -u "${email}:${password}" $url \
//     | jq -f <(echo "map(select(.name == \"$1\"))[0]") 2>&1
// }

async function findProgram(host, credentials, query){
  let response = await fetch({
    hostname: host,
    path: "/programs.json?query=" + query,
    method: "GET",
    headers: {
      "Authorization": "Basic: " + btoa(credentials.username + ":" + credentials.password),
    },
  })

  return await response.json()
}

async function go(){
  let credentials = await authenticate()
  let host = (await setEnvironment()).host
  let query = "SAPA"
  console.log(await findProgram(host, credentials, query))
}

go()

// _poll_job_status() {
//   curl -sS -u "${email}:${password}" "$host/delayed_jobs/$1" \
//     | jq '.status' --raw-output 2>&1
// }

function pollJobStatus(){

}

// _program_contents() {
//   curl -Ss -u "${email}:${password}" -H "X-GuidedTrack-Access-Key: $access_key" $host/runs/$run_id/contents
// }

function getProgramContents(){

}

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

function push(){

}

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

function create(){

}

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

function build(){

}

// if [[ $1 =~ ^(push|create|build)$ ]]
// then
//   "$@"
// else
//   echo "Invalid subcommand: $1" >&2
//   exit 1
// fi

