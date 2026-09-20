# iReNovo UI Review — Status Against the 28 Points

**Date:** 2026-09-20
**Source:** `iReNovo_UI_Review_points.pdf` (points 1–28; point 29 is blank)
**Branch:** `main`

---

## Summary

| Outcome | Points | Count |
|---|---|---|
| Fixed and verified | 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28 | **23** |
| Backend defect — cannot be fixed in the UI | 12, 15, 25, 26 | **4** |
| Blocked on a product decision | 4 | **1** |

Of the 23 fixed, **12 were changed in this round** and **11 were already fixed** in commit
`8f5ad1d` ("Bug fixed raised By Bhadra", 2026-09-18) and have been re-verified line by line.

**How this was verified:** by code inspection plus a clean production build (`react-scripts build`,
exit 0). It has **not** been re-tested end to end against the live backend. Points 17–28 in
particular touch live API responses and need a QA pass on a deployed build before they are
signed off.

---

## Fixed in this round

| # | Point | What changed | File |
|---|---|---|---|
| 1 | Description copy | Hero text is now "An agentic AI platform to discover and validate existing drugs for new therapeutic indications" | `src/components/Login/Login.js` |
| 2 | Three tabs below description | Now AI-Powered Analysis / *Gen AI powered Reasoning*, Real-time Insights, Biomedical Knowledge. "10k+ Compounds" removed | `src/components/Login/Login.js` |
| 3 | Copyright symbol | The © line was already commented out; the dead code is now deleted | `src/components/Login/Login.js` |
| 5 | Splash screen | Only "Preparing your research workspace..." remains. Brand title, "AI DRUG DISCOVERY PLATFORM", the progress bar, the percentage and the thinking dots are gone | `src/components/SplashScreen.jsx` |
| 6 | Priya should be dynamic | Six remaining hardcoded sites now read the signed-in user from `GET /users/me`: welcome greeting, sidebar footer, old dashboard sidebar, share modal owner, workflow share list, NovSearch final summary | `WelcomeScreen.jsx`, `SideBar.jsx`, `DashBoard.js`, `ShareModal.jsx`, `CompleteWorkflow.jsx`, `Researchstepheader.jsx`, `NoveltySearchPhase.jsx` |
| 7 | Research assistant line | Trimmed to "Your Gen AI powered research assistant." | `src/components/WelcomeScreen.jsx` |
| 8 | Step 1 | "Identify therapeutic areas of focus for your research". The three tag pills were removed | `src/components/WelcomeScreen.jsx` |
| 9 | Step 2 | Retitled "Complete the Workflow" with the approved sentence and the five tags: Target ID, Literature, Repurposing hit, Docking, Novelty search | `src/components/WelcomeScreen.jsx` |
| 10 | Quick Start | Heading is now "Select Therapeutic **Areas** of Interest", **and the picker now actually saves** — see the note below | `src/components/WelcomeScreen.jsx` |
| 11 | AI RESEARCH COWORKER | Now "AI RESEARCH ASSISTANT" on both the home page and the new-research page | `HomePage.jsx`, `NewResearchPage.jsx` |
| 13 | "AI-powered target recommendations and Q&A" | Already absent from the live TxKG insights panel; the remaining copy in the legacy branch page was removed | `BranchWorkflowPage.jsx` |
| 20 | Wrong disease name | The LitMineX request bubble was already fixed. The NovSearch decision and final-summary screens still said "Type 2 Diabetes" — they now use the disease from the report | `NoveltySearchPhase.jsx` |

### Note on point 10

The review asked to "keep or remove based on api working". The picker was **pure local state** —
"Save Focus & Get Started" called an optional callback nobody passed and navigated away, so the
selection was never written anywhere. `saveResearchFocus()` existed in the API layer but was
never called.

It is now wired to the real endpoints:

- `GET /users/me/research-focus` on mount, to pre-select what was saved before
- `POST /users/me/research-focus` on save, with a saving state and a visible error if it fails

**Recommendation: keep the screen.** It now does something. This still needs a yes/no from the
product owner, and the endpoints need a QA pass against the deployed backend.

---

## Already fixed in commit `8f5ad1d` — re-verified

