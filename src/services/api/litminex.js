import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 6 — LitMineX literature mining, and the article endpoints the detail
 * panel and article chat use.
 *
 * Note the two different owners: the `/agents/litminex/...` paths are scoped to
 * a job, while `/articles/...` are global — an article saved by any job is
 * readable by id.
 */

/**
 * Run LitMineX directly. Returns 202 with { jobId }.
 * @param {object} payload - { targetIds, query?, maxResults? }
 *
 * targetIds must be gene names (JAK2), not UniProt accessions.
 */
export const query = async (payload) =>
  unwrap(await apiClient.post("/agents/litminex/query", payload));

/**
 * Ranked, paginated articles for a completed job.
 * @returns {Promise<object>} { totalArticles, page, totalPages, items:
 *   [{ id, title, year, confidenceScore, foundKeywords }] }
 */
export const getResults = async (jobId, params) =>
  unwrap(await apiClient.get(`/agents/litminex/${jobId}/results`, { params }));

/** "Article Relevance" panel — { tab, content, items }. */
export const getInsights = async (jobId) =>
  unwrap(await apiClient.get(`/agents/litminex/${jobId}/insights`));

/** Row-hover snippet for one article. */
export const getArticlePreview = async (jobId, articleId) =>
  unwrap(await apiClient.get(`/agents/litminex/${jobId}/results/${articleId}/preview`));

/**
 * Add a target the knowledge graph did not find.
 *
 * These two live under /agents/litminex even though the UI exposes them on the
 * TxKG target screen — the collection confirms LitMineX owns them, which fits:
 * the target is being added for the literature search that comes next.
 */
export const addCustomTarget = async (targetName) =>
  unwrap(await apiClient.post("/agents/litminex/targets/custom", { targetName }));

export const getCustomTargets = async () =>
  unwrap(await apiClient.get("/agents/litminex/targets/custom"));

/* -------------------------------------------------------------------------- */
/* Articles — global, not job-scoped                                          */
/* -------------------------------------------------------------------------- */

/** Full article: authors, year, abstract, keywords, pmcLink. */
export const getArticle = async (articleId) =>
  unwrap(await apiClient.get(`/articles/${articleId}`));

/** "Open in PMC" — { url, provider }. */
export const getArticlePmcLink = async (articleId) =>
  unwrap(await apiClient.get(`/articles/${articleId}/pmc-link`));

/** Bookmark, optionally filing it under a project. */
export const saveArticle = async (articleId, projectId) =>
  unwrap(await apiClient.post(`/articles/${articleId}/save`, { projectId: projectId ?? null }));

/** Q&A over one article's abstract — { role, content, citations }. */
export const askArticle = async (articleId, message) =>
  unwrap(await apiClient.post(`/articles/${articleId}/chat`, { message }));

/** Past Q&A on this article. */
export const getArticleChatHistory = async (articleId) =>
  unwrap(await apiClient.get(`/articles/${articleId}/chat/history`));

const litminexApi = {
  query,
  getResults,
  getInsights,
  getArticlePreview,
  addCustomTarget,
  getCustomTargets,
  getArticle,
  getArticlePmcLink,
  saveArticle,
  askArticle,
  getArticleChatHistory,
};

export default litminexApi;
