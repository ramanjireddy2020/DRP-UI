/**
 * Turning what the researcher ticked into what the next agent can use.
 *
 * The collection is explicit about this and it is easy to get wrong:
 *
 *   ⚠️ Send gene names (JAK2), not UniProt accessions — PubMed text never
 *      contains O60674.
 *
 * The TxKG table is keyed on UniProt accessions (that is the column the user
 * sees, and the detail endpoint takes one), so `selectedTargets` holds
 * accessions. Translating them happens here, at the hand-off boundary, rather
 * than by changing what the table stores — the table genuinely needs the
 * accession and LitMineX genuinely needs the symbol.
 */

/** A gene symbol is short and has no whitespace: JAK2, STAT3, SGLT2. */
const looksLikeSymbol = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 15 &&
  !/\s/.test(value.trim());

/** A UniProt accession: O60674, P40763, Q13013. */
export const looksLikeAccession = (value) =>
  typeof value === "string" && /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/.test(value.trim());

/**
 * Best available gene symbol for one normalised target row.
 *
 * Order matters. `geneName` is the only field guaranteed to be a symbol;
 * `name` is a symbol only when normalizeTarget had a geneName to put there,
 * and falls back to the protein's long name otherwise — sending
 * "Tyrosine-protein kinase JAK2" as a target id would return nothing.
 */
export const geneNameForTarget = (target) => {
  if (!target) return null;

  const candidates = [target.geneName, target.gene_name, target.name, target.label];

  for (const candidate of candidates) {
    if (looksLikeSymbol(candidate) && !looksLikeAccession(candidate)) {
      return String(candidate).trim();
    }
  }

  return null;
};

/**
 * Map selected UniProt accessions onto gene names using the loaded target rows.
 *
 * @param {string[]} selectedIds - what the checkboxes hold (accessions)
 * @param {object[]} targets     - normalised rows from normalizeTxkgResult
 * @returns {{ targetIds: string[], unresolved: string[] }}
 *
 * `unresolved` lists selections no symbol could be found for. They are still
 * included in targetIds — dropping a target the user explicitly ticked would be
 * worse than sending an accession the agent may not match — but the caller can
 * warn about them.
 */
export const toGeneNames = (selectedIds, targets) => {
  const ids = Array.isArray(selectedIds) ? selectedIds.filter(Boolean) : [];
  if (!ids.length) return { targetIds: [], unresolved: [] };

  const rows = Array.isArray(targets) ? targets : [];
  const byId = new Map();
  rows.forEach((t) => {
    if (t?.id) byId.set(String(t.id), t);
    // TxKG targets use uniprotId (not id) as their primary key
    if (t?.uniprotId) byId.set(String(t.uniprotId), t);
  });

  const targetIds = [];
  const unresolved = [];

  ids.forEach((id) => {
    const key = String(id);

    // Already a symbol — a custom target added by hand arrives this way.
    if (!looksLikeAccession(key) && looksLikeSymbol(key)) {
      targetIds.push(key);
      return;
    }

    const symbol = geneNameForTarget(byId.get(key));
    if (symbol) {
      targetIds.push(symbol);
    } else {
      targetIds.push(key);
      unresolved.push(key);
    }
  });

  // De-duplicate: two accessions can map to the same symbol.
  return { targetIds: [...new Set(targetIds)], unresolved };
};

/**
 * The `selections` body for POST /sessions/{id}/steps.
 *
 * Shaped per module because build_params() on the backend reads a different key
 * for each: LitMineX wants targetIds, ScreenSuite wants compounds, NovSearch
 * wants the drug/target/disease triple.
 */
/**
 * One compound for ScreenSuite. A ChEMBL ID or PubChem CID goes as an
 * `identifier`, not a `drug_name`: sent as a name, CHEMBL113442 failed the
 * name lookup and the run stopped with "Name at least one compound to
 * screen" (testing 2026-10-16).
 */
export const toCompound = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^CHEMBL\d+$/i.test(text)) return { identifier: text.toUpperCase(), identifierType: "chembl" };
  const cid = text.match(/^(?:CID[:\s]*)?(\d+)$/i);
  if (cid) return { identifier: cid[1], identifierType: "pubchem" };
  return { drug_name: text };
};

/** A compound's display name: its drug name, else its identifier. */
export const compoundLabel = (c) => (typeof c === "string" ? c : c?.drug_name ?? c?.identifier ?? null);

export const buildSelections = (moduleKey, picks = {}) => {
  switch (moduleKey) {
    case "litminex":
      return { targetIds: picks.targetIds ?? [] };

    case "curatex":
      // The UniProt accession from the TxKG table goes with the symbol. The
      // symbol alone failed for targets whose TxKG name is a UniProt entry
      // name, e.g. SODM (gene SOD2): "No reviewed human UniProt entry matched
      // 'SODM'" (testing 2026-10-16).
      return {
        targetIds: picks.targetIds ?? [],
        ...(Array.isArray(picks.uniprotIds) && picks.uniprotIds.length ? { uniprotIds: picks.uniprotIds } : {}),
      };

    case "screensuite":
      // One or more proteins × one or more compounds. `target` (the first
      // protein) is kept for payloads that read a single target.
      return {
        target: picks.target ?? picks.targets?.[0] ?? null,
        ...(Array.isArray(picks.targets) && picks.targets.length ? { targets: picks.targets } : {}),
        // The staged backend takes compounds as [{ drug_name }] or, for a
        // structure ID, [{ identifier }]; see toCompound.
        compounds: (picks.compounds ?? [])
          .map((c) =>
            typeof c === "string"
              ? toCompound(c)
              : c?.drug_name || c?.identifier
              ? c
              : c?.name
              ? toCompound(c.name)
              : null
          )
          .filter(Boolean),
        ...(picks.pdbId ? { pdbId: picks.pdbId } : {}),
        ...(picks.structures ? { structures: picks.structures } : {}),
      };

    case "novsearch":
      return {
        target: picks.target ?? null,
        disease: picks.disease ?? null,
        drug: picks.drug ?? null,
        ...(picks.candidateId ? { candidateId: picks.candidateId } : {}),
        ...(picks.dockingId ? { dockingId: picks.dockingId } : {}),
      };

    default:
      return picks;
  }
};

const selections = {
  toGeneNames,
  geneNameForTarget,
  looksLikeAccession,
  buildSelections,
};

export default selections;
