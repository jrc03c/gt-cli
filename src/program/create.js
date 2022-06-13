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

module.exports = async function () {}
