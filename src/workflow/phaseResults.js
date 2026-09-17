/**
 * Mapping each module's results endpoint onto the props its phase component
 * already reads.
 *
 * The rule followed here is the one in the integration notes: keep the
 * fixture's field names as the contract and normalise in the service layer, not
 * in JSX. Every function below takes a raw API payload and returns the shape
 * the existing render code expects, so the 5,000-odd lines of phase markup did
 * not have to be rewritten.
 *
 * TxKG is deliberately absent: its normaliser lives in txkgResult.js and reads
 * the generic /agents/jobs/{jobId}/result, which was written and verified
 * against a real response.
 */

const pct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  // The table's confidenceColor() does parseInt on this string, so a trailing
  // "%" is fine but the number has to come first.
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
};

const num = (value, digits = 3) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
};

/* -------------------------------------------------------------------------- */
/* LitMineX                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /agents/litminex/{jobId}/results
 *   { totalArticles, page, totalPages, items:
 *     [{ id, title, year, confidenceScore, foundKeywords }] }
 *
 * The fixture had `confidence` as a percent string, `keywords` as a comma
 * string, and an `author` the list endpoint does not return — authors only
 * come from GET /articles/{id}, so the field is left null and the detail panel
 * fills it in when opened.
 */
export const normalizeLitminexResults = (payload) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  const articles = items
    .map((a) => {
      if (!a) return null;
      const id = a.id ?? a.articleId ?? a.pmid ?? null;
      if (!id) return null;

      const keywords = Array.isArray(a.foundKeywords)
        ? a.foundKeywords
        : Array.isArray(a.keywords)
        ? a.keywords
        : [];

      return {
        id,
        title: a.title ?? "Untitled",
        year: a.year ?? "—",
        confidence: pct(a.confidenceScore ?? a.confidence_score ?? a.confidence),
        confidenceScore: Number(a.confidenceScore ?? a.confidence_score) || null,
        keywords: keywords.join(", "),
        keywordList: keywords,
        // Not in the list payload; GET /articles/{id} supplies it on demand.
        author: a.authors ?? a.author ?? null,
        abstract: a.abstract ?? null,
        pmcLink: a.pmcLink ?? a.pmc_link ?? null,
      };
    })
    .filter(Boolean);

  return {
    hasData: articles.length > 0,
    articles,
    total: Number(payload?.totalArticles ?? payload?.total ?? articles.length) || articles.length,
    page: Number(payload?.page) || 1,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

/** GET /agents/litminex/{jobId}/insights → { tab, content, items } */
export const normalizeInsights = (payload) => ({
  tab: payload?.tab ?? null,
  content: payload?.content ?? null,
  items: Array.isArray(payload?.items) ? payload.items : [],
});

/* -------------------------------------------------------------------------- */
/* CurateX                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The profile screen's fields, in render order, mapped to the criterion names
 * the API uses.
 *
 * The old fixture was a flat object with these exact keys; the API returns
 * `criteria: [{ name, value, weight }]`. Matching on a normalised name keeps
 * the screen's layout while letting the backend rename or reorder.
 */
const PROFILE_FIELDS = [
  { key: "indication", label: "Indication", aliases: ["indication", "disease"] },
  { key: "moa", label: "Mechanism of action", aliases: ["moa", "mechanismofaction", "mechanism"] },
  { key: "route", label: "Route", aliases: ["route", "routeofadministration"] },
  { key: "molecularWeight", label: "Molecular weight", aliases: ["molecularweight", "mw"] },
  { key: "bioavailability", label: "Bioavailability", aliases: ["bioavailability", "bioavail"] },
  { key: "halfLife", label: "Half-life", aliases: ["halflife", "half_life", "t12"] },
  { key: "logP", label: "LogP", aliases: ["logp"] },
  { key: "solubility", label: "Solubility", aliases: ["solubility"] },
  {
    key: "plasmaProteinBinding",
    label: "Plasma protein binding",
    aliases: ["plasmaproteinbinding", "ppb", "proteinbinding"],
  },
];

const squash = (value) => String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "");

/**
 * GET /agents/curatex/{jobId}/profile
 *   { target, profile, criteria: [{ name, value, weight }], ligandCount,
 *     editable, warnings }
 *
 * Returns both the flat object the profile form binds to and the raw criteria,
 * because the weights have to go back out in POST /agents/curatex/compounds and
 * the flat form would lose them.
 */
