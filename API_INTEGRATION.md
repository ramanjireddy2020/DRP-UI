# DRP-UI — API Integration Reference

**Purpose:** how this app talks to the InnoDD API, what is wired, what is only
half-wired, and where to add the rest. Cross-checked against
*InnoDD API · Frontend (API Gateway)* (Postman).

Repo: `DRP-UI` (CRA 5, React 19, MUI 6, react-router 6, axios, AWS Amplify Auth)

---

## 1. Two things that will break everything if changed

Both are load-bearing and both are easy to "fix" wrongly.

**Gateway paths carry no `/v1`.** Routes are `/modules`, `/sessions`, `/agents/...`.
`drp-poc-lambda` appends `/v1` itself when it calls the app. Adding `/v1` here
yields 404s. See [apiconfig.js](src/apiconfig.js).

**Send the Cognito ID token, never the access token.** The API Gateway JWT
authorizer validates `aud`, and only ID tokens carry it. An access token is
rejected with `{"message":"Unauthorized"}`.
See [apiClient.js:20](src/services/apiClient.js#L20).

Telling the two 401s apart:

| Body | Source | Meaning |
|---|---|---|
| `{"message":"Unauthorized"}` | API Gateway | token missing, expired, or the wrong kind |
| `{"detail":"Not authenticated"}` | the app itself | got past the gateway, rejected downstream |

---

## 2. Architecture

```
src/apiconfig.js                REACT_APP_API_URL, no fallback (throws if unset)
src/services/apiClient.js       the one axios instance
                                  request:  attach Cognito ID token
                                  response: 401 → signOut + /login;
                                            shape err.userMessage
src/services/unwrap.js          accepts { data: … } or a bare payload

src/services/api/*.js           one module per collection folder
src/hooks/*.js                  polling, session state, per-phase results
src/workflow/*.js              API shape → UI shape
src/components/workflow/*       the five phase screens
```

### Service modules

| File | Collection folder | What it covers |
|---|---|---|
| [api/sessions.js](src/services/api/sessions.js) | 3, 4 | supervisor, steps, messages, rerun, artifacts, drafts, list/patch/delete |
| [api/jobs.js](src/services/api/jobs.js) | 3 | job status + result, terminal-status vocabulary |
| [api/modules.js](src/services/api/modules.js) | 2 | catalog and `@` search |
| [api/txkg.js](src/services/api/txkg.js) | 5 | targets, target detail, insight tabs, subgraph |
| [api/litminex.js](src/services/api/litminex.js) | 6 | articles, insights, preview, custom targets, article detail/chat |
| [api/curatex.js](src/services/api/curatex.js) | 7 | target profile, compound scoring, results |
| [api/screensuite.js](src/services/api/screensuite.js) | 8 | docking, hits, **unavailability flag** |
| [api/novsearch.js](src/services/api/novsearch.js) | 9 | assess, report, patent Q&A |
| [researchApi.js](src/services/researchApi.js) | 1, 2 | onboarding + dashboard — **declared, no call sites** |

### Hooks

- **[useJob.js](src/hooks/useJob.js)** — polls `/agents/jobs/{id}/status` on a
  recursive `setTimeout` with 1.5× backoff (1s → 5s, 5 min ceiling), then reads
  the result. Exposes `progressMessage` and `jobModule`.
- **[useWorkflowSession.js](src/hooks/useWorkflowSession.js)** — per-module
  state, supervisor-driven activation, `handOff`, `sendMessage`,
  `rerunActiveStep`, `resumeSession`.
- **[usePhaseResults.js](src/hooks/usePhaseResults.js)** — reads one phase's
  own results endpoint. Keyed by `kind`, not module, because CurateX has two
  result sets behind two jobs.

---

## 3. The flow that matters: chat → supervisor → module

This is the whole point of the app and it is now entirely backend-driven.

```
Composer Send (HomePage / NewResearchPage)
   → navigate with { query, module?, projectId? }
      → POST /sessions                                  ← supervisor picks the module
         → parseSupervisorModule(response)              ← UI never assumes TxKG
            → ACTIVATE_MODULE(key, loadingPhase, jobId)
               → GET /agents/jobs/{jobId}/status  (poll, show progressMessage)
                  → completed → that module's results endpoint
                     → researcher picks rows
                        → POST /sessions/{id}/steps     ← hand-off, back to poll
```

### The chat bar does not route

`POST /sessions/{id}/messages` returns `{ role, agentName, content, stepId, jobId }`.
`jobId` is the only thing that matters for routing:

- **`jobId === null`** — the LLM answered from the step's stored result. Render
  the content. Nothing else happens.
- **`jobId !== null`** — an explicit `@Module` started a new agent run. Adopt the
  job and activate whichever module the response names.

There is deliberately **no keyword matching**. The previous implementation
jumped to NovSearch on the word "patent" and to CurateX on "target candidate
profile", which put the researcher on screens the backend knew nothing about.
Because an `@mention` is now the only way to start a run from chat,
[ChatInputBar](src/components/workflow/ChatInputBar.jsx) has an `@` autocomplete
over `GET /modules/search` that inserts the API's own `key` spelling.

### Hand-offs must translate accessions to gene symbols

The collection is explicit: *send gene names (JAK2), not UniProt accessions —
PubMed text never contains O60674.*

The TxKG table is keyed on accessions (that is the column the user sees, and
`/agents/txkg/targets/{uniprotId}` takes one), so `selectedTargets` holds
accessions and [selections.js](src/workflow/selections.js) translates at the
hand-off boundary. `normalizeTarget` sets `geneName` **only** when the API
supplied one — `name` falls back to the long protein name, and sending
"Tyrosine-protein kinase JAK2" as a target id returns nothing.

Unresolvable selections are still sent (dropping a target the user ticked is
worse) but a warning is appended to the thread.

### Job status vocabulary

`completed` / `failed`, confirmed by the collection's example and its own test
script. `TERMINAL_SUCCESS` / `TERMINAL_FAILURE` in
[jobs.js](src/services/api/jobs.js) keep extra spellings so an
unexpected-but-terminal value cannot poll forever.

The failure reason is in **`error`**, not `message` — on a job payload
`message` is the gateway's authorizer envelope, which would report
"Unauthorized" for what is really an agent crash.

---

## 4. Module keys

`moduleMap.js` holds three spellings per module and they are not
interchangeable:

| `key` (internal) | `apiKey` (sent to the API) | `phasePrefix` |
|---|---|---|
| `txkg` | `TxKG` | `txkg` |
| `litminex` | `LitMineX` | `litminex` |
| `curatex` | `CurateX` | `curatex` |
| `screensuite` | `ScreenSuite` | `screensuite` |
| `novsearch` | `NovSearch` | **`novelty`** |
| `pipeline` | `SaaS Pipeline` | `pipeline` |

Three traps:

- **`apiKey` is what `POST /steps` needs.** Sending the lowercase internal key
  makes the supervisor fall through `infer_module()` and re-route by keyword,
  silently ignoring the user's choice.
- **NovSearch's phases are prefixed `novelty`**, not `novsearch`.
- **`SaaS Pipeline` is a real supervisor response.** Without an entry for it,
  `startSession` rejected a valid response as an unrecognised module and the
  run stopped before it started. It is not a rail step — it spans all five — so
  it lives outside `MODULES` and renders through
  [PipelinePhase](src/components/workflow/PipelinePhase.jsx).

`resolveModuleKey` returns **null** rather than defaulting to TxKG. A silently
wrong module is the failure this is built to prevent; an unresolved one surfaces
as a visible error naming the response keys.

---

## 5. Endpoint status

### Wired end to end

| Method | Path | Where |
|---|---|---|
| POST | `/sessions` | `useWorkflowSession.startSession` |
| POST | `/sessions/{id}/steps` | `handOff` — TxKG→LitMineX, CurateX→ScreenSuite |
| POST | `/sessions/{id}/messages` | `sendMessage` — the chat bar |
| POST | `/sessions/{id}/steps/{stepId}/rerun` | `retryActiveStep` |
| GET | `/agents/jobs/{jobId}/status` | `useJob` |
| GET | `/agents/jobs/{jobId}/result` | `useJob`, TxKG + pipeline |
| GET | `/modules/search` | `ChatInputBar` `@` dropdown |
| GET | `/agents/litminex/{jobId}/results` | LitMineX table (paginated) |
| GET | `/agents/litminex/{jobId}/insights` | "Article Relevance" |
| GET/POST | `/agents/litminex/targets/custom` | TxKG target picker |
| GET | `/agents/curatex/{jobId}/profile` | TPP screen |
| POST | `/agents/curatex/compounds` | "Submit Profile" |
| GET | `/agents/curatex/{jobId}/results` | compound table (paginated) |
| GET | `/agents/screensuite/{jobId}/hits` | affinity table |
| GET | `/agents/novsearch/{jobId}/report` | verdict + patent table |
| GET/POST | `/projects` | `ProjectsPage` |

### In the service layer, no call site yet

Ready to use; the screen that needs them is still on hardcoded data.

- `getSession` / `resumeSession` — reopening from RecentSessions
- `listSessions`, `deleteSession`, `patchSession` (rename / End Task), `getArtifacts`
- `saveDraft` / `patchDraft` — composer autosave
- `txkg.getTargets`, `getTargetDetail`, `getInsights` (TxKG reads the generic
  job result; these add the detail drawer and per-tab insights)
- `txkg.generateSubgraph` / `getSubgraph` / `getSubgraphStats` / `exploreNode`
- all `/articles/*` — detail, PMC link, save, chat, chat history
- `novsearch.ask` — the patent Q&A / "Compare" box
- the direct agent entries (`txkg.query`, `litminex.query`,
  `curatex.createTargetProfile`, `screensuite.screen`, `novsearch.assess`) —
  the session path is used instead
- `modules.getModules`, and all eight of `researchApi.js`

### Not implemented

`POST /files/upload`; `/exports` + `/exports/pdf` + download;
`/projects/{id}` GET/PATCH/DELETE, `/items`, `/results`; `/users/me/*`;
`/dashboard/*`; `/therapeutic-areas`.

---

## 6. Known limits of this deployment

**ScreenSuite cannot succeed.** PyMOL and Vina are not installable on
Databricks Apps. `SCREENSUITE_UNAVAILABLE` in
[api/screensuite.js](src/services/api/screensuite.js) is the single flag to
delete when that changes. Its error state is presented as a limitation, not a
fault, and the phase says so *before* the run rather than after.

**`/hits` is ScreenSuite's only results endpoint.** The PLP report, residue
interactions, hydrogen bonds, the 3D pose view and the download bundles have no
endpoint at all. `ExpandedPLPReport`, `ActionButtons` and
`OverallRecommendation` are still in the file but **are not rendered** — they
read fixed residue and affinity tables, and showing invented structural data
beside a real affinity measurement is worse than showing nothing.

**A pipeline run can report `completed` at 4 of 5 stages.** A failing stage does
not stop the job, so the stage list from `/agents/jobs/{id}/result` is the only
honest summary.

**Sessions live in SQLite on `/tmp`** and are lost when the backend restarts, so
a 404 from `GET /sessions/{id}` is expected rather than exceptional;
`resumeSession` says so in its error message.

---

## 7. Adding an endpoint

1. **Add the function** to the right `src/services/api/*.js`, wrapped in
   `unwrap`, with a doc comment naming the collection folder and the response
   shape.
2. **Normalise in the service/workflow layer, not in JSX.** Map the API shape
   onto the field names the component already reads — that is what
   [phaseResults.js](src/workflow/phaseResults.js) and
   [txkgResult.js](src/workflow/txkgResult.js) are for.
3. **Render all three states.** Most screens were written with data present
   synchronously, so they have no loading or error branch. Show
   `err.userMessage`, and give the user a retry.
4. **Do not substitute a fixture on failure.** A screen of plausible fake
   results is worse than an honest failure.

For a new agent phase, follow the CurateX pattern: `POST` to start → `useJob` to
poll → `usePhaseResults` to read. Add the module to `MODULES` in `moduleMap.js`
with its `apiKey`, phase prefix, and `loadingPhase` / `resultsPhase` /
`errorPhase`.

### Verifying a normaliser

`src/workflow/*.js` are plain modules with no React dependency, so they can be
checked against the collection's example payloads directly — copy to `.mjs` and
run under node. Doing this caught the CurateX 0–1 score scale and the
`patentId` vs `id` mismatch before either reached a screen.

---

## 8. Still on hardcoded data

| Route | Component | Needs |
|---|---|---|
| `/welcome` | `WelcomeScreen.jsx` | `/therapeutic-areas`, `/users/me/research-focus`, `/users/me/onboarding/complete` |
| `/dashboard` | `HomePage.jsx` | `/dashboard/summary`, `/dashboard/quick-actions`, `/projects` |
| `/dashboard/recent-sessions` | `RecentSessionsPage.jsx` | `GET /sessions`, `DELETE /sessions/{id}` |
| `/dashboard/active-projects/:id` | `ProjectDetails.jsx` | `/projects/{id}`, `/projects/{id}/items` |
| Artifacts panel | `ArtifactsPage.jsx` | `/sessions/{id}/artifacts`, `/exports` |
| Share dialog | `ShareModal.jsx` | no endpoint exists |

`HomePage`'s project list is keyed by `name` with no `id`, which is why the
composer cannot yet send a real `projectId` — `CompleteWorkflow` already reads
`location.state.projectId` and forwards it, so wiring `GET /projects` into
`HomePage` is all that is missing.

### Pre-existing issues not addressed

- `ShareResearchDialog` in `CompleteWorkflow.jsx` is defined and never rendered
  (`ShareModal` is what mounts). Dead before this work; left alone because
  removing it also means unpicking the `sharePeople` state.
- Several files carry a UTF-8 BOM, which trips `unicode-bom` under `CI=true`.
- `ProjectsPage` create-project calls `setPage(1)` to refetch, which is a no-op
  when already on page 1.
