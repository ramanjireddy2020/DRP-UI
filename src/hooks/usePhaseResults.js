import { useCallback, useEffect, useRef, useState } from "react";
import litminexApi from "../services/api/litminex";
import curatexApi from "../services/api/curatex";
import screensuiteApi from "../services/api/screensuite";
import novsearchApi from "../services/api/novsearch";
import { getJobResult } from "../services/api/jobs";
import {
  normalizeLitminexResults,
  normalizeInsights,
  normalizeCuratexProfile,
  normalizeCuratexResults,
  normalizeDockingHits,
  normalizeNoveltyReport,
  normalizePipelineResult,
} from "../workflow/phaseResults";

/**
 * Reads one phase's results from that module's own endpoint.
 *
 * The collection's stated pattern is "on completed → call that module's results
 * endpoint", and it matters: the paginated article and compound tables and the
 * tabbed insights have no equivalent in the generic /agents/jobs/{id}/result
 * payload.
 *
 * TxKG is the one exception and is not handled here — normalizeTxkgResult()
 * reads the generic job result, which was verified against a real response.
 *
 * `kind` rather than a module key, because CurateX has two result sets behind
 * two different jobs: the editable profile, then the scored compounds.
 */
const FETCHERS = {
  litminex: async (jobId, { page }) => {
    // Insights are a separate call and a nice-to-have: a failure there must not
    // blank out the article table, which is the actual content.
    const [results, insights] = await Promise.all([
      litminexApi.getResults(jobId, page ? { page } : undefined),
      litminexApi.getInsights(jobId).catch(() => null),
    ]);
    return {
      ...normalizeLitminexResults(results),
      insights: insights ? normalizeInsights(insights) : null,
    };
  },

  "curatex-profile": async (jobId) => normalizeCuratexProfile(await curatexApi.getProfile(jobId)),

  "curatex-results": async (jobId, { page, pageSize }) =>
    normalizeCuratexResults(await curatexApi.getResults(jobId, { page, pageSize })),

  screensuite: async (jobId) => normalizeDockingHits(await screensuiteApi.getHits(jobId)),

  novsearch: async (jobId) => normalizeNoveltyReport(await novsearchApi.getReport(jobId)),

  // The pipeline has no dedicated endpoint — the per-stage breakdown only
  // exists in the raw job result.
  pipeline: async (jobId) => normalizePipelineResult(await getJobResult(jobId)),
};

/**
 * @param {string|null} kind   - key of FETCHERS above; null/unknown = idle
 * @param {string|null} jobId  - completed job to read; null = idle
 * @param {object} options
 * @param {boolean} options.enabled   - default true
 * @param {number}  options.page      - forwarded to paginated endpoints
 * @param {number}  options.pageSize  - forwarded to CurateX results
 */
const usePhaseResults = (kind, jobId, options = {}) => {
  const { enabled = true, page, pageSize } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // Guards against a slow response for an old job overwriting a newer one.
  const requestRef = useRef(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const fetcher = kind ? FETCHERS[kind] : null;

    if (!fetcher || !jobId || !enabled) {
      setLoading(false);
      return undefined;
    }

    const requestId = ++requestRef.current;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher(jobId, { page, pageSize })
      .then((normalized) => {
        if (cancelled || requestId !== requestRef.current) return;
        setData(normalized);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || requestId !== requestRef.current) return;
        setError(err?.userMessage || err?.message || "The results could not be loaded.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, jobId, enabled, page, pageSize, attempt]);

  return { data, loading, error, reload };
};

export default usePhaseResults;
