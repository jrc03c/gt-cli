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

module.exports = async function () {}
