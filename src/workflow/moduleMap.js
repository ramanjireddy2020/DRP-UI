/**
 * The bridge between what the supervisor returns and what the workflow UI shows.
 *
 * The supervisor decides which agent runs — the UI must not assume TxKG. This
 * module is the single place that translates a module name from the API into a
 * step index and a workflowPhase string, and back again into the exact spelling
 * the API expects when the UI hands off to the next module.
 *
 * The phase vocabulary is deliberately unchanged from the pre-integration
 * component (same spellings) so the render code in CompleteWorkflow.jsx keeps
 * working. Note the asymmetry: NovSearch's phases are prefixed "novelty", not
 * "novsearch".
 */

/**
 * `label` + `agentRole` are the one naming scheme every module answers with.
 *
 * Each phase screen used to write its own header — "DRP TXKG AGENT",
 * "DRP LITMINEX AGENT" — so the product name leaked into the agent's
 * identity and no two modules described themselves the same way. Renderers now
 * read `agentName` (see agentNameFor) and there is one place to change it.
 */
export const MODULES = [
  {
    key: "txkg",
    index: 0,
    label: "TxKG",
    agentRole: "Target Identification Agent",
    number: "01",
    // The spelling POST /sessions/{id}/steps expects in `module`. Taken from
    // the collection's /modules response, not guessed from the label.
    apiKey: "TxKG",
    phasePrefix: "txkg",
    loadingPhase: "txkg-loading",
    resultsPhase: "txkg-results",
    errorPhase: "txkg-error",
  },
  {
    key: "litminex",
    index: 1,
    label: "LitMineX",
    agentRole: "Literature Mining Agent",
    number: "02",
    apiKey: "LitMineX",
    phasePrefix: "litminex",
    loadingPhase: "litminex-loading",
    resultsPhase: "litminex-results",
    errorPhase: "litminex-error",
  },
  {
    key: "curatex",
    index: 2,
    label: "CurateX",
    agentRole: "Drug Curation Agent",
    number: "03",
    // /modules returns key "CurateX" but displayName "CuraTeX" — the key is
    // what the API matches on.
    apiKey: "CurateX",
    phasePrefix: "curatex",
    loadingPhase: "curatex-loading",
    // CurateX resolves its first job to the editable profile, not to results.
    resultsPhase: "curatex-profile",
    errorPhase: "curatex-error",
  },
  {
    key: "screensuite",
    index: 3,
    label: "ScreenSuite",
    agentRole: "Virtual Screening Agent",
    number: "04",
    apiKey: "ScreenSuite",
    phasePrefix: "screensuite",
    loadingPhase: "screensuite-loading",
    resultsPhase: "screensuite-results",
    errorPhase: "screensuite-error",
  },
  {
    key: "novsearch",
    index: 4,
    label: "NovSearch",
    agentRole: "Novelty Search Agent",
    number: "05",
    apiKey: "NovSearch",
    // NOTE: phases use the "novelty" prefix, not "novsearch".
    phasePrefix: "novelty",
    loadingPhase: "novelty-loading",
    resultsPhase: "novelty-results",
    errorPhase: "novelty-error",
  },
];

/**
 * The whole-pipeline run: TxKG → LitMineX → CurateX → ScreenSuite → NovSearch
 * as a single job.
 *
 * It is NOT a rail step — it spans all five — so it lives outside MODULES and
 * is excluded from the stepper. It is here because the supervisor really does
 * return `module: "SaaS Pipeline"`, and without an entry for it startSession
 * would reject a perfectly valid response as an unrecognised module.
 *
 * `index: 0` only positions it for the conversation slice; isPipeline is what
 * callers should branch on.
 */
export const PIPELINE = {
  key: "pipeline",
  index: 0,
  label: "SaaS Pipeline",
  agentRole: "Full Pipeline Agent",
  number: "—",
  apiKey: "SaaS Pipeline",
  isPipeline: true,
  phasePrefix: "pipeline",
  loadingPhase: "pipeline-loading",
  resultsPhase: "pipeline-results",
  errorPhase: "pipeline-error",
};

/** Everything that can own a step, including the pipeline. */
export const ALL_MODULES = [...MODULES, PIPELINE];

export const MODULE_BY_KEY = ALL_MODULES.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export const MODULE_BY_INDEX = MODULES.slice().sort((a, b) => a.index - b.index);

/**
 * Every spelling we are willing to accept for a module. The supervisor's
 * canonical keys are the ones in /modules (TxKG, LitMineX, CurateX,
 * ScreenSuite, NovSearch, SaaS Pipeline) — matched case-insensitively — but the
 * backend's own collection uses another set of names for the same agents
 * (literature-mining, drug-curation, screening, novelty-search-agent), so this
 * map covers both rather than guessing one.
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

  // The full-pipeline run. Without these, a valid supervisor response reading
  // "SaaS Pipeline" is treated as an unrecognised module.
  pipeline: "pipeline",
  "saas pipeline": "pipeline",
  saaspipeline: "pipeline",
  "saas-pipeline": "pipeline",
  "full-pipeline": "pipeline",
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
 * The spelling to send back to the API in `module`.
 *
 * Hand-off posts must carry the API's own key — sending the UI's internal
 * lowercase key would make the supervisor fall through infer_module() and
 * re-route by keyword, which silently ignores the user's choice.
 */
