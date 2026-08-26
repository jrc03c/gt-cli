# GuidedTrack API reference

Every network call this CLI makes, derived from the source in `src/`. The API is unofficial and undocumented; this file describes what the tool actually sends, not what the server officially supports.

## Base URLs

The host is chosen by the `GT_ENV` environment variable (see `src/types.ts`):

| `GT_ENV`                 | Host                                        |
| ------------------------ | ------------------------------------------- |
| `development`            | `https://localhost:3000`                    |
| `stage`                  | `https://guidedtrack-stage.herokuapp.com`   |
| `production` *(default)* | `https://www.guidedtrack.com`               |

An unrecognized value throws before any request is made.

## Common request shape

All requests go through `apiRequest()` in `src/lib/api.ts` (the two exceptions are noted below), which always sends:

- `Authorization: Basic <base64(email + ":" + password)>` — HTTP Basic auth, credentials resolved from `GT_EMAIL`/`GT_PASSWORD`, then `gt.config.json`, then an interactive prompt.
- `Content-Type: application/json` — **only** when a request body is present. Bodies are always `JSON.stringify`'d.

Any non-2xx response throws `API request failed: <status> <statusText>`. There is no retry logic and no response-body parsing on failure, so server-side error messages are discarded.

## Endpoints

### `GET /programs.json`

Lists programs belonging to the authenticated user. Returns a JSON array of program objects.

Query parameters:

- `query` (optional) — free-text search over program names, URL-encoded.
- `page` (always sent) — 1-based page number, appended by `iterateProgramPages()`.

Pagination: the server pages at a fixed size of **50** and ignores any `per_page` parameter. There is no total-count header, so the client walks pages until it receives a page with fewer than 50 items. Lookups that only need one match (`findProgramByTitle`, `findProgramByKey`) stop as soon as they find it, which costs a single request in the common case.

Response items are typed as:

```json
{ "id": 12345, "name": "My Program", "key": "abc1234", "contents": "..." }
```

`contents` is optional and not relied on.

Used by: `program list`, `program find`, and every command that resolves a program name or key to an ID.

### `GET /programs/{id}.json`

Fetches metadata for one program by numeric ID. Returns a single program object in the same shape as the list entries. Errors are swallowed — `getProgram()` returns `null` on any failure, so a 404 and a network outage are indistinguishable to the caller.

Used by: `init`, when you identify a program by its ID.

### `PUT /programs/{id}.json`

Replaces a program's source. Body:

```json
{ "contents": "<the .gt file's text>", "program": { "description": "" } }
```

The empty `description` is sent unconditionally, which means **every push overwrites the program's description on the server with an empty string.** That mirrors the original bash script's behavior.

Used by: `push`.

### `DELETE /programs/{id}.json`

Deletes a program. No body, no query parameters. The response is ignored — only the non-2xx check applies.

Used by: `program delete` (after an interactive confirmation unless `-y` is passed).

### `POST /programs`

Creates a program. Body:

```json
{ "name": "my-program.gt" }
```

Note that `name` is the local **filename**, including its extension — the CLI does not strip `.gt`.

The response is asynchronous. On success it contains a `job_id`, which the client polls (see below) at a 1-second interval, then re-searches `/programs.json?query={name}` to recover the new program's `id` and `key` for writing into `gt.config.json`. Poll failures are deliberately ignored, because the job can finish and disappear before the first poll lands. If the response has no `job_id`, the CLI prints the raw JSON and skips that file.

Used by: `create`.

### `GET /delayed_jobs/{job_id}`

Polls an async job. Returns:

```json
{ "id": 987, "status": "running" }
```

The client loops while `status === "running"`, sleeping 3 seconds between polls by default (1 second when called from `create`). Any status other than `"running"` — including `"failed"` — ends the loop and is treated as done; the CLI does not inspect the terminal status.

There is no timeout or maximum poll count, so a job stuck in `running` will hang the CLI indefinitely.

Used by: `build`, `push` (build step), `program build`, `create`.

### `GET /programs/{key}/embed`

Takes a 7-character program **key** (not an ID) and returns the two values needed to read compiled output:

```json
{ "run_id": 456789, "access_key": "..." }
```

Used by: every build path.

### `GET /runs/{run_id}/contents`

Fetches compiled program contents. Requires an extra header:

- `X-GuidedTrack-Access-Key: <access_key from /embed>`

This endpoint does double duty, and its response shape varies:

- If a rebuild is needed, it returns an object containing a numeric `job` field. The client polls that job, then requests this same endpoint a second time to read the result.
- Otherwise it returns the compiled contents — either an array of items or an object keyed by program name. Compilation errors are read from `metadata.errors` on each item, and the client handles both shapes.

Used by: `build`, `push` (build step), `program build`.

### `GET /programs/{id}/edit`

**Not a JSON endpoint.** This is the human-facing edit page, and the CLI scrapes it: it fetches the HTML with the same Basic auth header, extracts the contents of the `<textarea name="contents">` element via regex, strips a leading newline, and decodes five HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`).

This call bypasses `apiRequest()` and calls `fetch` directly, so it does not send `Content-Type` and throws a different message on failure (`Failed to fetch program source: ...`). If the regex doesn't match, it throws `Could not extract program source from edit page`.

This is the most fragile part of the client — any markup change on the edit page breaks it, and any entity the decoder doesn't know about (e.g. `&nbsp;`) will survive into the downloaded file.

Used by: `pull`, `program source`.

### `GET /programs/{id}/csv`

Downloads the program's collected data. The response is read as text, not JSON, and written to stdout or to the path given by `-o`.

Used by: `program data` / `program csv`.

## Arbitrary requests

`gt request <path>` sends any path through the same client, with `-X/--method`, `-d/--data` (a JSON string, parsed before sending), and repeatable `-H/--header key:value`. Auth and base-URL resolution still apply. The response is pretty-printed if it parses as JSON, otherwise echoed as text.

## URLs opened in a browser, not fetched

These are launched via `xdg-open`/`open`/`start` and never requested by the CLI itself. They're listed here because they're part of the same URL space:

| Command           | URL                            |
| ----------------- | ------------------------------ |
| `program view`    | `/programs/{id}/edit`          |
| `program preview` | `/programs/{key}/preview`      |
| `program run`     | `/programs/{key}/run`          |

Note the identifier switch: `view` uses the numeric ID, while `preview` and `run` use the 7-character key.

## Identifiers

- **ID** — numeric, from the edit-page URL (e.g. `9197`). Used by all `/programs/{id}` routes.
- **Key** — 7-character string, from the public run URL (e.g. `i1qsozk`). Used by `/embed`, `/preview`, `/run`, and as the top-level key in `gt.config.json`.
- **Run ID + access key** — obtained together from `/embed`; only meaningful for `/runs/{run_id}/contents`.
