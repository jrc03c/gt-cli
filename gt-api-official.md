HTTP endpoint reference
=======================

This is a hand-derived catalogue of every route in `config/routes.rb`, annotated with the request and response details found by reading the controllers. It was written because the repo had no endpoint documentation at all.

**Treat it as a map, not a contract.** There is no versioned API namespace, no serializer layer, and no request-spec suite pinning these shapes. Response bodies for `render json: @model` come straight from ActiveRecord's default `as_json`, so they change whenever a migration does. Where a detail was ambiguous in the source it is marked *(unverified)*.


Regenerating the authoritative route list
-----------------------------------------

This document expands the routes by hand. For the canonical list, run:

```bash
bundle exec rails routes
```

That prints the route name, verb, path pattern, and `controller#action` for every route including the ones Devise generates dynamically. Diff its output against this file when routes change.


Conventions
-----------

### Formats

Most endpoints are Rails controllers that serve HTML to a browser. A subset — the ones the program interpreter and the React editor call — serve JSON. A handful serve `text/plain`, streamed CSV, or an HTML partial fragment.

Endpoints that use `respond_to` accept a `.json` suffix or an `Accept: application/json` header. Endpoints that unconditionally `render json:` ignore the requested format and always return JSON.

JSON responses have HTML-entity escaping disabled (see commit `6565f7bec`), so `<`, `>`, and `&` appear literally in string values rather than as `<` escapes.

### Authentication

Four independent mechanisms coexist. Each endpoint uses exactly one.

| Mechanism | How it travels | Used by |
|---|---|---|
| **Session cookie** | `_gt_partitioned_session`, ActiveRecord-backed, expires after 14 days | Every browser-facing endpoint; Devise `current_user` |
| **Run access key** | `X-GuidedTrack-Access-Key` header, compared against `runs.access_key` | Every endpoint the running program's interpreter calls |
| **Data-download token** | `?token=` query parameter, single-use, expiring | `programs#exports` when called by the Hypothesize service |
| **HMAC signature** | `x-appsumo-signature` + `x-appsumo-timestamp` headers over the raw body | The AppSumo webhook only |

A failed run-access-key check returns `401` with `{"error": "invalid run access key"}` (`ApplicationController#authorize_access_to_run`).

Two more headers appear on interpreter requests:

- `X-GuidedTrack-Client-ID` — an opaque browser identifier. `PUT /runs/:id/sync` records it on the run when the sync succeeds, so the server can tell which browser tab last wrote data.
- `Authorization` — allowed through CORS for mobile-app purchase calls, but no controller in this repo reads it directly.

### Authorization

CanCan (`Ability`) gates program access. `authorize! :read | :edit | :publish | :run, @program` raises `CanCan::AccessDenied`, which `ApplicationController` rescues per format:

- **HTML** — redirect to `/programs` (if signed in) or the program's sign-in page, with a flash alert.
- **JSON** — `403` with `{"explanation": "You don't have permission to <action>", "resolution": "Contact us if you think this is an error"}` when signed in; `401` with `{"explanation": "<Action> failed because you're not logged in", "resolution": "Please log in, reload this page, and try again"}` when not.

Separately, when a program has `collect_user_data` disabled, every data-writing endpoint returns `403` with `{"error": "Data collection is disabled for this program"}`.

### CSRF

`protect_from_forgery` is on globally. Non-GET requests made with a session cookie need a valid `X-CSRF-Token` header or `authenticity_token` parameter. The interpreter gets its token from the `authenticity_token` field of the `GET /programs/:program_key/embed` response.

Three actions skip the check entirely: `programs#embed`, `captcha#verify`, and `appsumo#events`.

### CORS

There is no `rack-cors` gem. CORS headers are set by hand in two places.

`EmbedProgramHelper#allow_requests_from_embedding_pages` — used by every interpreter endpoint. It sets headers **only if** the request's `Referer` matches a URL registered as an embedding page for that program (`Program#has_page?`). When it matches:

```
Access-Control-Allow-Origin: <the request's Origin, trailing slash stripped, or "null">
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: X-GuidedTrack-Access-Key, X-CSRF-Token, X-GuidedTrack-Client-ID, Authorization
```

When the referer doesn't match, no CORS headers are sent and the browser blocks the response. This is the mechanism behind the failed-`PUT /runs/:id/sync` symptom described in [embedded.md](embedded.md).

`ApplicationController#allow_requests_from_all_domains` — used by `GET /runs/:id/contents` and `GET /delayed_jobs/:id`. Sets `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET, OPTIONS` unconditionally.

No route declares an `OPTIONS` handler, so genuine CORS preflights have nothing to hit *(unverified — worth testing if you add a header or method that triggers preflight)*.

### Rate limiting

Rack::Attack runs ahead of the Rails stack (`config/initializers/rack_attack.rb`). A throttled request gets `429` with the plain-text body `Retry later`, plus reflected CORS headers so embedded programs can read the status.

| Rule | Limit | Keyed on |
|---|---|---|
| `runs/:id/sync` | 2 per second (`DATA_LOG_REQUEST_LIMIT_COUNT` / `_PERIOD`) | request path |
| `runs/:id/update_csv_data` | 2 per second | request path |
| `programs/:key/runs/:id/update_csv_row` | 2 per second | request path |
| `run_event/write` | 2 per second | path + `run_id` param |
| `programs/:key/embed` | 100 per 60s, only for keys named in `EMBED_RATE_LIMIT_*` env vars | request path |
| Per-program CSV updates | 1 per N seconds, N from `CSV_UPDATE_RATE_LIMIT_<KEY>` env vars | request path |
| `POST /users/sign_in` | 30 per 60s | submitted email address |
| `PUT /verify_otp` | 12 per 300s | `temporary_identifying_token` |

