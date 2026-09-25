import { readDefinitions } from "./txkgResult";
import { readPdbShortlist } from "./pdbShortlist";

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

/** The page size the UI asks for on the paginated tables. */
export const RESULTS_PAGE_SIZE = 10;

/**
 * How many rows the server actually put on each page.
 *
 * The request carries pageSize, but the live LitMineX example came back with
 * 20 rows and no pageSize field, so the value asked for cannot be trusted for
 * the row offset. A page before the last is always full, so its row count is
 * the page size; on the last page the size is recovered from the total.
 */
const derivePageSize = (payload, rowCount, requested) => {
  const explicit = Number(payload?.pageSize);
  if (explicit > 0) return explicit;

  const page = Number(payload?.page) || 1;
  const totalPages = Number(payload?.totalPages) || 1;
  const total = Number(payload?.totalArticles ?? payload?.totalCompounds ?? payload?.total);

  if (page < totalPages && rowCount > 0) return rowCount;
  // On the last page, the size asked for is right whenever it agrees with the
  // server's own page count.
  if (requested > 0 && Number.isFinite(total) && Math.ceil(total / requested) === totalPages) {
    return requested;
  }
  if (totalPages > 1 && Number.isFinite(total)) {
    const size = (total - rowCount) / (totalPages - 1);
    if (Number.isInteger(size) && size > 0) return size;
  }
  return requested || rowCount || RESULTS_PAGE_SIZE;
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
export const normalizeLitminexResults = (payload, { pageSize: requested } = {}) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  const page = Number(payload?.page) || 1;
  const pageSize = derivePageSize(payload, items.filter(Boolean).length, requested);

  const articles = items
    .filter(Boolean)
    .map((a, index) => {
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
        // The "#" column: numbering continues across pages instead of
        // restarting at 1.
        position: (page - 1) * pageSize + index + 1,
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
    page,
    pageSize,
    totalPages: Number(payload?.totalPages) || 1,
  };
};

/**
 * GET /agents/litminex/{jobId}/results/{articleId}/preview
 *   { id, title, snippet, confidenceScore, foundKeywords }
 */
export const normalizeArticlePreview = (payload) => ({
  id: payload?.id ?? null,
  title: payload?.title ?? null,
  snippet: payload?.snippet ?? null,
  confidence: payload?.confidenceScore != null ? pct(payload.confidenceScore) : null,
  keywords: Array.isArray(payload?.foundKeywords) ? payload.foundKeywords : [],
});

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

const humanize = (name) =>
  String(name ?? "")
    .replace(/[_-]+/g, " ")
    // molecularWeight → Molecular Weight; acronyms like hERG or LogP stay as
    // written.
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2")
    .replace(/^[a-z](?![A-Z])/, (c) => c.toUpperCase())
    .trim();

/**
 * GET /agents/curatex/{jobId}/profile
 *   { target, profile, criteria: [{ name, value, weight }], ligandCount,
 *     editable, warnings }
 *
 * The rows are the criteria exactly as returned, in the API's order. This used
 * to be a fixed list of nine form fields: criteria outside that list were
 * hidden (while their weights were still sent), and fields the API did not
 * return showed up as blank rows. PROFILE_FIELDS now only supplies a friendlier
 * label when a criterion name matches one of them.
 *
 * Row keys are the matching form field's key (so edits made before this change
 * keep their meaning) or the criterion's own name. `fieldToCriterion` maps each
 * row key back to the API's name for POST /agents/curatex/compounds.
 */
/**
 * The profile's criteria as [{ name, value, weight }], wherever they are.
 *
 * Testing got a profile response but the table said "The profile returned no
 * criteria": only a top-level `criteria[]` with `name` was read. The list is
 * also looked for under profile / result / data, under parameters /
 * properties / rows, and as a { criterionName: { value, weight } } map, with
 * the common alternative field names.
 */
const CRITERIA_KEYS = ["criteria", "parameters", "properties", "rows", "items", "profile"];

const criterionRow = (c, fallbackName) => {
  if (c == null) return null;
  if (typeof c !== "object") return { name: fallbackName, value: c, weight: null };
  const name = c.name ?? c.criterion ?? c.label ?? c.parameter ?? c.property ?? c.key ?? fallbackName;
  const value =
    c.value ?? c.target ?? c.targetValue ?? c.target_value ?? c.range ?? c.goodValue ?? c.good_value ??
    c.ideal ?? c.criterionValue ?? c.criterion_value ?? "";
  const weight = c.weight ?? c.defaultWeight ?? c.default_weight ?? null;
  return name == null || name === "" ? null : { ...c, name: String(name), value, weight };
};

const findCriteria = (payload, depth = 0) => {
  if (!payload || typeof payload !== "object" || depth > 3) return [];
  if (Array.isArray(payload)) return payload.map((c) => criterionRow(c)).filter(Boolean);

  for (const key of CRITERIA_KEYS) {
    const value = payload[key];
    if (Array.isArray(value) && value.length) return value.map((c) => criterionRow(c)).filter(Boolean);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = findCriteria(value, depth + 1);
      if (nested.length) return nested;
      // A keyed map: { molecularWeight: { value, weight }, ... }
      const entries = Object.entries(value).filter(([, v]) => v && typeof v === "object" && !Array.isArray(v));
      if (entries.length && entries.every(([, v]) => "value" in v || "weight" in v || "range" in v)) {
        return entries.map(([k, v]) => criterionRow(v, k)).filter(Boolean);
      }
    }
  }
  for (const key of ["result", "data"]) {
    const nested = findCriteria(payload[key], depth + 1);
    if (nested.length) return nested;
  }
  return [];
};

