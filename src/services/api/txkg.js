import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 5 — TxKG target discovery, plus the subgraph endpoints the graph view
 * uses.
 *
 * The normal path into TxKG is the supervisor (POST /sessions); query() here is
 * the direct entry the collection documents for running the agent without a
 * session.
 */

/** Insight tabs, in the order the UI renders them. */
export const INSIGHT_TABS = ["interpretation", "recommendations", "sources"];

/** Map the UI's numeric tab index onto the API's `tab` parameter. */
export const insightTabParam = (index) =>
  INSIGHT_TABS[index] ?? INSIGHT_TABS[0];

/**
 * Run TxKG directly. Returns 202 with { jobId } — poll it.
 * @param {object} payload - { query, limit?, maxHops? }
 */
export const query = async (payload) =>
  unwrap(await apiClient.post("/agents/txkg/query", payload));

/**
 * The ranked target table for a completed job.
 * @returns {Promise<Array>} rows with uniprotId, name, geneName, score,
 *   correctedScore, category, noveltyLabel, literatureHits, patentHits,
 *   connectionTypes, supportingSources …
 */
export const getTargets = async (jobId) =>
  unwrap(await apiClient.get("/agents/txkg/targets", { params: { jobId } }));

/**
 * Detail for one protein — a live UniProt lookup plus this job's score.
 * Backs the row-click drawer.
 */
export const getTargetDetail = async (uniprotId, jobId) =>
  unwrap(
    await apiClient.get(`/agents/txkg/targets/${uniprotId}`, {
      params: jobId ? { jobId } : undefined,
    })
  );

/**
 * AI commentary for one insight tab.
 * @param {string} tab - interpretation | recommendations | sources
 * @returns {Promise<object>} { tab, content, items }
 */
export const getInsights = async (jobId, tab = "interpretation") =>
  unwrap(await apiClient.get(`/agents/txkg/insights/${jobId}`, { params: { tab } }));

/**
 * Build the network picture. Returns 202 with { jobId } — this is a SEPARATE
 * job from the TxKG query, so it needs its own poll before the graph can be
 * read.
 * @param {object} payload - { disease, targetIds, maxNodes? }
 */
export const generateSubgraph = async (payload) =>
  unwrap(await apiClient.post("/agents/subgraph/generate", payload));

/** Nodes and edges to draw, for a completed subgraph job. */
export const getSubgraph = async (graphJobId) =>
  unwrap(await apiClient.get(`/agents/subgraph/${graphJobId}`));

/** Counts for the graph footer: relationshipsFound, drugCandidates, pathwayConnections. */
export const getSubgraphStats = async (graphJobId) =>
  unwrap(await apiClient.get(`/agents/subgraph/${graphJobId}/stats`));

/** One hop around a clicked node. */
export const exploreNode = async (graphJobId, nodeId) =>
  unwrap(await apiClient.post(`/agents/subgraph/${graphJobId}/explore`, { nodeId }));

const txkgApi = {
  INSIGHT_TABS,
  insightTabParam,
  query,
  getTargets,
  getTargetDetail,
  getInsights,
  generateSubgraph,
  getSubgraph,
  getSubgraphStats,
  exploreNode,
};

export default txkgApi;