The interpreter's `Logger` base class retries a `429` after a 6-second debounce.

A separate autoban blocklist (`config/initializers/autoban.rb`) bans IPs that hammer `/users/sign_up`, `/users/recover_password`, or `/users/request_confirmation`; banned requests get `403` with the body `No`. IPs listed in `GT_IP_BLACKLIST` are blocked outright.


1. Program runtime API
----------------------

These are the endpoints a running GuidedTrack program calls from the browser. They are the closest thing this app has to a public API: they are called cross-origin from embedding pages and from the mobile app wrappers, and their shapes are effectively frozen by deployed clients.

All of them authenticate with `X-GuidedTrack-Access-Key` and all of them apply the embedding-page CORS rule.

### `GET /programs/:program_key/embed`

Starts or resumes a run. This is the handshake every embedded program makes first — everything else needs the `run_id` and `access_key` it returns. CSRF is skipped on this action.

- **Query params** — `token` (an embed token from `/programs/:program_key/embed/auth`, optional), `mode` (`test` forces a throwaway test run), `force_new_run` (`"true"` forces a new run instead of resuming).
- **Auth** — session cookie, or the embed token. The token must exist, be ungranted-then-granted, unused, and belong to this program.
- **200** — JSON: `{run_id, access_key, csv_info, build_version, program_build_version, url, authenticity_token, retrievable_by_cookie}`. `retrievable_by_cookie` reports whether the request carried a `Cookie` header, which the client uses to decide whether it needs the embed-token dance.
- **200 `{}`** — the program has `collect_user_data` disabled; the program runs fully client-side.
- **401** — `text/plain` body `embed token invalid` (bad/used/session-less token), or empty body (token not yet granted), or empty body (anonymous user may not run this program).
- **403** — empty body; the token belongs to a different program, or the signed-in user may not run this program.
- **500** — empty body; any unhandled exception, logged server-side.

### `GET /programs/:program_key/embed/auth`

Browser-navigable page used to establish a first-party session for an embedded program when third-party cookies are blocked. Sets `X-Frame-Options` to nothing so it can render in an iframe. Redirects back to the embedding page with an embed token, or renders a layout-less interstitial that forces a session cookie to exist.

- **Query params** — `source` (the embedding page URL to redirect back to).

### `GET /programs/:program_key/embed/:token/complete`

Completes an embed request after the user signs in. Requires a signed-in user; redirects anonymous callers to the program's sign-in page. Redirects to the embed request's stored `redirect_url`.

### `GET /programs/:program_key/build` and `GET /runs/:id/contents`

Fetch the compiled bytecode the interpreter executes. `/build` takes the program key and is CORS-scoped to embedding pages; `/runs/:id/contents` takes a run and sends `Access-Control-Allow-Origin: *`.

- **200** — JSON: the build contents (compiled program tree).
- **202** — JSON: `{"job": <delayed_job id>}`. The build is stale and recompiling. Poll `GET /delayed_jobs/:id` until it reports `finished`, then re-request.
- **401 / 403** — empty body, when the user may not run the program (`/build` only).

### `GET /programs/:program_key/build_info`

- **200** — JSON: `{version, created_at, updated_at}` for the program's current build.

### `PUT /runs/:id/sync`

Bulk-writes program data documents to the CouchDB-backed document store. The main data path.

- **Headers** — `X-GuidedTrack-Access-Key` (required), `X-GuidedTrack-Client-ID` (recorded on success).
- **Body** — form-encoded, `docs=<JSON array of documents>`. Each document must belong to this run.
- **200** — JSON: `{"docs": <array of per-document results from the document store>, "client_id": <the run's recorded client id>}`. Individual entries in `docs` may carry an `"error"` key; when any do, the client id is *not* updated.
- **200, empty** — `docs` was blank; the request is a no-op (`head :ok`).
- **401** — empty body; at least one submitted document doesn't belong to this run.
- **403** — `{"error": "Data collection is disabled for this program"}`.
- **429** — `Retry later` (2 requests per second per run).
- **503** — `text/plain`, the document-store error message.

### `POST /runs/:id/revs`

Asks the document store for the current revision of a set of documents, so the client can detect conflicts before syncing.

- **Body** — form-encoded, `keys[]=<document id>` (repeated).
- **200** — JSON: `{"docs": <bulk revision lookup result>}`.
- **503** — empty body, on document-store failure.

### `GET /runs/:id/context`

Returns the run's saved interpreter context (the variable scope and position needed to resume). `Cache-Control: no-store`.

- **200** — JSON: the context document.
- **404** — empty body; no context has been saved yet.

### `GET /runs/:id/status`

Lightweight liveness/consistency probe. `Cache-Control: no-store`.

- **200** — JSON: `{"client_id": <run's client id>, "context": {"_id": ..., "_rev": ...}}`. `context` is `{}` when no context document exists.

### `POST /runs/:id/update_csv_data` and `POST /programs/:program_key/runs/:id/update_csv_row`

The same action under two paths (`update_csv_row` is an alias). Writes the run's flat CSV row — the tabular projection used by data exports. The program-key-scoped path is what current clients call.

