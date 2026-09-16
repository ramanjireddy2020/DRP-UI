import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 3/4 of the collection — the supervisor and session lifecycle.
 *
 * Deferred (no backend route yet, see the integration plan): POST /sessions/:id/steps,
 * POST /sessions/:id/steps/:stepId/rerun, POST /sessions/:id/messages,
 * GET /sessions/:id/artifacts, PATCH /sessions/:id, DELETE /sessions/:id.
 */

/**
 * Ask the supervisor. This is the entry point for a research session: the
 * response decides WHICH module runs first, so callers must not assume TxKG.
 *
 * @param {object} payload - { query, projectId?, moduleId?, fileIds? }
 * @returns {Promise<object>} raw session payload; use parseSupervisorResponse()
 *   in src/workflow/moduleMap.js to read the module out of it.
 */
export const createSession = async (payload) =>
  unwrap(await apiClient.post("/sessions", payload));

/** Reopen a session with all of its steps. */
export const getSession = async (sessionId) =>
  unwrap(await apiClient.get(`/sessions/${sessionId}`));

/** Paginated session history for RecentSessionsPage. */
export const listSessions = async (params) =>
  unwrap(await apiClient.get("/sessions", { params }));

/** Composer autosave. */
export const saveDraft = async (payload) =>
  unwrap(await apiClient.post("/sessions/draft", payload));

/** Attach a project or module to the current draft. */
export const patchDraft = async (payload) =>
  unwrap(await apiClient.patch("/sessions/draft", payload));

const sessionsApi = {
  createSession,
  getSession,
  listSessions,
  saveDraft,
  patchDraft,
};

export default sessionsApi;
