# DRP-UI — API Integration Reference

**Purpose:** a map of how this app talks to the backend today, every endpoint currently wired,
which screens still run on hardcoded data, and the exact recipe for adding a new endpoint.
Use the table in [§8](#8-worksheet-for-the-new-api-list) to slot in the API list you want integrated.

Repo: `DRP-UI` (Create React App 5, React 19, MUI 6, react-router 6, axios, AWS Amplify Auth)
Reviewed at commit `d3368e1` — *api integration in tgkx*.

---

## 1. Architecture at a glance

```
src/index.js
  └─ imports src/components/Amplifyconfig.jsx   ← configures Cognito once, at boot
       │
src/App.js  (createBrowserRouter — all routes)
       │
components/*  ──uses──▶  src/services/researchApi.js   ← typed endpoint functions (currently unused)
       │                       │
       └────────uses──────────▶ src/services/apiClient.js   ← the single axios instance
                                   │  request  interceptor: attach Cognito Bearer token
                                   │  response interceptor: normalise errors to err.userMessage
                                   ▼
                              src/apiconfig.js  ← base URL resolution
                                   ▼
                    https://uk1ip13n80.execute-api.us-east-1.amazonaws.com
```

There are **three** files that define the integration layer. Everything new should go through them:

| File | Responsibility |
|---|---|
| [src/apiconfig.js](src/apiconfig.js) | Base URL + port constants |
| [src/services/apiClient.js](src/services/apiClient.js) | The axios instance, auth header, error shaping |
| [src/services/researchApi.js](src/services/researchApi.js) | One named function per endpoint |

A dev proxy also exists at [src/setupProxy.js](src/setupProxy.js) (`/api/*` → API Gateway, strips the
`/api` prefix), but **nothing currently uses it** because `apiClient` is built with an absolute
`baseURL`. See [§7](#7-known-issues-fix-before-bulk-integration).

---

## 2. Configuration

### Environment variables

Declared in [.env](.env) (⚠️ **this file is committed to git** — see [§7](#7-known-issues-fix-before-bulk-integration)):

| Variable | Value in `.env` | Read by |
|---|---|---|
| `REACT_APP_COGNITO_REGION` | `YOUR_AWS_REGION` *(placeholder, never read)* | — |
| `REACT_APP_COGNITO_USER_POOL_ID` | `us-east-1_AYZb6Pkib` | [Amplifyconfig.jsx:3](src/components/Amplifyconfig.jsx#L3) |
| `REACT_APP_COGNITO_APP_CLIENT_ID` | `4amqg86j1fpf6fcp7cuph1cg8q` | [Amplifyconfig.jsx:4](src/components/Amplifyconfig.jsx#L4) |
| `REACT_APP_COGNITO_DOMAIN` | `us-east-1ayzb6pkib.auth.us-east-1.amazoncognito.com` | [Amplifyconfig.jsx:14](src/components/Amplifyconfig.jsx#L14) |
| `REACT_APP_REDIRECT_SIGN_IN` | `http://localhost:3000/login` | [Amplifyconfig.jsx:16](src/components/Amplifyconfig.jsx#L16) |
| `REACT_APP_REDIRECT_SIGN_OUT` | `http://localhost:3000/login` | [Amplifyconfig.jsx:17](src/components/Amplifyconfig.jsx#L17) |
| `REACT_APP_API_URL` | `https://uk1ip13n80.execute-api.us-east-1.amazonaws.com` | [apiconfig.js:9](src/apiconfig.js#L9) → `API_CONFIG.API_BASE_URL` |
| `REACT_APP_API_BASE_URL` | **not set** | [apiconfig.js:2](src/apiconfig.js#L2) → `API_CONFIG.BASE_URL` |

### Base URL resolution

[src/apiconfig.js](src/apiconfig.js) exports two similarly-named keys that resolve differently:

```js
BASE_URL     = REACT_APP_API_BASE_URL || '<hardcoded API Gateway URL>'   // ← what apiClient uses
API_BASE_URL = REACT_APP_API_URL || REACT_APP_API_BASE_URL || '<same hardcoded URL>'
```

Because `REACT_APP_API_BASE_URL` is not defined, **`apiClient` currently runs on the hardcoded
fallback URL**, not on the `.env` value. It works only because both strings are identical today —
changing `.env` alone will not move the app to a different backend.

`PORT1`–`PORT5` (`8080`, `8081`, `5030`, `5040`, `5000`) are declared in `apiconfig.js` and never read.
They look like leftovers from a pre-API-Gateway local setup.

**CRA note:** env vars are inlined at build time. Any change to `.env` requires restarting `npm start`.

---

## 3. Authentication

Cognito user pool auth via `@aws-amplify/auth` v6.

- **Configuration:** [Amplifyconfig.jsx](src/components/Amplifyconfig.jsx) calls `Amplify.configure()`
  at import time from [index.js:4](src/index.js#L4). Guarded — if the pool id or client id is missing,
  it silently skips configuration and every auth call will fail.
- **Sign-in:** [Login.js](src/components/Login/Login.js) uses `signIn` / `confirmSignIn` /
  `getCurrentUser` / `signOut` directly. It handles the `NEW_PASSWORD_REQUIRED` challenge and
  defensively clears a stale session before signing in again.
- **Token attachment:** [apiClient.js:12-34](src/services/apiClient.js#L12-L34)

  ```js
  const { tokens } = await fetchAuthSession();
  token = tokens?.idToken?.toString();
  // fallback chain:
  token ||= window.localStorage.getItem("drp.apiToken") || API_CONFIG.ACCESS_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  ```

  This sends the **ID token**, matching the Postman collection (`AuthenticationResult.IdToken`). The
  API Gateway JWT authorizer validates `aud` against the Cognito app client and **only ID tokens
  carry `aud`** — an access token is rejected, so this must not be changed back.

  The fallback chain is dead code: `drp.apiToken` is read here and written nowhere in `src/`, and
  `API_CONFIG.ACCESS_TOKEN` is never defined in `apiconfig.js`. Amplify is the only working token
  source.
- **No route guards.** `App.js` has no protected-route wrapper; `/dashboard/*` renders whether or not
  a session exists. Unauthenticated users hit 401s from the API rather than a redirect.
- **No 401 handling.** The response interceptor shapes the message but does not redirect to `/login`
  or attempt a refresh.

---

## 4. Request / response conventions

### Calling convention

```js
import apiClient from "../../services/apiClient";

const res = await apiClient.get("/projects", { params });
```

`Content-Type: application/json` is set on the instance; `Authorization` is added per request.

### Response envelope

The backend returns responses in two shapes, and the code handles both by unwrapping:

```js
// researchApi.js:3
const unwrap = (response) => response.data?.data ?? response.data;
```

`TXKGPhase` repeats the same logic inline ([TXKGPhase.jsx:90](src/components/workflow/TXKG/TXKGPhase.jsx#L90)).
`ProjectsPage` does **not** unwrap — it reads `res.data.items` directly, so the projects endpoint is
assumed to return `{ items, totalCount, totalPages }` un-enveloped.

**Any new endpoint function should go through `unwrap`** unless the backend is known to differ.

### Error shape

[apiClient.js:36-48](src/services/apiClient.js#L36-L48) attaches a human-readable `userMessage` to
every rejected error:

| Situation | `err.userMessage` |
|---|---|
| Backend sent `{ message }` | that message |
| HTTP error, no message | `Backend request failed (<status>).` |
| Network failure / no response | `Unable to reach the backend.` |

Consumers should render `err.userMessage` and fall back to `err.message`:

```js
setError(err.userMessage || err.message || "Failed to fetch projects");
```

### Debug logging

`apiClient.js` has four `console.log` calls (`"4::"`, `"14::"`, `"18::"`) that print the **full Cognito
token set and access token** to the browser console on every request. Remove before any shared or
production deploy.

---

## 5. Endpoints currently in the codebase

### 5a. Declared in `researchApi.js` — **none are called by any component**

The whole module is currently dead code; nothing imports it. These are the endpoint contracts
already agreed with the backend, ready to be wired up.

| # | Method | Path | Function | Intended screen |
|---|---|---|---|---|
| 1 | GET | `/modules` | `getModules()` | Module picker / sidebar |
| 2 | GET | `/users/me` | `getCurrentUser()` | Profile, header avatar |
| 3 | GET | `/users/me/onboarding-status` | `getOnboardingStatus()` | Post-login routing (splash → welcome vs dashboard) |
| 4 | GET | `/users/me/research-focus` | `getResearchFocus()` | WelcomeScreen |
| 5 | POST | `/users/me/onboarding/complete` | `completeOnboarding(payload)` | WelcomeScreen submit |
| 6 | GET | `/therapeutic-areas` | `getTherapeuticAreas()` | WelcomeScreen specialties, New Project disease list |
| 7 | GET | `/dashboard/summary` | `getDashboardSummary()` | HomePage stat tiles |
| 8 | GET | `/dashboard/quick-actions` | `getQuickActions()` | HomePage action cards |

> ⚠️ `getCurrentUser` is exported from **both** `researchApi.js` and `@aws-amplify/auth`.
> `Login.js` imports the Amplify one. Name collisions here are easy to make — consider renaming the
> API one to `getUserProfile`.

### 5b. Called directly via `apiClient` in components (bypassing `researchApi.js`)

| # | Method | Path | Called from | Notes |
|---|---|---|---|---|
| 9 | GET | `/projects` | [ProjectsPage.jsx:935](src/components/Projects/ProjectsPage.jsx#L935) | Params: `search`, `module`, `status`, `sortBy`, `page`. Expects `{ items, totalCount, totalPages }` |
| 10 | POST | `/projects` | [ProjectsPage.jsx:1000](src/components/Projects/ProjectsPage.jsx#L1000) | Body: `{ name, disease, module, status, description? }` |
| 11 | GET | `/agents/litminex/targets/custom` | [TXKGPhase.jsx:89](src/components/workflow/TXKG/TXKGPhase.jsx#L89) | Fired when `workflowPhase === 'target-selection'` |
| 12 | POST | `/agents/litminex/targets/custom` | [TXKGPhase.jsx:105](src/components/workflow/TXKG/TXKGPhase.jsx#L105) | Body: `{ targetName }`, then re-fetches #11 |

Endpoint #11 returns a loosely-typed list; `normalizeTargetList`
([TXKGPhase.jsx:60-85](src/components/workflow/TXKG/TXKGPhase.jsx#L60-L85)) accepts strings or objects
and probes `name`/`target`/`value`/`label`/`id`/`uniprot` in order. Worth tightening once the backend
contract is fixed.

**That is the entire live API surface: 4 calls across 2 components.** Everything else on screen is
static data.

---

## 6. Screen → data source map

This is the plug-in map. Each row is a place a new endpoint would land.

| Route | Component | Data today | Source of truth |
|---|---|---|---|
| `/login` | [Login.js](src/components/Login/Login.js) | **Live** — Cognito | Amplify |
| `/splash` | [SplashScreen.jsx](src/components/SplashScreen.jsx) | Static — `ORBITS` animation, timed redirect | — |
| `/welcome` | [WelcomeScreen.jsx](src/components/WelcomeScreen.jsx) | **Hardcoded** — `SPECIALTIES:25`, `INITIAL_SEARCH_TAGS:57` | → endpoints #4, #5, #6 |
| `/dashboard` | [HomePage.jsx](src/components/HomePage/HomePage.jsx) | **Hardcoded** — `MOCK_PROJECTS:28`, `RECENT_SESSIONS:36` | → endpoints #7, #8, #9 |
| `/dashboard/recent-sessions` | [RecentSessionsPage.jsx](src/components/RecentSessions/RecentSessionsPage.jsx) | **Hardcoded** — `SESSIONS:90`, `MODULE_TAGS:69` | → needs a sessions endpoint |
| `/dashboard/active-projects` | [ProjectsPage.jsx](src/components/Projects/ProjectsPage.jsx) | **Live** (#9, #10), but `ALL_PROJECTS:64` still seeds the disease dropdown | partially wired |
| `/dashboard/active-projects/:projectId` | [ProjectDetails.jsx](src/components/ProjectDetails/ProjectDetails.jsx) | **Hardcoded** | → needs `GET /projects/:id` |
| `/dashboard/new-research` | [NewResearchPage.jsx](src/components/NewResearch/NewResearchPage.jsx) | **Hardcoded** — `MOCK_PROJECTS:33` | → endpoint #9 |
| `/dashboard/new-research/workflow` | [CompleteWorkflow.jsx](src/components/NewResearch/CompleteWorkflow.jsx) | **Hardcoded + `setTimeout` fakes** — see below | → the agent endpoints |

Also in the tree but not routed: [BranchWorkflowPage.jsx](src/components/NewResearch/BranchWorkflowPage.jsx),
[CompleteWorkflowPage.jsx](src/components/NewResearch/CompleteWorkflowPage.jsx),
[WorkflowStylesIntegration.jsx](src/components/NewResearch/WorkflowStylesIntegration.jsx),
[LineagePage.jsx](src/components/NewResearch/LineagePage.jsx),
[ArtifactsPage.jsx](src/components/NewResearch/ArtifactsPage.jsx),
[DashBoard.js](src/components/DashBoard/DashBoard.js) (`/dashboard-old`).
Confirm which of these are live before wiring them.

### The five-agent workflow

`WORKFLOW_STEPS` ([CompleteWorkflow.jsx:39](src/components/NewResearch/CompleteWorkflow.jsx#L39)):
`01 TxKG → 02 LitMineX → 03 CurateX → 04 ScreenSuite → 05 NovSearch`.

Progression is driven by a `workflowPhase` string in a single `useEffect`
([CompleteWorkflow.jsx:99-149](src/components/NewResearch/CompleteWorkflow.jsx#L99-L149)) where each
"agent run" is a `setTimeout` that then sets hardcoded results. **These timers are the exact insertion
points for the real agent APIs.**

| Phase | Fake delay | Sets | Replace with |
|---|---|---|---|
| `txkg-loading` | 2500 ms | → `txkg-results`; targets from `mockTargets:152` | TxKG target-prediction call |
| `litminex-loading` | 2500 ms | 8 hardcoded articles (`:107-118`) | LitMineX literature-mining call |
| `curatex-loading` | 2000 ms | → `curatex-profile` | — |
| `curatex-submitted` | 2000 ms | 6 hardcoded compounds (`:137-145`) | CurateX compound-matching call (takes `profileData:79-89`) |
| `screensuite-loading` | 8000 ms | → `screensuite-results` | ScreenSuite docking call |
| *(NovSearch)* | 2500 ms ([NoveltySearchPhase.jsx:1207](src/components/workflow/NoveltySearch/NoveltySearchPhase.jsx#L1207)) | → `summary` | NovSearch patent call |

Per-agent phase components under [src/components/workflow/](src/components/workflow/) hold their own
static fixtures:

| Agent | Component | Hardcoded fixtures |
|---|---|---|
| TxKG | [TXKGPhase.jsx](src/components/workflow/TXKG/TXKGPhase.jsx) | `MOCK_TARGETS` (from [workflowConstants.js:12](src/components/workflow/workflowConstants.js#L12)) — **only component with live calls** |
| LitMineX | [LiteminexPhase.jsx](src/components/workflow/Liteminex/LiteminexPhase.jsx) | — |
| CurateX | [CuratexPhase.jsx](src/components/workflow/Curatex/CuratexPhase.jsx) | `MATCH_DETAILS:42` |
| ScreenSuite | [ScreeningSuitePhase.jsx](src/components/workflow/ScreeningSuite/ScreeningSuitePhase.jsx) | `dockingResults:9`, `residueInteractions:57`, `hydrogenBonds:130`, `recommendations:183` |
| NovSearch | [NoveltySearchPhase.jsx](src/components/workflow/NoveltySearch/NoveltySearchPhase.jsx) | `patents:11`, `comparisonPatents:64` |

Note the naming inconsistency: the UI step is labelled **LitMineX**, but the two live endpoints use
`/agents/litminex/...` while sitting inside **TXKGPhase**. Worth confirming with the backend which
agent actually owns custom targets.

### Other static data

- [ProjectsContext.js](src/context/ProjectsContext.js) — a 5-project in-memory store with
  `addProject`. Client-side only; nothing persists. Once `POST /projects` works end to end this
  context should be deleted or backed by the API.
- [ShareModal.jsx:5](src/components/ShareModal/ShareModal.jsx#L5) `people` and the `sharePeople`
  state in [CompleteWorkflow.jsx:72-76](src/components/NewResearch/CompleteWorkflow.jsx#L72-L76) —
  collaborator lists. → needs share/collaborator endpoints.
- [NewProjectModal.js:10](src/components/NewProjectModal.js#L10) `DISEASES` → endpoint #6.
- [ProjectsPage.jsx:1054](src/components/Projects/ProjectsPage.jsx#L1054) and
  [:1101](src/components/Projects/ProjectsPage.jsx#L1101) — explicit
  `Connect your API/update logic here` markers for project **status change** and **row actions**.
  → needs `PATCH /projects/:id`.

---

## 7. Known issues (fix before bulk integration)

Ordered by how much they will cost you during the integration work.

1. **`BASE_URL` reads an env var that isn't set.** `apiClient` uses
   `API_CONFIG.BASE_URL`, which reads `REACT_APP_API_BASE_URL`; `.env` only defines
   `REACT_APP_API_URL`. Today the hardcoded fallback happens to match, so it is invisible — but
   pointing the app at staging/prod by editing `.env` will silently do nothing.
   → collapse to one variable and one key.

2. **`.env` is committed to git** and contains real Cognito pool/client ids and the API Gateway URL.
   `.gitignore` covers `.env.local` and friends but not `.env`. These aren't secrets in the strict
   sense (client ids are public by design in a SPA) but they pin the repo to one environment.
   → gitignore `.env`, commit a `.env.example`, keep real values out of the tree.

3. **Tokens are logged to the console.** [apiClient.js:6,17,19](src/services/apiClient.js#L6-L19) —
   `console.log("14::", tokens)` prints the whole token set on every request.

4. **`researchApi.js` is entirely unused.** Eight endpoint functions, zero call sites. Either wire
   them up ([§6](#6-screen--data-source-map) says where) or the module will drift from the backend.

5. **Two call styles coexist.** `ProjectsPage` and `TXKGPhase` call `apiClient` directly with inline
   paths; `researchApi.js` wraps them as named functions. Pick one — the named-function layer — or
   endpoints will keep getting duplicated as string literals.

6. **Create-project doesn't refresh the list.**
   [handleCreateProject](src/components/Projects/ProjectsPage.jsx#L983-L1012) calls `setPage(1)` to
   trigger a refetch, but when the user is already on page 1 the state doesn't change and the effect
   never re-runs. → use an explicit `refreshKey` counter in the dependency array.

7. **The dev proxy is dead.** [setupProxy.js](src/setupProxy.js) maps `/api/*` → API Gateway, but
   `apiClient` uses an absolute `baseURL` so requests never go through it. Either set
   `baseURL: "/api"` in development (and get CORS-free local dev) or delete the proxy.

8. **No 401 handling and no protected routes.** An expired session produces a wall of failed
   requests on the dashboard rather than a redirect to `/login`.

9. **Unused config.** `PORT1`–`PORT5` and `API_CONFIG.API_BASE_URL` are never read;
   `API_CONFIG.ACCESS_TOKEN` is read but never defined.

---

## 8. Worksheet for the new API list

Fill one row per endpoint from your list, then work top to bottom.

| # | Method | Path | Request (params / body) | Response shape | Target screen | Replaces | Status |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

For each row, the integration is four steps:

**Step 1 — add the endpoint function** to [src/services/researchApi.js](src/services/researchApi.js):

```js
export const getProjectDetails = async (projectId) =>
  unwrap(await apiClient.get(`/projects/${projectId}`));

export const updateProjectStatus = async (projectId, status) =>
  unwrap(await apiClient.patch(`/projects/${projectId}`, { status }));
```

Then add it to the default-export object at the bottom of the file.

**Step 2 — replace the fixture** in the component. Keep the fixture's field names as the contract;
if the backend differs, normalise in the service layer, not in JSX.

**Step 3 — wire the call** with the loading/error/cleanup pattern already established in
[ProjectsPage.jsx:919-955](src/components/Projects/ProjectsPage.jsx#L919-L955):

```js
useEffect(() => {
  let mounted = true;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectDetails(projectId);
      if (!mounted) return;
      setProject(data);
    } catch (err) {
      if (!mounted) return;
      setError(err.userMessage || err.message || "Failed to load project");
    } finally {
      if (mounted) setLoading(false);
    }
  };

  load();
  return () => { mounted = false; };
}, [projectId]);
```

The `mounted` flag matters — React 19 StrictMode double-invokes effects in development
([index.js:10](src/index.js#L10)), so without it you will see duplicate requests and
set-state-after-unmount races.

**Step 4 — render the three states.** Most screens currently render only the success state because
the data was always there synchronously. Each newly wired screen needs a loading indicator and an
error branch showing `err.userMessage`.

### For the workflow agents specifically

Replace the `setTimeout` in the `workflowPhase` effect
([CompleteWorkflow.jsx:99-149](src/components/NewResearch/CompleteWorkflow.jsx#L99-L149)) with the
real call, keeping the phase-string state machine:

```js
if (workflowPhase === "litminex-loading") {
  let mounted = true;
  runLitMineX({ targets: selectedTargets, query })
    .then((results) => {
      if (!mounted) return;
      setLitMinexResults(results);
      setWorkflowPhase("litminex-results");
    })
    .catch((err) => {
      if (!mounted) return;
      setWorkflowError(err.userMessage || err.message);
      setWorkflowPhase("litminex-error");   // new phase — needs a UI branch
    });
  return () => { mounted = false; };
}
```

Two things to settle with the backend before writing these:

- **Are agent runs synchronous or job-based?** The 8-second ScreenSuite placeholder suggests real runs
  are long. If the backend returns a job id, this needs a polling or SSE/WebSocket layer that does not
  exist anywhere in the repo yet — that is a larger piece of work than the CRUD endpoints.
- **Every phase needs an error state.** The current state machine has `-loading` and `-results`
  phases only; there is no path for a failed agent run.
