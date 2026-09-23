import apiClient from "../apiClient";
import unwrap from "../unwrap";

/**
 * Folder 10 — ProjectsPage + ProjectDetails.
 *
 * Status vocabulary is the API's own, Title Case: "Active" | "On Hold" | "Review".
 * The UI must send exactly these — "ON HOLD" is not the same value.
 */
export const PROJECT_STATUSES = ["Active", "On Hold", "Review"];

/**
 * Paginated project list.
 * @param {object} params - { search?, status?, page? }
 * @returns {Promise<object>} { items: [{ id, name, disease, module, status,
 *   updatedAt }], totalCount, page, totalPages }
 */
export const listProjects = async (params) =>
  unwrap(await apiClient.get("/projects", { params }));

/**
 * @param {object} payload - { name, disease, module, status }
 * @returns {Promise<object>} the created project, including its `id`
 */
export const createProject = async (payload) =>
  unwrap(await apiClient.post("/projects", payload));

/** One project — { id, name, disease, module, status }. */
export const getProject = async (projectId) =>
  unwrap(await apiClient.get(`/projects/${projectId}`));

/**
 * Rename or change status.
 * @param {object} payload - { name?, status? }
 */
export const updateProject = async (projectId, payload) =>
  unwrap(await apiClient.patch(`/projects/${projectId}`, payload));

/** Deletes the project; its sessions are kept and unlinked. */
export const deleteProject = async (projectId) =>
  unwrap(await apiClient.delete(`/projects/${projectId}`));

/**
 * Results filed under this project.
 * @returns {Promise<Array>} [{ id, resultType, sessionId, payload }]
 */
export const getProjectItems = async (projectId) =>
  unwrap(await apiClient.get(`/projects/${projectId}/items`));

/**
 * File a session result into the project.
 * @param {object} payload - { sessionId, resultId, resultType }
 * @returns {Promise<object>} { success, projectName, itemId }
 */
export const addProjectResult = async (projectId, payload) =>
  unwrap(await apiClient.post(`/projects/${projectId}/results`, payload));

/** Accept the paginated envelope or a bare array. */
export const readProjectList = (payload) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];
  return {
    items,
    totalCount: Number(payload?.totalCount ?? items.length) || items.length,
    page: Number(payload?.page) || 1,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

const projectsApi = {
  PROJECT_STATUSES,
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectItems,
  addProjectResult,
  readProjectList,
};

export default projectsApi;
