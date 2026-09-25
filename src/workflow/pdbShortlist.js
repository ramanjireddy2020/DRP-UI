/**
 * The PDB structure shortlist ScreenSuite returns when a target maps to more
 * than one structure (e.g. 7F7W, 8C09, 8C0A for JAK2), asking the researcher
 * to pick one before docking.
 *
 * It replaced the old "ScreenSuite cannot run on this deployment" failure.
 * The shortlist is read from a structured list when the payload has one, and
 * otherwise from the message text, where PDB IDs are four characters starting
 * with a digit and containing at least one letter.
 */

const LIST_KEYS = [
  "pdbOptions", "pdb_options", "pdbCandidates", "pdb_candidates", "structures",
  "shortlist", "candidates", "options", "choices",
];

const PDB_ID = /^[1-9][A-Za-z0-9]{3}$/;

const fromList = (list) =>
  list
    .map((item) => {
      if (typeof item === "string") return PDB_ID.test(item) ? { id: item.toUpperCase(), title: null } : null;
      if (!item || typeof item !== "object") return null;
      const id = item.pdbId ?? item.pdb_id ?? item.pdb ?? item.id ?? item.structure ?? null;
      if (!id || !PDB_ID.test(String(id))) return null;
      return {
        id: String(id).toUpperCase(),
        title: item.title ?? item.name ?? item.description ?? null,
        resolution: item.resolution ?? item.resolution_angstrom ?? null,
        method: item.method ?? item.experimental_method ?? null,
      };
    })
    .filter(Boolean);

const fromText = (text) => {
  const value = String(text ?? "");
  if (!/\bpdb\b|structure/i.test(value)) return [];
  const ids = value.match(/\b[1-9][A-Z0-9]{3}\b/g) ?? [];
  return [...new Set(ids.filter((id) => /[A-Z]/.test(id)))].map((id) => ({ id, title: null }));
};

/** @returns {{ id, title, resolution?, method? }[]} — empty when there is no shortlist */
export const readPdbShortlist = (source) => {
  if (!source) return [];
  if (typeof source === "string") return fromText(source);
  if (Array.isArray(source)) return fromList(source);
  if (typeof source === "object") {
    for (const key of LIST_KEYS) {
      if (Array.isArray(source[key])) {
        const list = fromList(source[key]);
        if (list.length) return list;
      }
    }
    for (const key of ["result", "data", "detail"]) {
      const nested = readPdbShortlist(source[key]);
      if (nested.length) return nested;
    }
    return fromText(source.message ?? source.error ?? source.content ?? "");
  }
  return [];
};

export const rcsbUrl = (id) => `https://www.rcsb.org/structure/${id}`;
