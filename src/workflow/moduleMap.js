/**
 * The bridge between what the supervisor returns and what the workflow UI shows.
 *
 * The supervisor decides which agent runs — the UI must not assume TxKG. This
 * module is the single place that translates a module name from the API into a
 * step index and a workflowPhase string.
 *
 * The phase vocabulary is deliberately unchanged from the pre-integration
 * component (14 values, same spellings) so the 2,700 lines of render code in
 * CompleteWorkflow.jsx keep working untouched. Note the asymmetry: NovSearch's
 * phases are prefixed "novelty", not "novsearch".
 */

export const MODULES = [
  {
    key: "txkg",
    index: 0,
    label: "TxKG",
    number: "01",
    phasePrefix: "txkg",
    loadingPhase: "txkg-loading",
    resultsPhase: "txkg-results",
  },
  {
    key: "litminex",
    index: 1,
    label: "LitMineX",
    number: "02",
    phasePrefix: "litminex",
    loadingPhase: "litminex-loading",
    resultsPhase: "litminex-results",
  },
  {
    key: "curatex",
    index: 2,
    label: "CurateX",
    number: "03",
    phasePrefix: "curatex",
    loadingPhase: "curatex-loading",
    resultsPhase: "curatex-results",
  },
  {
    key: "screensuite",
    index: 3,
    label: "ScreenSuite",
    number: "04",
    phasePrefix: "screensuite",
    loadingPhase: "screensuite-loading",
    resultsPhase: "screensuite-results",
  },
  {
    key: "novsearch",
    index: 4,
    label: "NovSearch",
    // NOTE: phases use the "novelty" prefix, not "novsearch".
    number: "05",
    phasePrefix: "novelty",
    loadingPhase: "novelty-loading",
    resultsPhase: "novelty-results",
  },
];

export const MODULE_BY_KEY = MODULES.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export const MODULE_BY_INDEX = MODULES.slice().sort((a, b) => a.index - b.index);

/**
 * Every spelling we are willing to accept for a module. The supervisor's exact
 * vocabulary is not documented in the collection, and the backend's own
 * collection uses yet another set of names for the same agents
 * (literature-mining, drug-curation, screening, novelty-search-agent), so this
 * map covers all of them rather than guessing one.
 */
const ALIASES = {
  txkg: "txkg",
  "tx-kg": "txkg",
  "tx_kg": "txkg",
  targetdiscovery: "txkg",
  "target-discovery": "txkg",

  litminex: "litminex",
  "lit-minex": "litminex",
  litmine: "litminex",
  literature: "litminex",
  "literature-mining": "litminex",
  literaturemining: "litminex",

  curatex: "curatex",
  "cura-tex": "curatex",
  curation: "curatex",
  "drug-curation": "curatex",
  drugcuration: "curatex",

  screensuite: "screensuite",
  "screen-suite": "screensuite",
  screening: "screensuite",
  "screening-suite": "screensuite",
  docking: "screensuite",

  novsearch: "novsearch",
  "nov-search": "novsearch",
  novelty: "novsearch",
  "novelty-search": "novsearch",
  noveltysearch: "novsearch",
  "novelty-search-agent": "novsearch",
  patents: "novsearch",
};

/**
 * Normalise any module identifier the API might hand back into a canonical key.
 * Returns null when it cannot be resolved — callers decide the fallback, so an
 * unrecognised module surfaces as a visible problem rather than silently
 * becoming TxKG.
 */
export const resolveModuleKey = (value) => {
  if (value == null) return null;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (ALIASES[raw]) return ALIASES[raw];

  // Try progressively looser forms: strip separators, then substring match.
  const squashed = raw.replace(/[\s_-]+/g, "");
  if (ALIASES[squashed]) return ALIASES[squashed];

  const hit = Object.keys(ALIASES).find((alias) => {
    const a = alias.replace(/[\s_-]+/g, "");
    return a.length >= 4 && squashed.includes(a);
  });

  return hit ? ALIASES[hit] : null;
};

export const getModule = (key) => MODULE_BY_KEY[resolveModuleKey(key)] ?? null;

/**
 * Phases whose names do not carry their module's prefix. Currently only
 * TxKG's target picker — it is spelled "target-selection", not
 * "txkg-target-selection", so a prefix match alone would not find its owner.
 */
const PHASE_OVERRIDES = {
  "target-selection": "txkg",
};

/** Which module owns a given workflowPhase string. */
export const moduleForPhase = (phase) => {
  const p = String(phase ?? "").trim().toLowerCase();
  if (!p) return null;

  if (PHASE_OVERRIDES[p]) return MODULE_BY_KEY[PHASE_OVERRIDES[p]];

  return MODULES.find((m) => p.startsWith(m.phasePrefix)) ?? null;
};

/**
 * Pull the active module out of a supervisor response.
 *
 * The response shape is not documented, so this probes the plausible fields in
 * order of specificity rather than committing to one. Returns null if none
 * match, which the caller reports instead of defaulting.
 */
export const parseSupervisorModule = (session) => {
  if (!session) return null;

  const candidates = [
    session.module,
    session.moduleKey,
    session.module_key,
    session.activeModule,
    session.active_module,
    session.agent,
    session.agentKey,
    session.nextModule,
    session.next_module,
    session.step?.module,
    session.step?.agent,
    session.currentStep?.module,
    session.current_step?.module,
    // A steps array: the last entry is the one the supervisor just created.
    Array.isArray(session.steps) && session.steps.length
      ? session.steps[session.steps.length - 1]?.module
      : null,
    Array.isArray(session.steps) && session.steps.length
      ? session.steps[session.steps.length - 1]?.agent
      : null,
  ];

  for (const candidate of candidates) {
    // A module can arrive as a string or as an object with its own name field.
    const value =
      candidate && typeof candidate === "object"
        ? candidate.key ?? candidate.name ?? candidate.id ?? candidate.label
        : candidate;

    const resolved = resolveModuleKey(value);
    if (resolved) return resolved;
  }

  return null;
};

/** Read whichever field carries the session id. */
export const parseSessionId = (session) =>
  session?.sessionId ?? session?.session_id ?? session?.id ?? null;

/** Read whichever field carries the job id for the step just started. */
export const parseJobId = (session) => {
  if (!session) return null;

  const direct =
    session.jobId ??
    session.job_id ??
    session.step?.jobId ??
    session.step?.job_id ??
    session.currentStep?.jobId ??
    session.current_step?.job_id;

  if (direct) return direct;

  if (Array.isArray(session.steps) && session.steps.length) {
    const last = session.steps[session.steps.length - 1];
    return last?.jobId ?? last?.job_id ?? null;
  }

  return null;
};

/** Read whichever field carries the step id. */
export const parseStepId = (session) => {
  if (!session) return null;

  const direct =
    session.stepId ??
    session.step_id ??
    session.step?.id ??
    session.step?.stepId ??
    session.currentStep?.id;

  if (direct) return direct;

  if (Array.isArray(session.steps) && session.steps.length) {
    const last = session.steps[session.steps.length - 1];
    return last?.id ?? last?.stepId ?? last?.step_id ?? null;
  }

  return null;
};

const moduleMap = {
  MODULES,
  MODULE_BY_KEY,
  MODULE_BY_INDEX,
  resolveModuleKey,
  getModule,
  moduleForPhase,
  parseSupervisorModule,
  parseSessionId,
  parseJobId,
  parseStepId,
};

export default moduleMap;
