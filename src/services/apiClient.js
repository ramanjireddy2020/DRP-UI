import axios from "axios";
import { fetchAuthSession, signOut } from "@aws-amplify/auth";
import API_CONFIG from "../apiconfig";

const apiClient = axios.create({
  baseURL: API_CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  let token = null;

  try {
    const { tokens } = await fetchAuthSession();
    // Must be the ID token, not the access token: the API Gateway JWT authorizer
    // validates `aud` against the Cognito app client, and only ID tokens carry
    // `aud`. An access token is rejected with a 401.
    token = tokens?.idToken?.toString() ?? null;
  } catch (error) {
    token = null;
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Where to send the user when their session is gone. Kept as a module-level
 * assignment rather than a router import so this file stays free of React
 * dependencies and can be unit-tested.
 */
let onUnauthorized = () => {
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

let redirecting = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    // A 401 means the ID token is missing, expired or rejected. Amplify refreshes
    // on its own, so reaching here means the session is genuinely unusable —
    // clear it and get out, rather than letting every screen render its own
    // "request failed" message.
    if (status === 401 && !redirecting) {
      redirecting = true;
      try {
        await signOut();
      } catch (signOutError) {
        // Already signed out, or Amplify has no session to clear.
      }
      onUnauthorized();
    }

    const responseData = error.response?.data;
    const responseMessage =
      responseData?.message || responseData?.error || responseData?.detail;

    const message =
      responseMessage ||
      (error.response
        ? `Backend request failed (${error.response.status}).`
        : "Unable to reach the backend.");

    return Promise.reject(Object.assign(error, { userMessage: message, status }));
  }
);

export default apiClient;