export const normalizeCuratexProfile = (payload) => {
  const criteria = findCriteria(payload);

  /** Row key → criterion value, in the API's order. */
  const profileData = {};

  /** Row key → display label. */
  const labels = {};

  /** Row key → weight, on the API's own scale (e.g. 1.0). */
  const weights = {};

  /** The same weights keyed by the API's own criterion names, for the POST. */
  const apiWeights = {};

  /** Row key → API criterion name, so edits can be translated back. */
  const fieldToCriterion = {};

  criteria.forEach((c) => {
    if (c?.name == null || c.name === "") return;

    const name = String(c.name);
    const squashed = squash(name);
    const field = PROFILE_FIELDS.find(
      (f) => squash(f.key) === squashed || f.aliases.includes(squashed)
    );

    const key = field && !(field.key in profileData) ? field.key : name;
    // A duplicate name has nowhere distinct to go; the first one wins.
    if (key in profileData) return;

    profileData[key] = c.value ?? "";
    labels[key] = field?.label ?? humanize(name);
    fieldToCriterion[key] = name;

    if (c.weight != null && c.weight !== "") {
      weights[key] = c.weight;
      apiWeights[name] = c.weight;
    }
  });

  return {
    hasData: criteria.length > 0 || Boolean(payload?.target ?? payload?.result?.target),
    target: payload?.target ?? payload?.result?.target ?? payload?.profile?.target ?? null,
    profileData,
    labels,
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
 * Values are passed through in the API's own numeric scale (the profile
 * returns e.g. `weight: 1.0`, and the table shows and edits that same number).
 * Only weights go out: the compounds contract has no field for criterion
 * values.
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

/**
 * The profile form's criterion values, keyed by the API's criterion names,
 * for POST /agents/curatex/compounds. The endpoint now accepts `values`
 * alongside `weights`, so an edited target value changes the ranking.
 */
export const toApiValues = (formValues, profile) => {
  if (!formValues || typeof formValues !== "object") return {};
  const map = profile?.fieldToCriterion ?? {};
  const out = {};
  Object.entries(formValues).forEach(([key, value]) => {
    if (value == null || String(value).trim() === "") return;
    out[map[key] ?? key] = value;
  });
  return out;
};

export const CURATEX_PROFILE_FIELDS = PROFILE_FIELDS;

/**
 * GET /agents/curatex/{jobId}/results
 *   { totalCompounds, page, totalPages, target, items: [{ name, score, … }] }
 *
 * The fixture carried `matchedProps` / `mismatchedProps` as comma strings. The
 * API's example only shows name and score, so those are read if present and
 * left empty otherwise — the table hides the columns when no row has them.
 */
/**
 * The candidate list, wherever the payload keeps it.
 *
 * Testing found that after Submit Profile the job reported "20 repurposing
 * candidate(s) ranked for jak2" but no table appeared: only `items` (or a bare
 * array) was read, so candidates sent under another key parsed to zero rows.
 * A nested `result` (the generic job-result wrapper) is also looked into.
 */
const CANDIDATE_KEYS = ["items", "candidates", "compounds", "results", "ranked", "rankedCandidates", "ranked_candidates", "drugs"];

const candidateList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of CANDIDATE_KEYS) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  if (payload.result && typeof payload.result === "object") return candidateList(payload.result);
  if (payload.data && typeof payload.data === "object") return candidateList(payload.data);
  return [];
};

