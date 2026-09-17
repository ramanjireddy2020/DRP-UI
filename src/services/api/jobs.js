import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 3 of the collection — agent job status and results.
 *
 * Every agent phase follows the same shape: POST to start, get a jobId back,
 * poll status until terminal, then read that module's results endpoint.
 * useJob() wraps the polling loop.
 */

export const getJobStatus = async (jobId) =>
  unwrap(await apiClient.get(`/agents/jobs/${jobId}/status`));

/**
 * Raw job payload. Returns 409 until the job completes, so only call this
 * after a terminal-success status. Used for the pipeline stage breakdown and
 * as TxKG's results source (see txkgResult.js).
 */
export const getJobResult = async (jobId) =>
  unwrap(await apiClient.get(`/agents/jobs/${jobId}/result`));

/**
 * Terminal status vocabulary.
 *
 * CONFIRMED by the Postman collection: /status returns `completed` on success
 * and `failed` on failure —
 *
 *   { jobId, status: "completed", progressMessage: "Completed",
 *     module: "TxKG", error: "" }
 *
 * and the collection's own test script asserts `status !== 'failed'`.
 *
 * The extra spellings below are kept deliberately: an unexpected-but-terminal
 * value must not poll forever. They are matched case-insensitively.
 */
export const TERMINAL_SUCCESS = ["completed", "complete", "succeeded", "success", "done", "finished"];
export const TERMINAL_FAILURE = ["failed", "failure", "error", "cancelled", "canceled", "timeout", "timedout"];

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const readStatus = (payload) => {
  // Accept { status }, { state }, or a bare string.
  if (typeof payload === "string") return normalize(payload);
  return normalize(payload?.status ?? payload?.state);
};

/**
 * The live progress line the runner writes via ctx.progress(). The collection
 * is explicit that this belongs on the loading screen as the subtitle, so it
 * is read here rather than left buried in the raw payload.
 */
export const readProgressMessage = (payload) =>
  payload?.progressMessage ?? payload?.progress_message ?? null;

/**
 * Failure reason. The field is `error` — NOT `message`; `message` on a job
 * response is the API Gateway's "Unauthorized" envelope, which means something
 * entirely different. An empty string on a healthy job is normalised to null.
 */
export const readJobError = (payload) => {
  const value = payload?.error ?? payload?.errorMessage ?? payload?.error_message;
  const text = typeof value === "string" ? value.trim() : value;
  return text || null;
};

/**
 * /status echoes the module back. Worth reading: it is the one place the UI can
 * notice that the job it is polling belongs to a different module than the one
 * on screen.
 */
export const readJobModule = (payload) => payload?.module ?? payload?.moduleKey ?? null;

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
  readProgressMessage,
  readJobError,
  readJobModule,
};

export default jobsApi;