| # | Point | Where it lives now |
|---|---|---|
| 14 | Breadcrumb showed "Type 2 Diabetes" for every disease, and read "TxKG Query" | `CompleteWorkflow.jsx` — the crumb is built from `txkgResult.disease` and the module label, so the trailing "Query" is gone |
| 16 | Uniform module names | `src/workflow/moduleMap.js` — `agentHeadingFor()` is the single source. All five screens use it: TxKG — Target Identification Agent, LitMineX — Literature Mining Agent, CurateX — Drug Curation Agent, ScreenSuite — Virtual Screening Agent, NovSearch — Novelty Search Agent |
| 17 | TxKG sources not linked | `src/workflow/sourceLinks.js` — the Sources tab links each named database (CTD, MedGen, IntAct, Reactome, KEGG, UniProt, …). A label matching nothing stays unlinked rather than guessing a URL |
| 18 | TxKG subgraph static | `src/components/workflow/SubgraphView.jsx` — the graph is generated via `POST /agents/subgraph/generate` and polled, replacing the hand-drawn SVG |
| 19 | TxKG metapaths | `TXKGPhase.jsx` — the left-hand target prediction score column was removed; only the meta-paths render |
| 21 | "View on PubMed Central" dead | `CompleteWorkflow.jsx` — a real anchor built from the article record |
| 22 | Save article / chat with article dead | `CompleteWorkflow.jsx` — both buttons had no `onClick` at all; they are wired to the article endpoints |
| 23 | Select button per article | `CompleteWorkflow.jsx` — checkboxes were `checked={idx === 0} readOnly`, which is exactly why only the first row looked selected. Selection is now real state |
| 24 | No way forward from LitMineX | `CompleteWorkflow.jsx` — a "Continue to CurateX" control that sends a structured `selections` payload instead of relying on free text |
| 27 | Completed tick without running the module | `CompleteWorkflow.jsx` — was `visited && !isActive`; a tick now requires the step to have actually completed, and a failed step renders in red |
| 28 | BRANCH / RERUN / EXPORT dead | `src/components/workflow/PhaseActions.jsx` — ten copies across five screens, none with a handler. Now one component wired to the branch, rerun and export endpoints. A handler that is genuinely unavailable disables its button and says why on hover |

**These need QA re-testing on a deployed build** — they depend on live API responses, which this
round could not exercise.

---

## Backend defects — not fixable in the UI

### Point 12 — "Propagating over the full knowledge graph from Colic..."

This string does not exist anywhere in the frontend. It is a progress message generated by the
TxKG runner. "Colic" looks like a truncated or mis-resolved disease term.

**Needed from the backend team:** what generates this line, and what "Colic" refers to when the
submitted disease was something else.

### Point 15 — Score is more than 100

The API returns raw scores above 100 (176.6 is in the current sample data). The UI only formats
them to two decimals — it does not compute them.

**Deliberately not clamped in the UI.** Capping the display at 100 would hide a real scoring-scale
problem and make the numbers silently wrong instead of visibly wrong.

**Needed from the backend team:** confirm the intended scale. If it is meant to be 0–100, the
normalisation is wrong upstream. If the scale is unbounded, the UI should stop implying a
percentage and we will relabel the column.

### Points 25 and 26 — "@curatex create drug profile for JAK2" → RunnerError

`RunnerError: No reviewed human UniProt entry matched 'Create drug profile for JAK2'.`

The backend takes the **whole sentence** as the target name instead of extracting the gene symbol.

- **UI workaround already shipped** (point 24): the "Continue to CurateX" button sends a
  structured `selections` payload, which cannot produce this error.
- **Still broken:** typing the instruction as free text. That path depends on backend parsing.

**Needed from the backend team:** extract the gene symbol from the instruction, or return a
usable error naming what it expected.

---

## Needs a decision before it can be built

### Point 4 — Signup, forgot password, Help Center, Privacy Policy, Terms of Service

All four controls are on the login screen **and all four currently do nothing**:

- `handleForgotPassword()` is an empty function with a commented-out `navigate("/forgot-password")`
- "Help Center", "Privacy Policy" and "Terms of Service" are buttons with no `onClick` at all

There is no signup screen in the codebase at all.

This was left unchanged because it is a product decision, not a bug fix. **Both answers are more
work:**

| Decision | Work involved |
|---|---|
| **Remove** | Delete the four controls from the login footer and the remember/forgot row. Small change |
| **Keep** | Build a forgot-password flow (Cognito `resetPassword` / `confirmResetPassword` — Amplify supports it), plus routes and content for Help Center, Privacy Policy and Terms of Service |

**Please confirm which, and if keeping, who supplies the Privacy Policy and Terms copy.**

Leaving them visible and dead is the one option that should not ship — a tester will raise this
again every round.

---

## Other things worth flagging

1. **Dead code.** `BranchWorkflowPage.jsx`, `CompleteWorkflowPage.jsx`, `WorkflowStylesIntegration.jsx`
   and `Layout/WorkflowLayout.jsx` are not imported by any route. They still contain the old
   hardcoded "Type 2 Diabetes" / "JAK2 Query" breadcrumbs and demo content. If a tester is
   reaching those screens, the route table needs checking; otherwise they should be deleted so
   they stop showing up in searches and confusing this kind of review.

2. **`.env` is committed.** It carries the live Cognito user pool ID and app client ID.
   `.gitignore` only covers `.env.local` variants. Worth moving to environment configuration.

3. **Point 29 is blank** in the source PDF — nothing to action.

---

## Recommended next step

A QA pass on a deployed build covering points 17–28, since those depend on live API responses
that could not be exercised from a local build.
