import { urlPathJoin } from "@jrc03c/js-text-tools"
import process from "node:process"

if (typeof process.env.GT_EMAIL === "undefined") {
  throw new Error("The environment variable `GT_EMAIL` is undefined!")
}

if (typeof process.env.GT_PASS === "undefined") {
  throw new Error("The environment variable `GT_PASS` is undefined!")
}

const BASE_URL = "https://www.guidedtrack.com"

const authString = Buffer.from(
  process.env.GT_EMAIL + ":" + process.env.GT_PASS,
).toString("base64")

const response = await fetch(urlPathJoin(BASE_URL, "/programs.json"), {
  method: "GET",
  headers: {
    Authorization: `Basic ${authString}`,
  },
})

if (response.status >= 400) {
  throw new Error(`${response.status} : ${await response.text()}`)
}

console.log(await response.json())
console.log(response.status)
