// push() {
//

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

module.exports = async function (dict) {
  // const dict = {
  //   shouldBuild: true,
  //   programs: [
  //     { file: "/some/file.gt", id: "foobar" },
  //     { contents: "Hello", id: "blah" },
  //   ],
  // }

  throw new Error(
    [
      "NOTE: In Lyudmil's implementation, he searches for the program first",
      "before updating its code! We should probably do that too!",
    ].join(" ")
  )

  const message = [
    "You must pass an object into the `push` function with a `programs`",
    "property that points to an array of program objects (each with",
    "`file` / `contents` and `id` properties)!",
  ].join(" ")

  if (typeof dict !== "object" || dict === null) {
    throw new Error(message)
  }

  const promises = dict.programs.map(program => {
    if (!program.contents) {
      if (!program.file) {
        throw new Error(message)
      }

      program.contents = fs.readFileSync(program.file, "utf8")
    }

    if (!program.id) {
      throw new Error(message)
    }

    return sendRequest({
      path: `/programs/${id}.json`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: { code: { contents: program.contents } },
    })
  })

  const responses = await Promise.all(promises)
  const datas = await Promise.all(responses.map(r => r.json()))

  if (dict.shouldBuild) {
    return await build(dict)
  } else {
    return datas
  }
}