export const apiModuleKey = (key) => MODULE_BY_KEY[resolveModuleKey(key)]?.apiKey ?? null;

/**
 * The single name a module identifies itself by, e.g.
 * "TxKG — Target Identification Agent".
 *
 * Every phase header, every agent chat message and every artifact label reads
 * this, so the five modules can no longer drift apart. Accepts a module key or
 * anything resolveModuleKey understands, including the `agentName` the API
 * returns on a chat reply ("DRP LitMineX Agent").
 */
export const agentNameFor = (key) => {
  const module = MODULE_BY_KEY[resolveModuleKey(key)];
  if (!module) return null;
  return module.agentRole ? `${module.label} (${module.agentRole})` : module.label;
};

/**
 * The two halves of a module's name, for the headers that render them as two
 * lines — the module name as written, with the full agent name beneath it.
 *
 * Item T5: the name used to be flattened into one uppercased string
 * ("TXKG — TARGET IDENTIFICATION AGENT"). The agreed form keeps each module's
 * own casing — TxKG, LitMineX, CurateX, ScreenSuite, NovSearch — so a single
 * uppercase string can no longer carry it. `label` and `agentRole` already
 * hold the two halves correctly cased; this just exposes them as a pair.
 *
 * @returns {{label: string, role: string|null}|null}
 */
export const moduleDisplayFor = (key) => {
  const module = MODULE_BY_KEY[resolveModuleKey(key)];
  if (!module) return null;
  return { label: module.label, role: module.agentRole ?? null };
};

/**
 * @deprecated Use moduleDisplayFor. Kept only so a caller that has not been
 * converted still renders a correctly-cased name rather than shouting.
 */
export const agentHeadingFor = (key) => agentNameFor(key);

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

  return ALL_MODULES.find((m) => p.startsWith(m.phasePrefix)) ?? null;
};

/** Is this phase a terminal failure for its module? */
export const isErrorPhase = (phase) =>
  String(phase ?? "").endsWith("-error");

/** Is this phase waiting on a job? */
export const isLoadingPhase = (phase) =>
  String(phase ?? "").endsWith("-loading");

/**
 * Pull the active module out of a supervisor response.
 *
 * Probes the plausible fields in order of specificity. Returns null if none
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

/**
 * Read whichever field carries the step id.
 *
 * `currentStepId` comes first: on a session payload it names the step the
 * supervisor just created, which is the one the chat bar must address.
 */
export const parseStepId = (session) => {
  if (!session) return null;

  const direct =
    session.currentStepId ??
    session.current_step_id ??
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

/**
 * Read a bare step object — what POST /sessions/{id}/steps and .../rerun
 * return.
 *
 * This is NOT a session payload: `id` is the step's own id, so parseStepId's
 * session-shaped probing would miss it entirely.
 *
 * @returns {{ stepId, jobId, moduleKey, status, stepIndex, raw }}
 */
export const parseStepResponse = (step) => ({
  stepId: step?.id ?? step?.stepId ?? step?.step_id ?? null,
  jobId: step?.jobId ?? step?.job_id ?? null,
  moduleKey: resolveModuleKey(step?.module ?? step?.agent),
  status: step?.status ?? null,
  stepIndex: step?.stepIndex ?? step?.step_index ?? null,
  raw: step ?? null,
});

/**
 * Read a chat response — what POST /sessions/{id}/messages returns.
 *
 * `jobId` is the important field: null means the LLM answered from the stored
 * result and nothing else happens; non-null means an explicit @Module started a
 * fresh agent run that the caller must poll.
 */
export const parseMessageResponse = (message) => ({
  role: message?.role ?? "agent",
  agentName: message?.agentName ?? message?.agent_name ?? null,
  content: message?.content ?? message?.text ?? "",
  stepId: message?.stepId ?? message?.step_id ?? null,
  jobId: message?.jobId ?? message?.job_id ?? null,
  moduleKey: resolveModuleKey(message?.module ?? message?.agentName),
  raw: message ?? null,
});

const moduleMap = {
  MODULES,
  PIPELINE,
  ALL_MODULES,
  MODULE_BY_KEY,
  MODULE_BY_INDEX,
  resolveModuleKey,
  getModule,
  apiModuleKey,
  agentNameFor,
  agentHeadingFor,
  moduleDisplayFor,
  moduleForPhase,
  isErrorPhase,
  isLoadingPhase,
  parseSupervisorModule,
  parseSessionId,
  parseJobId,
  parseStepId,
  parseStepResponse,
  parseMessageResponse,
};

export default moduleMap;
