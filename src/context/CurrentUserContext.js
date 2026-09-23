import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAuthSession } from "@aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { getCurrentUser as getUserProfile } from "../services/researchApi";

/**
 * The signed-in researcher, fetched once from GET /users/me.
 *
 * This exists because "Dr. Priya" was hardcoded in about twenty-five places —
 * every chat bubble in all five phase screens, the sidebar, the welcome screen,
 * the share dialog. Threading a prop down six levels to reach a chat bubble
 * would have been worse than a context, and the value changes once per session.
 *
 * The provider mounts once, above the router, so it is NOT remounted by a
 * sign-in. It re-fetches when Login calls refresh() and when Amplify's Hub
 * reports signedIn / signedOut, so logging out and back in as someone else
 * never shows the previous researcher's name.
 *
 * Nothing here blocks rendering. A screen that has not got the profile yet
 * shows the neutral fallback rather than an empty bubble or a spinner, because
 * the name is chrome and the research content around it is not.
 */

const FALLBACK_NAME = "Researcher";

const CurrentUserContext = createContext({
  user: null,
  loading: false,
  error: null,
  displayName: FALLBACK_NAME,
  chatLabel: `${FALLBACK_NAME.toUpperCase()} (YOU)`,
  initials: "",
  refresh: () => {},
});

/**
 * "Dr. Priya Sharma" → "PS". Used for the avatar and the share list.
 */
const initialsFor = (name) => {
  const words = String(name ?? "")
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export const CurrentUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);

    const load = async () => {
      // This provider wraps the router, so it also mounts on /login, where
      // there is no session yet. Asking for the profile there is a guaranteed
      // 401, and the client's 401 handler signs out and navigates — so the
      // check has to happen before the request, not after it.
      let signedIn = false;
      try {
        const { tokens } = await fetchAuthSession();
        signedIn = Boolean(tokens?.idToken);
      } catch (sessionError) {
        signedIn = false;
      }

      if (!mounted) return;

      if (!signedIn) {
        // Not an error state: the screens fall back to "Researcher" until the
        // user signs in, at which point refresh() / the Hub listener retries.
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile();
        if (!mounted) return;
        setUser(profile);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        // A 401 is already handled globally by the response interceptor, so
        // reaching here means the profile is unavailable for another reason.
        // The app keeps working on the fallback name.
        setError(err?.userMessage || err?.message || "Could not load your profile.");
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  /*
   * Follow Cognito session changes. signedOut clears the profile at once so
   * nothing renders the old name while the next account signs in; signedIn
   * (and a refreshed token for a different user) re-fetches GET /users/me.
   */
  useEffect(() => {
    const stop = Hub.listen("auth", ({ payload }) => {
      switch (payload?.event) {
        case "signedOut":
          setUser(null);
          setError(null);
          refresh();
          break;
        case "signedIn":
          setUser(null);
          refresh();
          break;
        default:
          break;
      }
    });

    return stop;
  }, [refresh]);

  const value = useMemo(() => {
    const name = user?.name?.trim() || FALLBACK_NAME;
    return {
      user,
      loading,
      error,
      displayName: name,
      /** The form the chat bubbles use: "DR. PRIYA SHARMA (YOU)". */
      chatLabel: `${name.toUpperCase()} (YOU)`,
      initials: initialsFor(name),
      role: user?.role ?? null,
      email: user?.email ?? null,
      avatarUrl: user?.avatarUrl || null,
      refresh,
    };
  }, [user, loading, error, refresh]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
};

export const useCurrentUser = () => useContext(CurrentUserContext);

export default CurrentUserContext;