- **Body** — form-encoded: `csv_data` (the row) and `rev` (the client's believed revision).
- **200** — JSON: `{"rev": <new revision integer>}`.
- **409** — empty body; `rev` didn't match the server's revision. The client is expected to re-fetch `GET /runs/:id/csv_revision` and retry.
- **403** — `{"error": "Data collection is disabled for this program"}`.
- **429** — `Retry later`.

### `GET /runs/:id/csv_revision`

- **200** — JSON: `{"rev": <current revision integer>}`.

### `GET /runs/:id/user`

- **200** — JSON: `{"user": <the run's user's gt_id, or null>}`.
- **205** — empty body, when `:id` doesn't parse as a nonzero integer.

### `POST /run_event/write`

Records interpreter events (page views, answers, control flow). **Note: this action currently only logs the payload to the Rails log — the database write is commented out.** It still updates the run's user when the user signed in mid-run.

- **Body** — form-encoded: `run_id` and `events` (a JSON array of `{category, node_id, type, text, value, sequence, url, timestamp, points}` objects; `timestamp` is milliseconds since epoch).
- **200** — empty body.
- **202** — `text/plain`: `Won't save events as there is no valid X-GuidedTrack-Access-Key.` Note this is a success status, not an error.
- **403** — `{"error": "Data collection is disabled for this program"}`.
- **429** — `Retry later` (keyed on path + `run_id`).

### `POST /programs/:program_key/services/:name`

The `*service` language construct. Proxies a call through a `Service` configured on the program, but only if the compiled build's service metadata whitelists a matching method+path.

- **Body** — JSON, `Content-Type: application/json`: `{"path": ..., "method": ..., "send": ...}`.
- **200 (or whatever the upstream returned)** — JSON: `{"response": <upstream response body>}`. The upstream service's status code is passed through.
- **403** — `{"response": "<METHOD> <path> not allowed on service \"<name>\""}`.
- **404** — `{"source": "guidedtrack", "description": "..."}` when the program key or the named service doesn't exist.

### `GET` / `POST /programs/:program_key/runs/:run_id/data/email`

The `*database` email-consent flow. `GET` reads the run user's account details; `POST` verifies the user typed their own email before granting the program access to it.

- **GET 200** — `{email, created, confirmed}`.
- **GET 403** — `{"error": "user's consent required", "program_name": ..., "email_hint": "j___n@e______.c__"}`. The hint masks all but the first and last character of each word.
- **POST body** — JSON: `{"consent_challenge": "<email the user typed>"}`.
- **POST 200** — `{email, created, confirmed}`; the program is added to the user's `programs_with_email_access`.
- **POST 401** — `{"error": "submitted email does not match"}`.
- **POST 400** — `{"error": "no email submitted"}` or `{"error": "run does not exist"}`.
- **401** — `{"error": "user not logged in"}` when the run has no associated user.
- **400** — `{"error": "program does not exist"}`.

### `POST /programs/:program_key/experiments`

Assigns the run to an experiment arm, creating the experiment record on first call.

- **Body** — form-encoded: `node_id` (identifies the experiment in the program), `choices` (the candidate arms).
- **200** — JSON: `{"group": <the assigned arm>}`.

### `POST /scheduled_emails`

The `*email` construct. Schedules a (possibly recurring) email via Delayed::Job.

- **Body** — form-encoded: `program_key`, `run_id`, and a nested `email` hash: `email[subject]`, `email[body]`, `email[identifier]`, `email[when]`, `email[until]`, `email[to]` (defaults to the signed-in user's address), and `email[every][days|hours|minutes]` for recurrence.
- **200** — JSON: `{"<identifier>": "<the email's gt_id>"}`.
- **403** — JSON: ActiveModel error messages keyed by attribute, e.g. `{"subject": ["can't be blank"]}`.

### `GET /scheduled_emails/cancel/:identifier`

Cancels the signed-in user's scheduled emails with that identifier by setting `until` to now. Silently does nothing when nobody is signed in.

- **Query params** — `program_key`.
- **200** — empty body, always.

### `GET /scheduled_emails/unsubscribe/:gt_id`

Unsubscribes from one reminder by its `gt_id`. Reachable as `.json` from the interpreter or as HTML from an email link.

- **200 (HTML)** — a confirmation page.
- **200 (JSON)** — `{"success": "You've unsubscribed from this reminder"}`.

### `POST /captcha/verify`

Verifies a reCAPTCHA token against Google, using the program's own secret key if configured or the global one otherwise. CSRF is skipped.

- **Body** — form-encoded: `program_key`, `token`.
- **200** — empty body, verification passed.
- **422** — empty body, verification failed.

### `POST /programs/:program_key/images`

Uploads an image for use in a program. Requires **edit** access to the program (not just run access).

- **Body** — `multipart/form-data`, field `file`.
- **200** — JSON: `{"url": "<the stored image URL>"}`.
- **400** — JSON: `{"message": "<upload error>"}`.

### `GET /delayed_jobs/:id`

Polls a background job. `Access-Control-Allow-Origin: *`.

- **200** — JSON, one of `{"status": "finished"}` (the job row is gone), `{"status": "running"}`, or `{"status": "error", "message": "<first line of last_error>"}`.

### `GET /runs/:id/run_menu`

- **200 (HTML partial)** — the run menu fragment, when the program shows a reset link or a user is signed in.
- **200, empty** — otherwise.

### `POST /runs/:id/toggle_mode`

Flips a run between test and normal mode. Requires **edit** access to the program.

- **200** — `text/plain`: `OK`.

### `GET /programs/:program_key/rerun`

Redirects back into a program for a fresh run. Validates the redirect target against the program's own URL prefix and its registered embedding pages.

- **Query params** — `_redirect`.
- **302** — to `_redirect`.
- **400** — empty body, when `_redirect` is missing, unparseable, or points somewhere untrusted.


2. Program authoring and the editor
-----------------------------------

Session-authenticated. The React editor in `editor/` calls the JSON ones; the rest serve HTML.

| Method | Path | Action | Response |
|---|---|---|---|
| GET | `/programs` | `programs#index` | HTML list, or JSON array of accessible programs |
| GET | `/programs/new` | `programs#new` | HTML |
| GET | `/programs/new_from_template` | `programs#new_from_template` | HTML, or JSON of a blank program |
| POST | `/programs` | `programs#create` | see below |
| GET | `/programs/:id` | `programs#show` | renders the editor as HTML/JS, or JSON of the program |
| GET | `/programs/:id/edit` | `programs#edit` | HTML/JS editor; redirects to `show` without edit rights |
| PATCH/PUT | `/programs/:id` | `programs#update` | see below |
| DELETE | `/programs/:id` | `programs#destroy` | 302 to `/programs`, or `204` for JSON |
| GET | `/programs/jump` | `programs#jump` | 302 to the editor for the program named by `program_name`, at `line_number` |
| POST | `/programs/create_with_ai` | `programs#create_with_ai` | see below |
| POST | `/programs/code` | `programs#code` | JSON, see below |
| POST | `/programs/compile` | `programs#compile` | JSON bytecode, see below |
| GET/POST | `/programs/:id/duplicate` | `programs#duplicate` | 302 (HTML) or a JS redirect snippet |
| PUT | `/programs/:id/generate_zip` | `programs#generate_zip` | `text/plain`, the Delayed::Job id |
| GET | `/programs/:id/download` | `programs#download` | 302 to a 5-second presigned S3 URL |
| GET | `/programs/:id/questions` | `programs#questions` | HTML, paginated 100/page, filtered by `query` |
| GET | `/programs/:id/summary` | `programs#summary` | HTML run-summary page |
| GET | `/programs/:id/answers/:question_node_id` | `programs#answers` | HTML, paginated 20/page |
| GET | `/programs/:id/answer_preview/:question_node_id` | `programs#answers_preview` | HTML partial (a visualization fragment) |
| GET | `/programs/:program_key/publish` | `programs#publish` | HTML |
| GET | `/programs/:program_key/debug` | `programs#debug` | HTML/JS, mode `offline` |
| GET | `/programs/:program_key/preview` | `programs#preview` | HTML/JS |
| GET | `/programs/:program_key/test` | `programs#test` | HTML, bare layout |
| GET | `/programs/:program_key/run` | `programs#run` | HTML, bare layout, iframe-able |
| GET | `/programs/:program_key/present` | `programs#present` | HTML, bare layout, iframe-able, mode `offline` |
| GET | `/programs/:program_key/app_selection` | `programs#app_selection` | HTML, or 302 to the main page / run URL |
| GET | `/programs/:program_key/recruit` | `programs#recruit` | HTML |
| GET | `/programs/:program_key/start_recruitment` | `programs#start_recruitment` | 302 to Positly |
| GET | `/programs/:program_key/start_analysis` | `programs#start_analysis` | 302 to Hypothesize |
| POST | `/programs/:program_key/appify_request` | `programs#appify_request` | 302, sends an internal notification email |

### Create, update, and AI generation

`POST /programs`, `PATCH /programs/:id`, and `POST /programs/create_with_ai` all kick off a background compile and return the same envelope.

- **Body** — form-encoded: `program[name]`, `program[description]`, `contents` (the source code), and optionally `template_id`. `create_with_ai` uses `program[name]` and `program[description]` as the prompt.
- **201** — JSON: `{job_id, run_path, program_path, debug_program_url, edit_program_url}`. Poll `GET /delayed_jobs/:job_id` for completion.
- **200** — JSON: ActiveModel errors, e.g. `{"name": ["can't be blank"]}`. **This is a 200, not a 422** — clients must check for the presence of `job_id` rather than relying on the status code.
- **400** — JSON: `{"explanation": "Program too long.", "resolution": "Please make it shorter than 325000 characters/about N lines."}` when `contents` exceeds `MAX_PROGRAM_CONTENTS_LENGTH` (325,000).

### `POST /programs/code`

Loads a program's source into the editor, looked up **by name rather than by key or id**.

- **Body** — form-encoded: `program_name`.
- **200** — JSON: `{code, path, readOnly, key}`. `readOnly` is true for anonymous users and users without edit rights.
- **400** — empty body, `program_name` blank.
- **404** — empty body, no program with that name.
- **403** — empty body, the program doesn't allow public read access and the caller can't read it.

### `POST /programs/compile`

Compiles source to bytecode without saving it — the editor's live syntax check.

- **Body** — form-encoded: `program_name`, `contents`.
- **200** — JSON: the generated bytecode (or the compiler's error structure).
- **403** — empty body, caller lacks edit rights.
- **400** — the "Program too long" envelope described above.

### Versions

Nested under the program key. All require **edit** access.

| Method | Path | Response |
|---|---|---|
| GET | `/programs/:program_key/versions` | HTML, the program's code history |
| GET | `/programs/:program_key/versions/live` | HTML partial of the current code |
| GET | `/programs/:program_key/versions/:id` | HTML partial of that PaperTrail version |
| PATCH/PUT | `/programs/:program_key/versions/:id` | Reverts to that version, recompiles in the background, 302 back to the versions list (carrying `time_zone`) |

### Runs list

| Method | Path | Response |
|---|---|---|
| GET | `/programs/:program_id/runs` | HTML table, or JSON array of runs. Paginated by `page`; filtered by `date_filter_type` (`any_time`, `last_24h`, `last_7d`, `last_30d`, `custom_range`), `date_filter_start_date`, `date_filter_end_date`. Renders a "locked" page instead when the billing account is under sanctions. |
| GET | `/programs/:program_id/runs/:id` | HTML, or JSON of the run. Events paginated 500/page. |
| GET | `/programs/:program_id/runs/:id/first` \| `last` \| `previous` \| `next` | 302 to the neighbouring run; honours `?tab=answers` |
| GET | `/runs/:id/answers` | HTML, answers paginated 500/page |

All require **edit** access to the program.

### Pages (embedding-URL whitelist)

JSON-only. Requires edit access to the program. This is the list `Program#has_page?` checks when deciding whether to send CORS headers.

| Method | Path | Response |
|---|---|---|
| GET | `/programs/:program_id/pages` | `200` `{"pages": [...]}` |
| POST | `/programs/:program_id/pages` | `200` `{"page": {...}}`, or `400` empty. Body: `page[url]`. The first page created becomes `main`. |
| PATCH/PUT | `/programs/:program_id/pages/:id` | `200` `{"page": {...}}`, or `400` empty |
| DELETE | `/programs/:program_id/pages/:id` | `200` empty |

The `new`, `show`, and `edit` routes that `resources :pages` generates have no corresponding actions or templates and will error.


3. Program settings
-------------------

All under `/programs/:program_id/settings/…`, all session-authenticated, all requiring **edit** access. The `GET`s render HTML settings pages; the `PUT`s save.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `…/branding` | — | HTML |
| PATCH | `…/update_branding` | `program_settings[public_name, email_display_name, email_reply_to_address, logo_url, powered_by_button_enabled]` | 302, or re-renders `branding` on failure |
| GET | `…/access` | — | HTML |
| PUT | `…/access_mode` | `access_mode` | `200` empty |
| GET | `…/login` | — | HTML |
| PUT | `…/login_mode` | `login_mode` | `200` empty |
| PUT | `…/reset_link_mode` | `reset_link_mode` | `200` empty |
| GET | `…/versioning` | — | HTML |
| PUT | `…/versioning_mode` | `versioning_mode` | `200` empty |
| GET | `…/appearance` | — | HTML |
| PUT | `…/high_contrast_mode` | `high_contrast_mode` | `200` empty |
| GET | `…/privacy` | — | HTML |
| PUT | `…/collect_user_data` | `collect_user_data` | `200` empty |
| GET | `…/collaborators` | — | HTML |
| GET | `…/services` | — | HTML |
| GET | `…/run_menu` | — | HTML |
| GET | `…/about` | — | HTML |
| GET | `…/sso` | — | HTML |
| PUT | `…/sso_service_provider_config` | `sso_service_provider_config[cert, private_key, digest_method, signature_method, sign_authentication_requests]` | 302, or `400` re-rendering the SSO page |
| GET | `…/recaptcha` | — | HTML |
| PUT | `…/recaptcha` | `recaptcha[site_key, secret_key]` | 302. Blank values are dropped, so you cannot clear a key this way. |
| GET | `…/mobile_apps` | — | HTML; renders a request form, an in-progress page, or the settings depending on `mobile_app_status` |
| PUT | `…/mobile_apps` | `ios_store_url`, `android_store_url` | 302, or `422` re-rendering the form |
| GET | `…/purchases` | — | HTML |
| PUT | `…/purchases` | `app_secret`, `package_name`, `braintree[merchant_id, public_key, private_key]` | 302 |
| GET | `…/social_apps` | — | HTML |
| PUT | `…/facebook` | `facebook[app_id, app_secret]` | 302, or `422` |
| PUT | `…/google` | `google[app_id, app_secret]` | 302, or `422` |
| PUT | `…/apple` | `apple[app_id, app_secret]` | 302, or `422` |

### Collaborators

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/programs/:program_id/backstage_passes` | `emails` (comma- or newline-separated), `privilege` (`editor` \| `reader`) | 302 to the collaborators page |
| POST | `/programs/:program_id/backstage_passes/:id/toggle_collaborator_privilege` | — | 302; flips editor ↔ reader |
| DELETE | `/programs/:id/delete_collaborators` | `collaborators[]` (backstage pass ids) | 302 |

### Program-level services

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/programs/:program_id/services/new` | — | HTML form |
| POST | `/programs/:program_id/services` | `service[name, url, username, password]`, `service[headers_attributes][][key\|value\|id\|_destroy]` | 302, or `422` re-rendering the form. **Blank values are stripped before save.** |
| GET | `/programs/:program_id/services/:id/edit` | — | HTML form |
| PATCH/PUT | `/programs/:program_id/services/:id` | as above | 302, or `422` |
| DELETE | `/programs/:program_id/services/:id` | — | 302 |
| POST | `/programs/:program_id/services/create_from_custom_service` | `custom_service_id` | 302; wires a custom service up as a program service |

### SAML identity providers

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/programs/:program_id/identity_providers/new` | — | HTML |
| POST | `/programs/:program_id/identity_providers` | `identity_provider[name, entity_id, cert, email_attr_name, sso_service_url, require_signed_assertions]` | 302, or `400` re-rendering the form |
| GET | `/programs/:program_id/identity_providers/:id/edit` | — | HTML |
| PATCH/PUT | `/programs/:program_id/identity_providers/:id` | as above | 302, or `400` |
| DELETE | `/programs/:program_id/identity_providers/:id` | — | 302 |

### Google Play connection

| Method | Path | Notes |
|---|---|---|
| GET | `/programs/:program_key/connect/google` | OAuth callback. Exchanges `code` for Google Play access/refresh tokens, stores them on the program's Google app, 302 to the purchases settings page with a flash. |
| POST | `/programs/:program_key/disconnect/google` | Clears the stored tokens, 302. |


4. Data export
--------------

`Programs::ExportsController` streams exports with `ActionController::Live`.

### `GET /programs/:id/exports`

- **Auth** — either **edit** access via session, or a valid `?token=`. When a token is used the response also gets `Access-Control-Allow-Origin: <hypothesize_api_url>` and the token is burned.
- **Query params** — `export_format` (`csv`, default, or `sav`), `token`, plus the `date_filter_*` params listed above. Column selection comes from the session (see below), not the query string.
- **200** — streamed. `Content-Type: text/csv; charset=utf-8; header=present` or `application/x-spss-sav`; `Content-Disposition: attachment; filename=<program-name-parameterized>.<ext>`; `Last-Modified` set to now.
- **400** — `text/plain` `Streaming is not supported over HTTP/1.0`, or `Unsupported download format`.
- **404** — `{"error": "invalid token"}`, or `text/plain` `Error. The following columns don't exist:` followed by a URL-escaped, newline-separated column list.
- **401** — `{"error": "token has expired"}`.
- **410** — `{"error": "token has been used already"}`.

A stream that fails mid-flight is logged and the connection closed — the client sees a truncated file with a `200` status. There is no in-band error signal once streaming has begun.

### `GET /programs/:id/exports/columns`

- **200** — `text/plain`: every available column name, URL-escaped, one per line.

### `POST /programs/:id/exports/excluded_columns`

Stores the exclusion list in the session, which the next export reads.

- **Body** — `columns` (a JSON array, as a string).
- **200** — empty body.
- **400** — empty body, `columns` wasn't valid JSON.

### `POST /programs/:id/exports/excluded_columns/clear`

- **302** — back to the referer, or the program's runs page.


5. Custom services (integrations)
---------------------------------

Deployed serverless routes, owned by a user rather than a program. Creating one requires a Pro plan or higher. All session-authenticated and gated by `authorize! :manage`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/custom_services` | — | HTML, or JSON array |
| GET | `/custom_services/new` | — | HTML |
| POST | `/custom_services` | `custom_service[name]` | 302 to the service's tables page, or 302 back with an alert. Below Pro, 302 with an upgrade prompt. |
| GET | `/custom_services/:id` | — | HTML |
| GET | `/custom_services/:id/edit` | — | HTML |
| PATCH/PUT | `/custom_services/:id` | `custom_service[name]` | 302 |
| DELETE | `/custom_services/:id` | — | 302, or `204` for JSON |

### Routes within a custom service

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/custom_services/:custom_service_id/routes` | — | HTML |
| GET | `/custom_services/:custom_service_id/routes/new` | — | HTML |
| POST | `/custom_services/:custom_service_id/routes` | `custom_service_route[method, path]` | 302 to the new route, or back with an alert |
| GET | `/custom_services/:custom_service_id/routes/:id` | — | HTML |
| PATCH/PUT | `/custom_services/:custom_service_id/routes/:id` | `custom_service_route[handler_code]` | Renders `update` (no redirect) |
| DELETE | `/custom_services/:custom_service_id/routes/:id` | — | 302 |
| GET | `/custom_services/:custom_service_id/routes/:id/use` | — | HTML listing the caller's editable programs |
| POST | `/custom_services/:custom_service_id/routes/:id/connect` | `program_name` | Attaches the service to that program, 302 to its editor with a notice. Unknown name → 302 back to the "use" page. |

### Environment variables on a route

All return 302 with a flash.

| Method | Path | Body |
|---|---|---|
| GET | `/custom_services/:custom_service_id/routes/:route_id/environment_variables` | — |
| GET | `…/environment_variables/new` | — |
| POST | `…/environment_variables` | `environment_variable[name, value]` |
| GET | `…/environment_variables/:id/edit` | — |
| PATCH/PUT | `…/environment_variables/:id` | `environment_variable[name, value]` |
| DELETE | `…/environment_variables/:id` | — |

System-type variables are hidden from the index. Every write triggers a redeploy of the route's config.

### Tables

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/custom_services/:custom_service_id/tables` | — | HTML (renders the `show` template for the first table) |
| GET | `/custom_services/:custom_service_id/tables/:id` | — | HTML for that table |
| POST | `/custom_services/:custom_service_id/tables` | `table[name]`, `table[actions][]` | `201` `{"job_id": <id>}`; poll `GET /delayed_jobs/:job_id`. `400` with ActiveModel errors for an invalid name, or `{"message": "Please select at least one action"}` for an empty action list. |


6. Purchases, subscriptions, and billing
----------------------------------------

Purchases are program-scoped and platform-specific (`web`, `ios`, `android`). Subscriptions exist both globally and per program. Billing is the GuidedTrack account's own Stripe plan.

Purchase endpoints authenticate by session **or**, when the request comes from a registered embedding page, by `X-GuidedTrack-Access-Key` — the run's user is signed in for the duration of the request. Every purchase error is rendered as `{"code": <status>, "message": "...", ...extra}` with that status.

Common failures: `400` `program does not exist`; `403` `program is not configured for purchases`; `401` `user not signed in`; `400` `invalid credentials`; `404` `no purchase found`.

| Method | Path | Body / params | Response |
|---|---|---|---|
| POST | `/programs/:program_key/purchases` | `platform`, `receipt`, `purchase_action` | `200`/upstream status with the validated receipt JSON; `409` empty on a duplicate receipt; `500` `{"server_error": "..."}` |
| GET | `/programs/:program_key/purchases/:platform/status` | — | `200` with the purchase status object |
| GET | `/programs/:program_key/purchases/token` | — | `200` `{"token": "<Braintree client token>"}` |
| GET | `/purchases/token` | — | same, for the global (non-program) strategy |
| GET | `/programs/:program_key/subscriptions` | — | HTML (bare layout) listing subscription options |
| POST | `/programs/:program_key/subscriptions` | strategy-specific | `200` with the created subscription JSON |
| PATCH/PUT | `/programs/:program_key/subscriptions/:id` | strategy-specific | `200` empty |
| DELETE | `/programs/:program_key/subscriptions/:id` | — | `200` empty |
| GET/POST/DELETE | `/subscriptions`, `/subscriptions/:id` | — | the same actions without a program scope |

`SubscriptionsController` passes `params.to_unsafe_h` straight to the payment strategy — there is no strong-parameter filter on these bodies.

### Billing

Session-authenticated; anonymous callers are redirected to sign in and returned to `/billing`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/billing` | — | HTML plan/usage page |
| PUT | `/billing` | `billing_plan` | 302 to Stripe checkout, or back with a flash |
| GET | `/billing/manage` | — | 302 to the Stripe customer portal |
| GET | `/billing/:checkout_session_id/complete` | — | Links the Stripe customer to the account, 302 to `/billing` |
| POST | `/billing/notice/dismiss` | — | Dismisses the plan notice. **No template exists for this action**, so it will raise unless called with a format Rails can answer with a head. |


7. Accounts and authentication
------------------------------

Devise, with `database_authenticatable`, `confirmable`, `invitable`, `lockable`, `recoverable`, `registerable`, `saml_authenticatable`, `trackable`, `validatable`, and `omniauthable` (Facebook, Google). `devise_for :users` generates the standard route set at `/users/…`; run `rails routes` for the exact list, since it varies with the installed Devise and `devise_saml_authenticatable` versions.

On top of those, `config/routes.rb` declares program-scoped variants so a user can sign in "into" a specific program and be redirected to its main page afterward. The `programs/:program_key` prefix is optional in every one of these.

| Method | Path | Action |
|---|---|---|
| GET | `(programs/:program_key/)users/sign_in(/:subscription)` | Sign-in form. Iframe-able. `?return_to=` is stored for post-login redirect; `?optional=true` marks an optional login. |
| POST | `(programs/:program_key/)users/sign_in` | Sign in. With 2FA enabled and no trusted-device cookie, 302 to `/second_factor` instead. Throttled to 30/min per email. |
| DELETE | `(programs/:program_key/)users/sign_out` | Sign out. CORS-enabled for embedded programs. |
| POST | `/refuse` | Records that the user declined an optional login for `program_key`; 302 back. |
| GET | `(programs/:program_key/)users/sign_up(/:subscription)` | Registration form. Iframe-able. |
| POST | `(programs/:program_key/)users/sign_up` | Register. Body: `user[email, name, password, password_confirmation, phone_number]`. CORS-enabled. Responds JSON when asked. **A non-blank `user[name]` marks the registration as a bot** — it is a honeypot field. |
| GET | `(programs/:program_key/)users/password_recovery` | "Forgot password" form |
| POST | `(programs/:program_key/)users/recover_password` | Sends reset instructions |
| GET | `(programs/:program_key/)token/:reset_password_token/users/edit_password` | Reset form; redirects away if the token is missing |
| PUT | `(programs/:program_key/)passwords/update` | Sets the new password |
| GET | `(programs/:program_key/)users/confirmation/new` | Resend-confirmation form |
| POST | `(programs/:program_key/)users/request_confirmation` | Resends confirmation |
| GET | `(programs/:program_key/)token/:confirmation_token/users/confirm_account` | Confirms the account |

### Two-factor authentication

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/second_factor` | `temporary_identifying_token` | OTP entry page; the token expires in 5 minutes |
| PUT | `/verify_otp` | `otp_code`, `temporary_identifying_token`, `trust_device` | 302 on success (setting a 30-day encrypted httponly device cookie when `trust_device` is set); 302 back with an alert otherwise. Throttled to 12 per 5 min per token. |
| GET | `/account_recovery` | `temporary_identifying_token` | Recovery-code entry page |
| PUT | `/restore_account` | `recovery_code`, `temporary_identifying_token` | Disables 2FA and signs in, or 302 back with an alert |
| GET | `/account_recovery_request` | — | Manual-recovery request form |
| GET | `/account_recovery_request_submission` | form fields | Emails the GuidedTrack team, 302 with a notice |
| GET | `/account/mfa/intro` | — | Generates an OTP secret and recovery code, renders the intro |
| GET | `/account/mfa/qr_code` | — | QR code page |
| GET | `/account/mfa/recovery_code` | — | Recovery code page |
| PUT | `/account/mfa/enable` | `otp_code`, `phone_number` | 302 with a notice, or back to the QR page on a bad code |
| PUT | `/account/mfa/disable` | `otp_code` | 302 with a notice |

### SAML SSO

| Method | Path | Notes |
|---|---|---|
| GET | `/programs/:program_key/users/saml/start` | Initiates the SAML flow; stores the post-login redirect |
| POST | `/programs/:program_key/users/saml/auth` | Assertion consumer service |
| GET | `/programs/:program_key/users/saml/metadata` | Service-provider metadata XML |

An unknown `program_key` on any of these redirects to the generic sign-in page. A SAML auth failure also redirects there (`GuidedtrackFailureApp`).

### OAuth / social sign-in

Devise's omniauth routes at `/users/auth/facebook`, `/users/auth/google_oauth2`, and their `/callback` counterparts. `omniauth.params[:program_key]` carries the program a user is signing into. On failure the user is bounced to the sign-in page with one of two messages: the email is already in use, or the social account isn't registered.

Plus one non-Devise route:

**`POST /users/auth/:provider/register`** — completes registration for a social account the interpreter authenticated client-side. CORS-enabled for embedding pages.

- **Body** — `program_key`, `email`, `token`, `code`, `password`, `user_id`.
- **200** — JSON: `{"return_to": "<stored post-login URL>"}`.
- **422** — JSON: `{"errors": {...}}`.

**`POST /programs/:program_key/users/auth/apple/token`** — receives Apple's `form_post` response and renders a bare page that hands the decoded identity token back to the app.

- **Body** — `id_token`, `code`, or `error`.
- **200** — HTML containing `{user_id, email, token, code}` as JSON.
- **400** — empty body, when `id_token` or `code` is missing.
- **302** — to the program's Apple-token URL with `error=user_cancelled_authorize` or `error=auth_error`.

**`GET /users/logged_in`** — session probe for embedded programs. CORS-enabled.

- **200** — empty body, signed in.
- **401** — empty body, not signed in.

### The user's own account

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/account` | — | HTML; lists programs the user has run |
| GET | `/account/edit` | — | HTML |
| PATCH/PUT | `/account` | `user[name, phone_number]` | 302 with a notice |
| DELETE | `/account` | — | Queues account deletion and signs the user out |
| DELETE | `/account/program/:program_key` | — | Revokes the program's access to the user's email and queues deletion of the user's runs in that program; 302 to `/account` |
| PUT | `/users/utm` | any of `Utm::ATTRS` | `204` empty. Requires sign-in. |


8. Admin
--------

Restricted to users with the `admin` or `support` role; everyone else is redirected to `/` with "You are not authorized to access this page".

| Method | Path | Body | Response | Who |
|---|---|---|---|---|
| GET | `/users` | `query`, `page` | HTML user search | admin or support |
| PATCH/PUT | `/users/:id` | `role` | 302 to `/users` | admin only |
| PUT | `/users/:id/confirm` | — | Confirms the account, 302 with a notice | admin or support |
| POST | `/users/:id/confirmation_link` | — | `text/plain`, a fresh confirmation URL | admin or support |
| POST | `/users/:id/password_reset_link` | — | `text/plain`, a fresh reset URL; `401` empty if the caller can't manage that user | any user who can `:manage` the target |

Devise invitations (`/users/invitation/…`) are also admin-facing: after an invitee accepts, their program list is bootstrapped from any backstage passes matching their email.


9. Tutorials and marketing pages
--------------------------------

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Redirects signed-in users to `/programs`; otherwise serves `public/landing.html` |
| GET | `/demo` | Runs the "GuidedTrack Onboarding Flow" program in offline mode |
| GET | `/pricing` | Static pricing page |
| GET | `/templates` | Template gallery |
| GET | `/templates/:id` | One template |
| GET | `/subscribed` | Post-checkout landing page; links the Stripe customer when `checkout_session_id` is present. Requires sign-in. |
| GET | `/contact/index` | Contact page |
| GET | `/tutorials` | Tutorial index |
| GET | `/tutorial/intro` | Creates/opens the "Editing text" tutorial program |
| GET | `/tutorial/images` | Creates/opens the "Images and other content" tutorial program |
| GET | `/tutorials/finish` | Marks the tutorial complete, renders a page |
| GET | `/tutorials/skip` | Marks it complete, 302 to `/programs/new` |
| GET | `/tutorials/graduate` | Creates the user's first real program and 302s to its editor |


10. Webhooks
------------

### `POST /appsumo/events`

AppSumo license lifecycle webhook. CSRF is skipped.

- **Headers** — `x-appsumo-signature` (HMAC of `x-appsumo-timestamp` + raw body, keyed by `GT_APPSUMO_API_KEY`), `x-appsumo-timestamp`.
- **Body** — `license_key`, `prev_license_key`, `event` (`purchase` | `activate` | `deactivate` | `upgrade` | `downgrade`), `event_timestamp`, `created_at`, `license_status`, `tier`, `test`, `extra[reason]`.
- **200** — `{"success": true}`. A truthy `test` field short-circuits all side effects but still returns success.
- **401** — `{"success": false}` on signature mismatch.

### `GET /appsumo/oauth`

AppSumo OAuth return leg.

- **Query params** — `code`.
- **302** — to the post-sign-in path when the license already has a user, or to `/users/sign_up?appsumo=true` to claim it, or to the AppSumo products page when no license data comes back.
- **200** — empty body, when `code` is absent.


11. Dead and suspicious routes
------------------------------

Found while writing this document. None of these are documented behaviour; they are listed so nobody wastes time on them.

- **`resources :scripts`** (`config/routes.rb:183`) — generates seven routes to `ScriptsController`, which does not exist. There is a `Script` model but no controller and no views. Every one of these routes raises.
- **`GET /programs/:id/contents`** (`config/routes.rb:68`) — `ProgramsController` has no `contents` action and there is no `app/views/programs/contents.*` template.
- **`get "exports?token=:token&format=csv"`** (`config/routes.rb:73`) — a route pattern containing a literal query string. Rails matches on the path only, so this cannot behave as written; the plain `exports` route already handles `?token=`. Named `pre_signed_exports_path`.
- **`resources :runs`** top-level (`config/routes.rb:98`) — the collection actions (`GET /runs`, `POST /runs`, `GET /runs/new`) reach `RunsController` without a program, which `#index` requires. Only the `member` routes on this block are actually used.
- **`Programs::ExportsController`** exempts a `show_sav` action from authorization that doesn't exist; the SAV export is served by `show` with `export_format=sav`.
- **`billing#dismissed_notice`** has no template.
- **`POST /run_event/write`** accepts and validates its payload but the persistence is commented out (`app/controllers/run_event_controller.rb:10-24`); events are only written to the Rails log.