/**
 * A compound's per-criterion `breakdown`, as a list or a { criterion: {...} }
 * map → [{ label, target, value, status, source }]. `status` is "match",
 * "mismatch" or "unknown", from a status word, a boolean or a 0–1 score.
 */
const readBreakdown = (raw) => {
  const entries = Array.isArray(raw)
    ? raw.map((b) => [b?.criterion ?? b?.name ?? b?.label ?? b?.field, b])
    : raw && typeof raw === "object"
    ? Object.entries(raw)
    : [];
  return entries
    .filter(([name, b]) => name && b != null)
    .map(([name, b]) => {
      const row = typeof b === "object" ? b : { value: b };
      const flag = row.status ?? row.match ?? row.matched ?? row.passed ?? row.pass;
      const score = Number(row.score ?? row.subscore ?? row.sub_score);
      const status =
        typeof flag === "boolean"
          ? flag ? "match" : "mismatch"
          : /^(match|pass|met|within|in[_ ]?range|good)/i.test(String(flag ?? ""))
          ? "match"
          : /^(mismatch|fail|miss|outside|out[_ ]?of[_ ]?range|bad)/i.test(String(flag ?? ""))
          ? "mismatch"
          : Number.isFinite(score)
          ? score >= 0.5 ? "match" : "mismatch"
          : "unknown";
      return {
        label: row.label ?? humanize(name),
        target: row.target ?? row.targetValue ?? row.target_value ?? row.criterion_value ?? row.range ?? "—",
        value: row.value ?? row.actual ?? row.observed ?? row.compoundValue ?? row.compound_value ?? "Not returned",
        status,
        source: row.source ?? null,
      };
    });
};

/** `fieldSources` as a list or map → [{ field, source }]. */
const readFieldSources = (raw) => {
  const entries = Array.isArray(raw)
    ? raw.map((f) => [f?.field ?? f?.criterion ?? f?.name, f?.source ?? f?.sources ?? f?.database])
    : raw && typeof raw === "object"
    ? Object.entries(raw)
    : [];
  return entries
    .filter(([field, source]) => field && source)
    .map(([field, source]) => ({
      field: humanize(field),
      source: Array.isArray(source) ? source.join(", ") : typeof source === "object" ? source.name ?? source.label ?? JSON.stringify(source) : String(source),
    }));
};

