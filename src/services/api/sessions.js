import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folders 3 and 4 of the collection — the supervisor and session lifecycle.
 *
 * An earlier note here said steps/messages/artifacts/rerun/patch/delete were
 * deferred for want of a backend route. That is no longer true: the collection
 * documents all six, and the two that carry the workflow are
 * createStep() (module hand-off) and postMessage() (the chat bar).
 */

/**
 * Ask the supervisor. This is the entry point for a research session: the
 * response decides WHICH module runs first, so callers must not assume TxKG.
 *
 * `module` may be null to let the supervisor infer it, or a module key to force
 * it — dispatch.infer_module() resolves explicit module → @mention → keywords
 * → TxKG. Pass "SaaS Pipeline" to run all five agents as one job.
 *
 * @param {object} payload - { query, module?, projectId? }
 * @returns {Promise<object>} raw session payload; use the parsers in
 *   src/workflow/moduleMap.js to read module / sessionId / jobId / stepId.
 */
export const createSession = async (payload) =>
  unwrap(await apiClient.post("/sessions", payload));

/** Reopen a session with all of its steps, messages and the latest jobId. */
export const getSession = async (sessionId) =>
  unwrap(await apiClient.get(`/sessions/${sessionId}`));

/** Paginated session history. Params: search, module, status, page. */
export const listSessions = async (params) =>
  unwrap(await apiClient.get("/sessions", { params }));

/** Composer autosave. */
export const saveDraft = async (payload) =>
  unwrap(await apiClient.post("/sessions/draft", payload));

/** Attach a project or module to the current draft. */
export const patchDraft = async (payload) =>
  unwrap(await apiClient.patch("/sessions/draft", payload));

/**
 * Hand the session to the next module, carrying the researcher's picks.
 *
 * This is what "Continue" and "View in ScreenSuite" do. build_params() on the
 * backend turns `selections` into the next agent's parameters. Setting
 * `fromStepId` to an earlier step branches instead of appending.
 *
 * The response is a step object carrying the new `jobId` to poll.
 *
 * NOTE on selections: send gene names (JAK2), not UniProt accessions
 * (O60674) — PubMed text never contains an accession, so LitMineX finds
 * nothing. Use toGeneNames() in src/workflow/selections.js at the boundary.
 *
 * @param {string} sessionId
 * @param {object} payload - { module, selections?, fromStepId? }
 */
export const createStep = async (sessionId, payload) =>
  unwrap(await apiClient.post(`/sessions/${sessionId}/steps`, payload));

/**
 * Run a step again with tweaked parameters. The original step is kept; the new
 * one carries rerunOfStepId pointing back at it.
 *
 * @param {object} payload - { params: {...} }
 */
export const rerunStep = async (sessionId, stepId, payload) =>
  unwrap(await apiClient.post(`/sessions/${sessionId}/steps/${stepId}/rerun`, payload));

/**
 * The chat bar. Asks a question about the step on screen.
 *
 * The backend decides what happens: normally the LLM answers from the step's
 * stored result and `jobId` comes back null. Only an explicit @Module in the
 * text starts a new agent run, and then `jobId` is set and the caller must
 * poll it. The UI must not infer routing from keywords — that decision is the
 * supervisor's.
 *
 * @param {object} payload - { message, stepId }
 * @returns {Promise<object>} { role, agentName, content, stepId, jobId }
 */
export const postMessage = async (sessionId, payload) =>
  unwrap(await apiClient.post(`/sessions/${sessionId}/messages`, payload));

/**
 * One artifact per completed step. `resultType` says which results endpoint to
 * open for it.
 */
export const getArtifacts = async (sessionId) =>
  unwrap(await apiClient.get(`/sessions/${sessionId}/artifacts`));

/**
 * Rename the session or mark it Saved ("End Task"). Saved outranks the status
 * derived from the steps.
 *
 * @param {object} payload - { title?, status? }
 */
export const patchSession = async (sessionId, payload) =>
  unwrap(await apiClient.patch(`/sessions/${sessionId}`, payload));

/** Cascade-deletes steps and messages; jobs are kept for audit. */
export const deleteSession = async (sessionId) =>
  unwrap(await apiClient.delete(`/sessions/${sessionId}`));

const sessionsApi = {
  createSession,
  getSession,
  listSessions,
  saveDraft,
  patchDraft,
  createStep,
  rerunStep,
  postMessage,
  getArtifacts,
  patchSession,
  deleteSession,
};

export default sessionsApi;
