import apiClient from "./apiClient";

const unwrap = (response) => response.data?.data ?? response.data;

export const getModules = async () => unwrap(await apiClient.get("/modules"));

export const getCurrentUser = async () => unwrap(await apiClient.get("/users/me"));

export const getOnboardingStatus = async () =>
  unwrap(await apiClient.get("/users/me/onboarding-status"));

export const getResearchFocus = async () =>
  unwrap(await apiClient.get("/users/me/research-focus"));

/**
 * Save the researcher's chosen therapeutic areas.
 *
 * @param {string[]} therapeuticAreas
 *
 * Writes drp_user_profiles.therapeutic_areas. Backs the welcome screen's
 * Quick Start picker, which was a hardcoded SPECIALTIES list that saved
 * nowhere.
 */
export const saveResearchFocus = async (therapeuticAreas) =>
  unwrap(await apiClient.post("/users/me/research-focus", { therapeuticAreas }));

export const completeOnboarding = async (payload) =>
  unwrap(await apiClient.post("/users/me/onboarding/complete", payload));

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
  getResearchFocus,
  saveResearchFocus,
  completeOnboarding,
  getTherapeuticAreas,
  getDashboardSummary,
  getQuickActions,
};

export default researchApi;