import { useEffect, useState } from "react";
import { FETCHERS } from "./usePhaseResults";
import { getJobResult } from "../services/api/jobs";
import { normalizeTxkgResult } from "../workflow/txkgResult";
import { buildSessionReport } from "../workflow/sessionReport";
import { getCompoundsJob } from "../workflow/sessionStore";

/**
 * What an earlier run found, loaded from the server by its job id.
 *
 * Earlier runs used to show only a snapshot taken in memory when they were
 * superseded, so after reopening a session every one of them read "This run
 * produced no results to keep" although its results were still on the server
 * (testing 2026-10-14). This loads the run's own results with the same
 * loaders as the live cards and summarises them like the session report.
 *
 * @param {string} moduleKey - txkg | litminex | curatex | screensuite | novsearch
 * @param {object} run       - { jobId, stepId }
 * @param {boolean} enabled  - load only when wanted (the card is opened)
 * @returns {{ loading, error, section }} section = { summary, items[] } or null
 */
const loadSection = async (moduleKey, { jobId, stepId }) => {
  switch (moduleKey) {
    case "txkg":
      return buildSessionReport({ txkg: normalizeTxkgResult(await getJobResult(jobId)) });
    case "litminex":
      return buildSessionReport({ litminex: await FETCHERS.litminex(jobId, { page: 1 }) });
    case "curatex": {
      // The step's job is the profile; the candidates are a second job,
      // remembered per CurateX step.
      const compoundsJobId = getCompoundsJob(stepId, jobId);
      if (compoundsJobId) {
        const curatex = await FETCHERS["curatex-results"](compoundsJobId, { page: 1 });
        return buildSessionReport({ curatex, curatexTarget: curatex?.target ?? null });
      }
      const profile = await FETCHERS["curatex-profile"](jobId);
      return buildSessionReport({ curatexTarget: profile?.target ?? null });
    }
    case "screensuite":
      return buildSessionReport({ docking: await FETCHERS.screensuite(jobId) });
    case "novsearch":
      return buildSessionReport({ novelty: await FETCHERS.novsearch(jobId) });
    default:
      return null;
  }
};

const useRunSummary = (moduleKey, run, enabled) => {
  const jobId = run?.jobId ?? null;
  const stepId = run?.stepId ?? null;
  const [state, setState] = useState({ loading: false, error: null, section: null, loadedFor: null });

  useEffect(() => {
    if (!enabled || !jobId || state.loadedFor === jobId) return undefined;
    let cancelled = false;
    setState({ loading: true, error: null, section: null, loadedFor: null });
    loadSection(moduleKey, { jobId, stepId })
      .then((report) => {
        if (cancelled) return;
        const section = report?.sections?.find((s) => s.key === moduleKey) ?? null;
        setState({ loading: false, error: null, section, loadedFor: jobId });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: err?.userMessage || err?.message || "This run's results could not be loaded.", section: null, loadedFor: null });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, moduleKey, jobId, stepId]);

  return state;
};

export default useRunSummary;
