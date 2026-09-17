import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 2 — the module catalog.
 *
 * searchModules() backs the composer's @ dropdown, which matters more than it
 * looks: the chat bar routes entirely through the backend now, and an explicit
 * @Module is the ONLY thing that starts a new agent run from a message. Without
 * the autocomplete the researcher has to know and spell the module keys exactly
 * ("CurateX", not "curatex" or "CuraTeX") to trigger one.
 */

/** The five agents plus the full pipeline. */
export const getModules = async () => unwrap(await apiClient.get("/modules"));

/**
 * Filter the catalog by what the user typed after @.
 * @returns {Promise<Array>} [{ key, displayName, icon, description }]
 */
export const searchModules = async (q) =>
  unwrap(await apiClient.get("/modules/search", { params: { q } }));

const modulesApi = {
  getModules,
  searchModules,
};

export default modulesApi;
