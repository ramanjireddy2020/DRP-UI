import { useCallback, useEffect, useRef, useState } from "react";
import {
  getJobStatus,
  getJobResult,
  isTerminalSuccess,
  isTerminalFailure,
  readStatus,
  readProgressMessage,
  readJobError,
  readJobModule,
} from "../services/api/jobs";

/**
 * Polls an agent job until it reaches a terminal state, then fetches its result.
 *
 * This replaces the setTimeout chain that used to drive the workflow. Written
 * once because all five agent phases share the shape; written five times it
 * would be five different cleanup bugs.
 *
 * Uses a recursive setTimeout rather than setInterval so a slow response can
 * never overlap the next poll, and so the delay can back off.
 *
 * @param {string|null} jobId        - job to watch; null/undefined = idle
 * @param {object}      options
 * @param {boolean}     options.enabled     - default true
 * @param {number}      options.initialDelay - first poll delay, ms (default 1000)
 * @param {number}      options.maxDelay     - delay ceiling, ms (default 5000)
 * @param {number}      options.timeout      - give up after, ms (default 300000 / 5 min)
 * @param {boolean}     options.fetchResult  - fetch /result on success (default true)
 */
const useJob = (jobId, options = {}) => {
  const {
    enabled = true,
    initialDelay = 1000,
    maxDelay = 5000,
    // Docking in particular is slow — the mock stood in for it with an 8s timer.
    // 5 minutes is generous rather than tuned; the real cadence is an open
    // question against the live API.
    timeout = 300000,
    fetchResult = true,
  } = options;

  const [status, setStatus] = useState(null);
  const [statusPayload, setStatusPayload] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  /**
   * The runner's live progress line, written by ctx.progress(). The collection
   * calls for this on the loading screen as the subtitle, which is the only
   * feedback a multi-minute agent run gives the user.
   */
  const [progressMessage, setProgressMessage] = useState(null);

  /** The module /status reports this job belongs to. */
  const [jobModule, setJobModule] = useState(null);

  // Bumped to force a re-poll of the same job id.
  const [attempt, setAttempt] = useState(0);

  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setStatus(null);
    setStatusPayload(null);
    setResult(null);
    setError(null);
    setIsPolling(false);
    setIsDone(false);
    setIsFailed(false);
    setProgressMessage(null);
    setJobModule(null);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    clearTimer();

    if (!jobId || !enabled) {
      setIsPolling(false);
      return undefined;
    }

    // Fresh run for this job id.
    setStatus(null);
    setStatusPayload(null);
    setResult(null);
    setError(null);
    setIsDone(false);
    setIsFailed(false);
    setProgressMessage(null);
    setJobModule(null);
    setIsPolling(true);

    const startedAt = Date.now();
    let delay = initialDelay;

    const finishWithError = (err, fallbackMessage) => {
      if (cancelledRef.current) return;
      setError(err?.userMessage || err?.message || fallbackMessage);
      setIsFailed(true);
      setIsPolling(false);
    };

    const poll = async () => {
      if (cancelledRef.current) return;

      if (Date.now() - startedAt > timeout) {
        finishWithError(
          null,
          `The job did not finish within ${Math.round(timeout / 1000)}s. It may still be running — reopen the session to check.`
        );
        return;
      }

      let payload;
      try {
        payload = await getJobStatus(jobId);
      } catch (err) {
        // A 401 is already handled globally by the response interceptor.
        finishWithError(err, "Could not read the job status.");
        return;
      }

      if (cancelledRef.current) return;

      setStatusPayload(payload);
      setStatus(readStatus(payload));
      setProgressMessage(readProgressMessage(payload));
      setJobModule(readJobModule(payload));

      if (isTerminalFailure(payload)) {
        // The reason lives in `error`, not `message` — on a job payload
        // `message` is API Gateway's authorizer envelope, which would report
        // "Unauthorized" for what is really an agent crash.
        finishWithError(null, readJobError(payload) || "The job failed.");
        return;
      }

      if (isTerminalSuccess(payload)) {
        if (!fetchResult) {
          setIsDone(true);
          setIsPolling(false);
          return;
        }

        try {
          const jobResult = await getJobResult(jobId);
          if (cancelledRef.current) return;
          setResult(jobResult);
          setIsDone(true);
          setIsPolling(false);
        } catch (err) {
          finishWithError(err, "The job finished but its result could not be read.");
        }
        return;
      }

      // Still running — back off and go again.
      delay = Math.min(Math.round(delay * 1.5), maxDelay);
      timerRef.current = setTimeout(poll, delay);
    };

    // First poll goes out immediately: a job that is already finished should not
    // sit on a loading screen for a second for no reason.
    poll();

    return () => {
      cancelledRef.current = true;
      clearTimer();
    };
  }, [jobId, enabled, attempt, initialDelay, maxDelay, timeout, fetchResult]);

  return {
    status,
    statusPayload,
    result,
    error,
    isPolling,
    isDone,
    isFailed,
    progressMessage,
    jobModule,
    retry,
    reset,
  };
};

export default useJob;
