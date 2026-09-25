import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 8 — ScreenSuite docking.
 *
 * ⚠️ This module CANNOT SUCCEED on the current deployment. The collection says
 * so twice: PyMOL and Vina are not installable on Databricks Apps, so
 * screensuite.screen fails, and a full pipeline run finishes 4 of 5 stages.
 * The interaction profile, the 3D viewer and the download bundles have no endpoint at
 * all.
 *
 * So the screening phase must render a real failure, not a spinner that never
 * resolves. See SCREENSUITE_UNAVAILABLE below and its use in the phase
 * component.
 */

/**
 * True while the deployment is expected to fail docking. Now false: the
 * backend no longer returns the "cannot run" / PyMOL / Vina failure — it
 * returns a PDB structure shortlist to pick from (see PdbPicker). With this
 * true, the UI itself printed "ScreenSuite cannot run on this deployment".
 */
export const SCREENSUITE_UNAVAILABLE = false;

export const SCREENSUITE_UNAVAILABLE_MESSAGE =
  "Docking is not available on this deployment — PyMOL and Vina cannot be " +
  "installed on Databricks Apps. The binding-affinity table, interaction profile and " +
  "3D view will stay empty until the agent runs on a host that has them.";

/**
 * Dock compounds against the protein. Returns 202 { jobId }.
 * @param {object} payload - { target, compoundLibrary?, compounds? }
 */
export const screen = async (payload) =>
  unwrap(await apiClient.post("/agents/screensuite/screen", payload));

/**
 * Docking hits for a completed job.
 * @returns {Promise<Array>} [{ mode, compound, protein, affinityKcalPerMol, outputFile }]
 */
export const getHits = async (jobId) =>
  unwrap(await apiClient.get(`/agents/screensuite/${jobId}/hits`));

const screensuiteApi = {
  SCREENSUITE_UNAVAILABLE,
  SCREENSUITE_UNAVAILABLE_MESSAGE,
  screen,
  getHits,
};

export default screensuiteApi;
