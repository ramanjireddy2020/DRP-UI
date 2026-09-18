import apiClient from "../apiClient";
import unwrap from "../unwrap";
import API_CONFIG from "../../apiconfig";

/**
 * Folder 11 — exports.
 *
 * Both POST endpoints return `{ downloadUrl: "/v1/exports/exp_…/download" }`.
 * Note the `/v1`: that path is the UPSTREAM app's, not the gateway's, so it
 * cannot be fetched as given. resolveDownloadUrl() strips the prefix before it
 * is used — see the note there.
 */

/**
 * Export a result table.
 * @param {object} payload - { resultId, format } — format is "csv" | "xlsx" | "json"
 */
export const createExport = async (payload) =>
  unwrap(await apiClient.post("/exports", payload));

/** Build the PDF report. */
export const createPdfExport = async (resultId) =>
  unwrap(await apiClient.post("/exports/pdf", { resultId }));

/**
 * Turn the API's `downloadUrl` into one this app can actually open.
 *
 * The API returns an upstream path that still carries `/v1`, but the gateway
 * has no `/v1` routes — requesting it verbatim 404s. Dropping the prefix and
 * joining onto the gateway base is what makes the link work.
 */
export const resolveDownloadUrl = (downloadUrl) => {
  if (!downloadUrl) return null;

  // Already absolute — trust it.
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;

  const path = String(downloadUrl).replace(/^\/?v1\//, "/").replace(/^\/?/, "/");
  return `${API_CONFIG.API_BASE_URL}${path}`;
};

/**
 * Fetch the export as a blob and hand it to the browser.
 *
 * A plain `window.open` cannot work here: the download route sits behind the
 * Cognito authorizer and a new tab carries no Authorization header, so it would
 * return 401. Going through apiClient keeps the token attached.
 */
export const downloadExport = async (downloadUrl, filename) => {
  const url = resolveDownloadUrl(downloadUrl);
  if (!url) throw new Error("The export did not come back with a download link.");

  const response = await apiClient.get(url, { responseType: "blob", baseURL: "" });

  const blobUrl = window.URL.createObjectURL(response.data);
  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "drp-export";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoked on the next tick so the click has taken effect first.
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0);
  }
};

const exportsApi = {
  createExport,
  createPdfExport,
  resolveDownloadUrl,
  downloadExport,
};

export default exportsApi;
