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
 * @param {number}      options.timeout      - give up after, ms (default: never)
 * @param {boolean}     options.fetchResult  - fetch /result on success (default true).
 *   Pass false for modules that have their own results endpoint — only TxKG
 *   reads the generic /result.
 *
 * Disabling the hook (enabled=false) stops polling but keeps the last state, so
 * a finished job's result survives the step being switched off.
 */
const useJob = (jobId, options = {}) => {
  const {
    enabled = true,
    initialDelay = 1000,
    maxDelay = 5000,
    // No client-side give-up by default. It was 5 minutes, and docking can run
    // longer — especially in a background tab, where browsers slow timers —
    // so a still-running dock was marked failed and the card fell back to a
    // stale "choose a structure" / "no hits" state (testing). The job's own
    // status decides when it is finished.
    timeout = Infinity,
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

  /**
   * When polling started, and when the status or progress line last changed,
   * so a screen can say how long a job has been running and when it has gone
   * quiet — polling no longer gives up on its own.
   */
  const [startedAt, setStartedAt] = useState(null);
  const [lastChangeAt, setLastChangeAt] = useState(null);
  const lastSeenRef = useRef(null);

  /** The module /status reports this job belongs to. */
  const [jobModule, setJobModule] = useState(null);

  /**
   * The job id the state above belongs to. Several of these hooks run side by
   * side (one per workflow step), and a caller has to be able to tell a result
   * for the step's current job from one left over from the job before it.
   */
  const [trackedJobId, setTrackedJobId] = useState(null);

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

  /**
   * Stop waiting on a job the user has given up on. Polling ends and the job
   * is reported as not finished (it may still complete on the server).
   */
  const stop = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    setIsPolling(false);
    setError("Stopped waiting for this job. It may still finish on the server; reopen the session later to see its result.");
    setIsFailed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setTrackedJobId(null);
    setStartedAt(null);
    setLastChangeAt(null);
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
    setTrackedJobId(jobId);
    setIsPolling(true);

    const startedAt = Date.now();
    setStartedAt(startedAt);
    setLastChangeAt(startedAt);
    lastSeenRef.current = null;
    let delay = initialDelay;
    // A status read can fail transiently (network blip, tab waking up), so a
    // few in a row are retried before the job is reported as unreadable.
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    let inFlight = false;

    const finishWithError = (err, fallbackMessage) => {
      timerRef.current = null;
      if (cancelledRef.current) return;
      setError(err?.userMessage || err?.message || fallbackMessage);
      setIsFailed(true);
      setIsPolling(false);
    };

    const poll = async () => {
      // The pending timer (if any) has fired or been superseded.
      timerRef.current = null;
      if (cancelledRef.current) return;

      if (Date.now() - startedAt > timeout) {
        finishWithError(
          null,
          `The job did not finish within ${Math.round(timeout / 1000)}s. It may still be running — reopen the session to check.`
        );
        return;
      }

      let payload;
      inFlight = true;
      try {
        payload = await getJobStatus(jobId);
        consecutiveErrors = 0;
      } catch (err) {
        inFlight = false;
        // A 401 is already handled globally by the response interceptor.
        consecutiveErrors += 1;
        if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS && err?.status !== 404) {
          timerRef.current = setTimeout(poll, maxDelay);
          return;
        }
        finishWithError(err, "Could not read the job status.");
        return;
      }

      inFlight = false;
      if (cancelledRef.current) return;

      setStatusPayload(payload);
      setStatus(readStatus(payload));
      setProgressMessage(readProgressMessage(payload));
      const seen = `${readStatus(payload)}|${readProgressMessage(payload)}`;
      if (seen !== lastSeenRef.current) {
        lastSeenRef.current = seen;
        setLastChangeAt(Date.now());
      }
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

    // Coming back to the tab: check straight away instead of waiting out a
    // timer the browser slowed down while the tab was hidden.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || cancelledRef.current) return;
      // Only when a poll is waiting on its timer, not mid-request or finished.
      if (inFlight || !timerRef.current) return;
      clearTimer();
      poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelledRef.current = true;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [jobId, enabled, attempt, initialDelay, maxDelay, timeout, fetchResult]);

  return {
    jobId: trackedJobId,
    status,
    statusPayload,
    result,
    error,
    isPolling,
    isDone,
    isFailed,
    progressMessage,
    jobModule,
    startedAt,
    lastChangeAt,
    retry,
    reset,
    stop,
  };
};

export default useJob;