export const normalizeCuratexProfile = (payload) => {
  const criteria = Array.isArray(payload?.criteria) ? payload.criteria : [];

  const byName = new Map(criteria.map((c) => [squash(c?.name), c]));

  const profileData = {};

  /**
   * Weights keyed BY FORM FIELD, because that is how the profile table reads
   * them (`weights[key]` where key comes from Object.entries(profileData)).
   */
  const weights = {};

  /** The same weights keyed by the API's own criterion names, for the POST. */
  const apiWeights = {};

  /** form field → API criterion name, so edits can be translated back. */
  const fieldToCriterion = {};

  PROFILE_FIELDS.forEach((field) => {
    const hit =
      byName.get(squash(field.key)) ??
      field.aliases.map((a) => byName.get(a)).find(Boolean) ??
      null;

    profileData[field.key] = hit?.value ?? "";

    if (hit) {
      fieldToCriterion[field.key] = hit.name;
      if (hit.weight != null) {
        weights[field.key] = hit.weight;
        apiWeights[hit.name] = hit.weight;
      }
    }
  });

  // Anything the backend sent that the form has no row for still has to reach
  // the compounds call, or the researcher's weighting is silently dropped.
  criteria.forEach((c) => {
    if (c?.name != null && c.weight != null && !(c.name in apiWeights)) {
      apiWeights[c.name] = c.weight;
      weights[c.name] = c.weight;
      fieldToCriterion[c.name] = c.name;
    }
  });

  return {
    hasData: criteria.length > 0 || Boolean(payload?.target),
    target: payload?.target ?? null,
    profileData,
    criteria,
    weights,
    apiWeights,
    fieldToCriterion,
    ligandCount: payload?.ligandCount ?? null,
    editable: payload?.editable !== false,
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    fields: PROFILE_FIELDS,
  };
};

/**
 * Translate the profile form's weights back to the key names
 * POST /agents/curatex/compounds expects.
 *
 * Without this the researcher's edits never reach the scorer: the form is keyed
 * on its own field names (molecularWeight, halfLife) while the API keys on
 * whatever `criteria[].name` it sent, and a parameter the researcher added by
 * hand exists in neither map.
 *
 * Values are passed through in the API's own numeric scale — the profile
 * returns e.g. `weight: 1.0` while the table renders a "%" suffix, and
 * reinterpreting the number to match the suffix would change what is scored.
 */
export const toApiWeights = (formWeights, profile) => {
  if (!formWeights || typeof formWeights !== "object") return profile?.apiWeights ?? {};

  const map = profile?.fieldToCriterion ?? {};
  const out = {};

  Object.entries(formWeights).forEach(([key, value]) => {
    if (value == null || value === "") return;
    // An added parameter has no criterion name yet, so its own key is used.
    const apiName = map[key] ?? key;
    const n = Number(value);
    out[apiName] = Number.isFinite(n) ? n : value;
  });

  return out;
};

export const CURATEX_PROFILE_FIELDS = PROFILE_FIELDS;

/**
 * GET /agents/curatex/{jobId}/results
 *   { totalCompounds, page, totalPages, target, items: [{ name, score, … }] }
 *
 * The fixture carried `matchedProps` / `mismatchedProps` as comma strings. The
 * API's example only shows name and score, so those are built from whatever
 * match detail comes back and left empty rather than invented — an empty
 * column is honest, a fabricated one is not.
 */
