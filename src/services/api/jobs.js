import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 3 of the collection — agent job status and results.
 *
 * Every agent phase follows the same shape: POST to start, get a job_id back,
 * poll status until terminal, then read the result. useJob() wraps that loop.
 */

export const getJobStatus = async (jobId) =>
  unwrap(await apiClient.get(`/agents/jobs/${jobId}/status`));

export const getJobResult = async (jobId) =>
  unwrap(await apiClient.get(`/agents/jobs/${jobId}/result`));

/**
 * Terminal status vocabulary.
 *
 * NOT CONFIRMED against the live API — the collection does not document which
 * values /status returns. These are the conventional spellings, matched
 * case-insensitively, and deliberately generous so an unexpected-but-terminal
 * value does not poll forever. Narrow this once the real vocabulary is known;
 * it is the single riskiest assumption in the integration.
 */
export const TERMINAL_SUCCESS = ["succeeded", "success", "completed", "complete", "done", "finished"];
export const TERMINAL_FAILURE = ["failed", "failure", "error", "cancelled", "canceled", "timeout", "timedout"];

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const readStatus = (payload) => {
  // Accept { status }, { state }, or a bare string.
  if (typeof payload === "string") return normalize(payload);
  return normalize(payload?.status ?? payload?.state);
};

export const isTerminalSuccess = (payload) =>
  TERMINAL_SUCCESS.includes(readStatus(payload));

export const isTerminalFailure = (payload) =>
  TERMINAL_FAILURE.includes(readStatus(payload));

export const isTerminal = (payload) =>
  isTerminalSuccess(payload) || isTerminalFailure(payload);

const jobsApi = {
  getJobStatus,
  getJobResult,
  isTerminal,
  isTerminalSuccess,
  isTerminalFailure,
  readStatus,
};

export default jobsApi;
