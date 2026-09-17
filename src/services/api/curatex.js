import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 7 — CurateX compound curation.
 *
 * CurateX is the one module that is TWO jobs, which is why its phase sequence
 * has an extra screen:
 *
 *   target-profile  →  (researcher edits criteria)  →  compounds
 *   curatex-loading →  curatex-profile              →  curatex-submitted
 *                                                   →  curatex-results
 *
 * Each POST returns its own jobId and needs its own poll.
 */

/**
 * Build the drug profile candidates get matched against. Returns 202 { jobId }.
 * @param {object} payload - { target, disease, weights?, sourceSessionId? }
 *
 * sourceSessionId ties the profile back to the session it came from.
 */
export const createTargetProfile = async (payload) =>
  unwrap(await apiClient.post("/agents/curatex/target-profile", payload));

/**
 * The editable criteria for a completed target-profile job.
 * @returns {Promise<object>} { target, profile, criteria:
 *   [{ name, value, weight }], ligandCount, editable, warnings }
 */
export const getProfile = async (jobId) =>
  unwrap(await apiClient.get(`/agents/curatex/${jobId}/profile`));

/**
 * Score candidates using the researcher's edited weights. Returns 202 { jobId }.
 * @param {object} payload - { target, disease, weights, numResults? }
 */
export const scoreCompounds = async (payload) =>
  unwrap(await apiClient.post("/agents/curatex/compounds", payload));

/**
 * Ranked candidates, paginated.
 * @returns {Promise<object>} { totalCompounds, page, totalPages, target, items }
 */
export const getResults = async (jobId, params) =>
  unwrap(await apiClient.get(`/agents/curatex/${jobId}/results`, { params }));

const curatexApi = {
  createTargetProfile,
  getProfile,
  scoreCompounds,
  getResults,
};

export default curatexApi;
