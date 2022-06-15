// build() {
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

const { GTError } = require("../common.js")
const { isUndefined, pause } = require("../helpers.js")
const { poll } = require("../job")
const get = require("./get.js")
const request = require("../request")

async function getProgramEmbedInfo(key) {
  const response = await request.send({ path: `/programs/${key}/embed` })
  return await response.json()
}

async function getProgramContents(key) {
  const embedInfo = await getProgramEmbedInfo(key)
  const runID = embedInfo.run_id
  const accessKey = embedInfo.access_key

  const response = await request.send({
    path: `/runs/${runID}/contents`,
    headers: { "X-GuidedTrack-Access-Key": accessKey },
  })

  return await response.json()
}

module.exports = async function (idOrKey, callback) {
  if (!isUndefined(callback) && typeof callback !== "function") {
    throw new GTError(`
      The second (and optional) argument to the \`gt.program.build\` function
      must be a function!
    `)
  }

  callback = callback || (() => {})

  // fetch the program
  callback({ finished: false, status: `Fetching program ${idOrKey}...` })

  const program = await get(idOrKey)
  const key = program.key

  // get the program's contents
  callback({ finished: false, status: `Getting program contents...` })

  const contents = await getProgramContents(key)
  const { job } = contents

  if (isUndefined(job)) {
    callback({
      finished: true,
      status: "No changes were made, so building was not initiated.",
    })

    return undefined
  }

  // poll the build job status
  let status = "running"

  while (status === "running") {
    callback({
      finished: false,
      status: "Waiting for build job to finish...",
    })

    status = (await poll(job)).status
  }

  // get the updated program contents; if there were any compilation errors,
  // then throw them; otherwise, return true
  callback({ finished: false, status: "Checking for compilation errors..." })
  const updatedContents = await getProgramContents(key)
  const name = updatedContents.starting_program
  const errors = updatedContents[name].metadata.errors

  if (errors && errors.length > 0) {
    throw new GTError(
      [`The update succeeded, but there were some syntax errors:`].concat(
        errors.map((e, i) => `🚨 (${i + 1}) ${e}`)
      )
    )
  }

  callback({ finished: true, status: "Build finished successfully!" })
  return true
}
