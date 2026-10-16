/**
 * Secrets masked out of anything the backend sends, before it reaches the
 * screen.
 *
 * Testing (2026-10-16) found the OpenAI API key shown inside a NovSearch
 * novelty-analysis message: a provider error passed through to the client.
 * The backend must stop sending it; this is the browser's backstop. Only
 * strings shaped like credentials are touched.
 */
const PATTERNS = [
  // OpenAI-style keys: sk-..., sk-proj-...
  /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{16,}/g,
  // Anthropic keys
  /\bsk-ant-[A-Za-z0-9_-]{16,}/g,
  // Authorization headers
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi,
  // AWS access key ids
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
];

// key=..., "api_key": "...", token: ...
const ASSIGNMENT = /\b(api[_-]?key|access[_-]?token|secret|password|token)(["']?\s*[:=]\s*["']?)([A-Za-z0-9._~+/-]{16,})/gi;

const MASK = "[redacted]";

export const redactSecrets = (text) => {
  if (typeof text !== "string" || text.length < 16) return text;
  let out = text;
  PATTERNS.forEach((pattern) => {
    out = out.replace(pattern, MASK);
  });
  return out.replace(ASSIGNMENT, (match, name, sep) => `${name}${sep}${MASK}`);
};

/** The same over a parsed JSON body: every string value, at any depth. */
export const redactDeep = (value, depth = 0) => {
  if (typeof value === "string") return redactSecrets(value);
  if (!value || typeof value !== "object" || depth > 40) return value;
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const r = redactDeep(item, depth + 1);
      if (r !== item) changed = true;
      return r;
    });
    return changed ? next : value;
  }
  let changed = false;
  const next = {};
  Object.keys(value).forEach((key) => {
    const r = redactDeep(value[key], depth + 1);
    if (r !== value[key]) changed = true;
    next[key] = r;
  });
  return changed ? next : value;
};

export default redactSecrets;
