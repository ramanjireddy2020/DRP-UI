import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 9 — NovSearch patent novelty.
 */

/**
 * Is this target/drug/disease combination already patented? Returns 202 { jobId }.
 *
 * @param {object} payload - { target, disease, drug, candidateId?, dockingId?, numResults? }
 *
 * candidateId / dockingId carry over from CurateX and ScreenSuite. On this
 * deployment ScreenSuite never completes, so dockingId will normally be null —
 * the assessment still runs without it.
 */
export const assess = async (payload) =>
  unwrap(await apiClient.post("/agents/novsearch/assess", payload));

/**
 * Verdict plus the patent table.
 * @returns {Promise<object>} { jobId, target, disease, assessment,
 *   recommendations, patents: [{ patentId, title, relevance }], totalPatents }
 */
export const getReport = async (jobId) =>
  unwrap(await apiClient.get(`/agents/novsearch/${jobId}/report`));

/**
 * Question over one, several or all indexed patents. Vector search + LLM.
 *
 * @param {object} payload - { question, patentIds?, topK? }
 *   patentIds picks the scope: null = every indexed patent, an array = just
 *   those (which is what the "Compare" action sends).
 * @returns {Promise<object>} { answer, mode, patentIdsUsed, chunksUsed }
 */
export const ask = async (payload) =>
  unwrap(await apiClient.post("/agents/novsearch/ask", payload));

const novsearchApi = {
  assess,
  getReport,
  ask,
};

export default novsearchApi;
