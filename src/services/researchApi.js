import apiClient from "./apiClient";

const unwrap = (response) => response.data?.data ?? response.data;

export const getModules = async () => unwrap(await apiClient.get("/modules"));

export const getCurrentUser = async () => unwrap(await apiClient.get("/users/me"));

export const getOnboardingStatus = async () =>
  unwrap(await apiClient.get("/users/me/onboarding-status"));

// GET /users/me/research-focus was removed: the API contract only defines
// POST for this path, so the call failed on every Welcome screen visit.
// Re-add it here if the backend publishes the GET route.

/**
 * Save the researcher's chosen therapeutic areas.
 *
 * @param {string[]} therapeuticAreas
 *
 * Writes drp_user_profiles.therapeutic_areas. Backs the welcome screen's
 * Quick Start picker. Resolves to { success, message }; callers must check
 * `success`, a 200 can still carry success: false.
 */
export const saveResearchFocus = async (therapeuticAreas) =>
  unwrap(await apiClient.post("/users/me/research-focus", { therapeuticAreas }));

/** POST /users/me/onboarding/complete with {} → { success, message }. */
export const completeOnboarding = async (payload = {}) =>
  unwrap(await apiClient.post("/users/me/onboarding/complete", payload));

/** GET /therapeutic-areas → string[] (the catalog of selectable areas). */
export const getTherapeuticAreas = async () =>
  unwrap(await apiClient.get("/therapeutic-areas"));

export const getDashboardSummary = async () =>
  unwrap(await apiClient.get("/dashboard/summary"));

export const getQuickActions = async () =>
  unwrap(await apiClient.get("/dashboard/quick-actions"));

const researchApi = {
  getModules,
  getCurrentUser,
  getOnboardingStatus,
  saveResearchFocus,
  completeOnboarding,
  getTherapeuticAreas,
  getDashboardSummary,
  getQuickActions,
};

export default researchApi;