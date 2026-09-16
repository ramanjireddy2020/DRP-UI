// Single source of truth for the API base URL.
//
// Only REACT_APP_API_URL is read. There is deliberately no hard-coded fallback:
// a silent fallback is how the previous config hid the fact that nothing was
// reading .env at all (BASE_URL read REACT_APP_API_BASE_URL, which .env never
// defined, so editing .env had no effect).
//
// Note: the gateway routes carry NO /v1 prefix. The Lambda appends /v1 itself
// when it calls the upstream app. See setupProxy.js.

const API_BASE_URL = process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "REACT_APP_API_URL is not set. Add it to .env (see .env.example) and restart " +
      "the dev server — CRA only reads env vars at startup."
  );
}

const API_CONFIG = {
  API_BASE_URL,
};

export default API_CONFIG;
