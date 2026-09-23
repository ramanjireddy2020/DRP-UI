import { useCallback, useState } from "react";
import exportsApi from "../services/api/exports";

/**
 * Branch, Rerun and Export for ONE module's step.
 *
 * All three were dead buttons in every phase screen. The logic lives here
 * rather than in CompleteWorkflow so the busy/error state is per-action and the
 * five phases share one implementation.
 *
 * Every module's card is on the page at once, so each card gets its own
 * instance keyed on its own module: Export on the LitMineX card exports the
 * LitMineX job even while NovSearch is the step on screen. Without `moduleKey`
 * it falls back to the active step, as it used to.
 *
 * @param {object} session - the useWorkflowSession instance
 * @param {string|null} moduleKey - the module these actions belong to
 * @param {string|null} jobId - the completed job whose results Export sends
 * @param {string} moduleLabel - used for the downloaded filename
 */
const usePhaseActions = ({ session, moduleKey = null, jobId, moduleLabel }) => {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const key = moduleKey ?? session?.activeKey ?? null;
  const stepState = key ? session?.steps?.[key] : null;
  const stepId = stepState?.stepId ?? null;
  const selections = stepState?.data?.selections;
  const sessionId = session?.sessionId ?? null;
  const rerunStep = session?.rerunStep;
  const handOff = session?.handOff;

  /**
   * Rerun the step, keeping the original.
   *
   * The backend creates a new step with rerunOfStepId pointing back, so
   * nothing is overwritten — which is why this is safe to offer without a
   * confirmation.
   */
  // There is no parameter editor in the UI yet, so a rerun sends {params:{}}
  // unless a caller passes some.
  const onRerun = useCallback(async (params) => {
    setBusy("rerun");
    setError(null);
    try {
      const plain = params && typeof params === "object" && !params.nativeEvent ? params : {};
      const result = await rerunStep(key, plain);
      if (!result) setError("The rerun could not be started.");
    } catch (err) {
      setError(err?.userMessage || err?.message || "The rerun could not be started.");
    } finally {
      setBusy(null);
    }
  }, [rerunStep, key]);

  /**
   * Branch from this step.
   *
   * A branch is the same POST as a hand-off with `fromStepId` set to an earlier
   * step — the collection is explicit about that. It re-runs the CURRENT module
   * from this point, giving a second line of enquiry that keeps the original
   * intact.
   */
  const onBranch = useCallback(async () => {
    if (!key) {
      setError("There is no step to branch from.");
      return;
    }

    setBusy("branch");
    setError(null);
    try {
      const result = await handOff(key, selections ?? {}, stepId);
      if (!result) setError("The branch could not be created.");
    } catch (err) {
      setError(err?.userMessage || err?.message || "The branch could not be created.");
    } finally {
      setBusy(null);
    }
  }, [handOff, key, selections, stepId]);

  /**
   * Export this step's results.
   *
   * PDF has its own endpoint; everything else goes through /exports with a
   * `format`. The returned downloadUrl is an upstream path carrying `/v1`, so
   * it has to go through resolveDownloadUrl — and be fetched with the bearer
   * token rather than opened in a new tab, which would 401.
   */
  const onExport = useCallback(
    async (format = "csv") => {
      if (!jobId) {
        setError("There are no completed results to export yet.");
        return;
      }

      setBusy("export");
      setError(null);
      try {
        const response =
          format === "pdf"
            ? await exportsApi.createPdfExport(jobId)
            : await exportsApi.createExport({ resultId: jobId, format });

        const downloadUrl = response?.downloadUrl ?? response?.download_url;
        if (!downloadUrl) throw new Error("The export did not return a download link.");

        const extension = format === "xlsx" ? "xlsx" : format;
        const name = `${(moduleLabel || "drp").toLowerCase()}-${jobId}.${extension}`;

        await exportsApi.downloadExport(downloadUrl, name);
      } catch (err) {
        setError(err?.userMessage || err?.message || "The export failed.");
      } finally {
        setBusy(null);
      }
    },
    [jobId, moduleLabel]
  );

  return {
    busy,
    error,
    clearError: () => setError(null),
    // A handler is only offered when it can actually work, so PhaseActions can
    // disable the button and explain why instead of failing on click.
    onRerun: sessionId && stepId && rerunStep ? onRerun : undefined,
    onBranch: sessionId && stepId && handOff ? onBranch : undefined,
    onExport: jobId ? onExport : undefined,
  };
};

export default usePhaseActions;