export const normalizeCuratexResults = (payload) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  const compounds = items
    .map((c, index) => {
      if (!c) return null;
      const name = c.name ?? c.compound ?? c.drug ?? null;
      if (!name) return null;

      const matched = c.matchedProps ?? c.matched_props ?? c.matched ?? [];
      const mismatched = c.mismatchedProps ?? c.mismatched_props ?? c.mismatched ?? [];
      const asText = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

      const rawScore = c.score ?? c.matchScore ?? c.match_score;
      const scoreNum = Number(rawScore);

      return {
        rank: c.rank ?? index + 1,
        name,
        matchedProps: asText(matched),
        mismatchedProps: asText(mismatched),
        // The API's example score is 0.82 while the fixture showed 93.5, so a
        // 0–1 score is scaled to a percentage and anything larger is left
        // alone.
        score: Number.isFinite(scoreNum)
          ? (scoreNum <= 1 ? scoreNum * 100 : scoreNum).toFixed(1)
          : "—",
        rawScore: Number.isFinite(scoreNum) ? scoreNum : null,
        smiles: c.smiles ?? null,
        chemblId: c.chemblId ?? c.chembl_id ?? null,
      };
    })
    .filter(Boolean);

  return {
    hasData: compounds.length > 0,
    compounds,
    target: payload?.target ?? null,
    total: Number(payload?.totalCompounds ?? payload?.total ?? compounds.length) || compounds.length,
    page: Number(payload?.page) || 1,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

/* -------------------------------------------------------------------------- */
/* ScreenSuite                                                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /agents/screensuite/{jobId}/hits
 *   [{ mode, compound, protein, affinityKcalPerMol, outputFile }]
 *
 * The fixture also carried proteinLigand / proteinValue / ligand, which were
 * PyMOL output file stems. Only `outputFile` exists in the API, so those
 * columns are derived from it where possible and left blank otherwise.
 *
 * In practice this normaliser will rarely run: docking cannot complete on this
 * deployment.
 */
export const normalizeDockingHits = (payload) => {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

  const hits = rows
    .map((h, index) => {
      if (!h) return null;
      const compound = h.compound ?? h.ligand ?? null;
      const protein = h.protein ?? h.target ?? null;
      if (!compound && !protein) return null;

      return {
        id: h.id ?? index + 1,
        protein: protein ?? "—",
        mode: String(h.mode ?? 1),
        affinity: num(h.affinityKcalPerMol ?? h.affinity_kcal_per_mol ?? h.affinity),
        rawAffinity: Number(h.affinityKcalPerMol ?? h.affinity_kcal_per_mol ?? h.affinity) || null,
        ligand: compound ?? "—",
        outputFile: h.outputFile ?? h.output_file ?? "",
        // Derived only when the API gave a file to derive from.
        proteinLigand: h.outputFile ? String(h.outputFile).replace(/\.[^.]+$/, "") : "",
        proteinValue: "",
      };
    })
    .filter(Boolean);

  return { hasData: hits.length > 0, hits };
};

/* -------------------------------------------------------------------------- */
/* NovSearch                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * GET /agents/novsearch/{jobId}/report
 *   { jobId, target, disease, assessment, recommendations,
 *     patents: [{ patentId, title, relevance }], totalPatents }
 *
 * The fixture's patent rows used `id` and a relevance string; the API uses
 * `patentId` and a float.
 */
export const normalizeNoveltyReport = (payload) => {
  const rows = Array.isArray(payload?.patents) ? payload.patents : [];

  const patents = rows
    .map((p) => {
      if (!p) return null;
      const id = p.patentId ?? p.patent_id ?? p.id ?? null;
      if (!id) return null;
      const relevance = Number(p.relevance);
      return {
        id,
        title: p.title ?? "Untitled patent",
        relevance: Number.isFinite(relevance) ? relevance.toFixed(2) : "—",
        rawRelevance: Number.isFinite(relevance) ? relevance : null,
        assignee: p.assignee ?? null,
        description: p.description ?? p.abstract ?? null,
      };
    })
    .filter(Boolean);

  return {
    hasData: patents.length > 0 || Boolean(payload?.assessment),
    target: payload?.target ?? null,
    disease: payload?.disease ?? null,
    assessment: payload?.assessment ?? null,
    recommendations: Array.isArray(payload?.recommendations) ? payload.recommendations : [],
    patents,
    total: Number(payload?.totalPatents ?? patents.length) || patents.length,
  };
};

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /agents/jobs/{jobId}/result for a "SaaS Pipeline" run
 *   { jobId, module, kind: "pipeline.run",
 *     result: { stages: [{ module, status }], summary } }
 *
 * A failing stage does not stop the run, so the stage list is the only place
 * that says what actually happened — a single job status of "completed" can
 * still mean 4 of 5.
 */
export const normalizePipelineResult = (payload) => {
  const r = payload?.result && typeof payload.result === "object" ? payload.result : payload;
  const stages = Array.isArray(r?.stages) ? r.stages : [];

  const rows = stages.map((s) => ({
    module: s?.module ?? "—",
    status: s?.status ?? "Unknown",
    failed: String(s?.status ?? "").toLowerCase() === "failed",
    summary: s?.summary ?? null,
  }));

  return {
    hasData: rows.length > 0,
    stages: rows,
    summary: r?.summary ?? null,
    completed: rows.filter((s) => !s.failed).length,
    total: rows.length,
  };
};

const phaseResults = {
  normalizeLitminexResults,
  normalizeInsights,
  normalizeCuratexProfile,
  toApiWeights,
  normalizeCuratexResults,
  normalizeDockingHits,
  normalizeNoveltyReport,
  normalizePipelineResult,
  CURATEX_PROFILE_FIELDS,
};

export default phaseResults;
