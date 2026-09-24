/**
 * Hands a subgraph to the full-size view in a new browser tab.
 *
 * A new tab starts with fresh React state and the graph is the result of a
 * job, not something the new tab can re-fetch by URL alone, so the payload is
 * parked in localStorage (shared across tabs; sessionStorage is not) under a
 * one-off key that goes in the URL.
 */

const PREFIX = "drp.subgraphView.";
// Graphs can be large; keep only the most recent few so storage doesn't fill up.
const KEEP = 5;

export const SUBGRAPH_VIEW_PATH = "/dashboard/subgraph-view";

const pruneOld = () => {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  // Keys end in a timestamp, so a plain sort is oldest-first.
  keys.sort().slice(0, Math.max(0, keys.length - KEEP + 1)).forEach((key) => {
    window.localStorage.removeItem(key);
  });
};

/** Returns false when the payload couldn't be stored (private mode, quota). */
export const openSubgraphInNewTab = ({ graph, stats, diseaseLabel }) => {
  const id = `${Date.now()}`;
  try {
    pruneOld();
    window.localStorage.setItem(PREFIX + id, JSON.stringify({ graph, stats, diseaseLabel }));
  } catch (error) {
    return false;
  }
  window.open(`${SUBGRAPH_VIEW_PATH}?id=${id}`, "_blank", "noopener");
  return true;
};

export const readSubgraphHandoff = (id) => {
  if (!id) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};
