// async function getEmbedInfo(key) {
//   const response = await sendRequest(`/programs/${key}/embed`)
//   const data = await response.json()
//   return data
// }

// async function getProgramContents(key, runID) {
//   const embedInfo = await getEmbedInfo(key)
//   const { accessKey } = embedInfo

//   const response = await sendRequest({
//     path: `/runs/${runID}/contents`,
//     headers: { "X-GuidedTrack-Access-Key": accessKey },
//   })

//   const contents = await response.text()
//   return contents
// }

module.exports = async function () {}