/** `evidenceLinks` → [{ label, url }]. Strings are treated as bare URLs. */
const readEvidenceLinks = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((l) =>
      typeof l === "string"
        ? { label: l, url: l }
        : l && (l.url || l.href || l.link)
        ? { label: l.label ?? l.title ?? l.source ?? l.url ?? l.href ?? l.link, url: l.url ?? l.href ?? l.link }
        : null
    )
    .filter((l) => l && /^https?:\/\//i.test(l.url));

export const normalizeCuratexResults = (payload, { pageSize: requested } = {}) => {
  const items = candidateList(payload);

  const page = Number(payload?.page) || 1;
  const pageSize = derivePageSize(payload, items.filter(Boolean).length, requested);

  const compounds = items
    .filter(Boolean)
    .map((c, index) => {
      if (!c) return null;
      const name =
        c.name ?? c.compound ?? c.drug ?? c.drug_name ?? c.drugName ?? c.compound_name ??
        c.compoundName ?? c.pref_name ?? c.molecule_name ?? null;
      if (!name) return null;

      const matched = c.matchedProps ?? c.matched_props ?? c.matched ?? [];
      const mismatched = c.mismatchedProps ?? c.mismatched_props ?? c.mismatched ?? [];
      const asText = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

      // The API sends the composite score as camelCase `compositeScore`; only
      // `composite_score` was read, so the score column showed "—".
      const rawScore =
        c.score ?? c.compositeScore ?? c.composite_score ?? c.matchScore ?? c.match_score ??
        c.total_score ?? c.totalScore ?? c.final_score ?? c.weighted_score;
      const scoreNum = Number(rawScore);

      return {
        // Ranks continue across pages instead of restarting at 1.
        rank: c.rank ?? (page - 1) * pageSize + index + 1,
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
        // Per-criterion comparison, its sources and supporting links.
        breakdown: readBreakdown(c.breakdown),
        fieldSources: readFieldSources(c.fieldSources ?? c.field_sources),
        evidenceLinks: readEvidenceLinks(c.evidenceLinks ?? c.evidence_links),
      };
    })
    .filter(Boolean);

  return {
    hasData: compounds.length > 0,
    compounds,
    target: payload?.target ?? payload?.result?.target ?? null,
    total: Number(payload?.totalCompounds ?? payload?.total ?? payload?.count ?? compounds.length) || compounds.length,
    page,
    pageSize,
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
 * PyMOL output file stems. Only `outputFile` exists in the API (and it is ""
 * in the live example), so proteinLigand is derived from it where possible and
 * proteinValue is always empty; the table renders those columns only when some
 * row has a value.
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

  // A shortlist of PDB structures to choose from, instead of hits, when the
  // target maps to several structures.
  const pdbOptions = payload && typeof payload === "object" && !Array.isArray(payload) ? readPdbShortlist(payload) : [];

  return { hasData: hits.length > 0, hits, pdbOptions };
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
  const source = payload?.result && typeof payload.result === "object" && !payload?.patents ? payload.result : payload;
  const rows = Array.isArray(source?.patents)
    ? source.patents
    : Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.results)
    ? source.results
    : [];

  const patents = rows
    .map((p) => {
      if (!p) return null;
      const id = p.patentId ?? p.patent_id ?? p.id ?? null;
      if (!id) return null;
      // Testing saw no relevance score: only `relevance` was read. The
      // common alternative names are accepted too.
      const relevance = Number(
        p.relevance ?? p.relevance_score ?? p.relevanceScore ?? p.score ?? p.similarity ??
        p.similarity_score ?? p.relevancy ?? NaN
      );
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
    hasData: patents.length > 0 || Boolean(source?.assessment),
    target: source?.target ?? null,
    disease: source?.disease ?? null,
    assessment: source?.assessment ?? null,
    recommendations: Array.isArray(source?.recommendations) ? source.recommendations : [],
    // What the relevance score means, when the API says.
    scoreDefinitions: readDefinitions(source?.scoreDefinitions ?? source?.score_definitions),
    patents,
    total: Number(source?.totalPatents ?? source?.total ?? patents.length) || patents.length,
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
const FAILED_STAGE_STATUSES = ["failed", "error", "cancelled", "canceled"];

export const normalizePipelineResult = (payload) => {
  const r = payload?.result && typeof payload.result === "object" ? payload.result : payload;
  const stages = Array.isArray(r?.stages) ? r.stages : [];

  const rows = stages.map((s) => ({
    module: s?.module ?? "—",
    status: s?.status ?? "Unknown",
    failed: FAILED_STAGE_STATUSES.includes(String(s?.status ?? "").toLowerCase()),
    summary: s?.summary ?? null,
  }));

  const failedCount = rows.filter((s) => s.failed).length;

  return {
    hasData: rows.length > 0,
    stages: rows,
    summary: r?.summary ?? null,
    completed: rows.length - failedCount,
    total: rows.length,
    /** True when the job "completed" but at least one stage did not. */
    hasFailures: failedCount > 0,
  };
};

const phaseResults = {
  normalizeLitminexResults,
  normalizeInsights,
  normalizeArticlePreview,
  normalizeCuratexProfile,
  toApiWeights,
  toApiValues,
  normalizeCuratexResults,
  normalizeDockingHits,
  normalizeNoveltyReport,
  normalizePipelineResult,
  CURATEX_PROFILE_FIELDS,
  RESULTS_PAGE_SIZE,
};

export default phaseResults;
