/**
 * Normalises a TxKG job result into the shape the UI renders.
 *
 * Written against a real response from
 *   GET /agents/jobs/{jobId}/result        (job_3d644fd7570246c6, "Cancer Pain")
 *
 * That response is NOT envelope-wrapped, and it nests the payload one level
 * down:
 *
 *   { jobId, module: "TxKG", kind: "txkg.query", result: { disease, targets, ... } }
 *
 * so `unwrap()` hands back the outer object and the interesting part is
 * `.result`. Both shapes are accepted here, because the wrapper may or may not
 * be present depending on which endpoint the caller used.
 */

const EMPTY = {
  hasData: false,
  disease: null,
  diseaseId: null,
  count: 0,
  targets: [],
  interpretation: null,
  interpretationBlocks: [],
  subgraph: null,
  recommendation: null,
  nextModule: null,
  counts: null,
  summary: null,
  method: null,
  subgraphHtmlUrl: null,
  labelDefinitions: {},
  scoreDefinitions: {},
};

/**
 * Definitions as a plain { term: meaning } map, from either a map or a list of
 * { label|name|term, definition|description|meaning }.
 */
export const readDefinitions = (raw) => {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .map((d) => [d?.label ?? d?.name ?? d?.term ?? d?.key, d?.definition ?? d?.description ?? d?.meaning ?? d?.text])
        .filter(([k, v]) => k && v)
        .map(([k, v]) => [String(k), String(v)])
    );
  }
  if (raw && typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw)
        .map(([k, v]) => [k, typeof v === "object" && v ? v.definition ?? v.description ?? v.meaning ?? v.text : v])
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
  }
  return {};
};

/** The definition for a term, matched without regard to case, spaces or "_" / "-". */
export const definitionFor = (definitions, term) => {
  const squash = (v) => String(v ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  const key = squash(term);
  if (!key) return null;
  const hit = Object.entries(definitions ?? {}).find(([k]) => squash(k) === key);
  return hit ? hit[1] : null;
};

/** Accept either the wrapper or the inner payload. */
const inner = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  // The wrapper carries jobId/module/kind alongside a nested `result`.
  if (payload.result && typeof payload.result === "object") return payload.result;
  return payload;
};

/**
 * Format a score for display. The API returns floats of varying precision
 * (176.6, 82.254, 57.245); the table renders them right-aligned, so fixing to
 * two decimals keeps the column straight.
 */
export const formatScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
};

/**
 * Map one API target onto the shape the existing table code expects.
 *
 * The API and the old fixture disagree about `name`: the fixture used the short
 * gene symbol there ("DPP4") with the long form in `fullName`, while the API
 * puts the long form in `name` and the symbol in `geneName`. Mapping symbol →
 * `name` keeps the rendered table looking the way it was designed.
 */
export const normalizeTarget = (t, index) => {
  if (!t || typeof t !== "object") return null;

  const id = t.uniprotId ?? t.uniprot_id ?? t.id ?? null;
  if (!id) return null;

  const longName = t.fullName ?? t.full_name ?? t.name ?? "";
  const symbol = t.geneName ?? t.gene_name ?? t.name ?? id;
  // The score column is the API's `score`. It used to prefer `correctedScore`,
  // which testing flagged: the table should show the value labelled "score".
  // The corrected score is only a fallback for a payload that carries no score.
  const rawScore = t.score ?? t.correctedScore ?? t.corrected_score ?? null;

  return {
    // --- fields the existing render code reads ---
    id,
    name: symbol,
    fullName: longName,
    score: formatScore(rawScore),

    /**
     * The gene symbol, and ONLY when the API actually supplied one.
     *
     * `name` above falls back to the long protein name when geneName is
     * missing, which is fine for display but not for a hand-off: LitMineX has
     * to receive "JAK2", never "Tyrosine-protein kinase JAK2" and never the
     * accession. src/workflow/selections.js reads this field first for exactly
     * that reason, so it must stay null rather than guess.
     */
    geneName: t.geneName ?? t.gene_name ?? null,

    // --- everything the fixture never had ---
    rawScore: Number.isFinite(Number(rawScore)) ? Number(rawScore) : null,
    rank: t.rank ?? index + 1,
    category: t.category ?? null,
    label: t.label ?? t.category ?? null,
    noveltyLabel: t.noveltyLabel ?? t.novelty_label ?? null,
    sourcingStatus: t.sourcingStatus ?? t.sourcing_status ?? null,
    confirmed: t.confirmed ?? null,
    literatureHits: t.literatureHits ?? t.literature_hits ?? null,
    patentHits: t.patentHits ?? t.patent_hits ?? null,
    connectionTypes: Array.isArray(t.connectionTypes) ? t.connectionTypes : [],
    // Actual paths for this target (node names + edge labels). The API now
    // returns them on every target as `connectionPaths`; connectionTypes
    // above are only the path TYPES ("gene/protein → pathway"), which testing
    // asked never to show. Older payload spellings are still read.
    traversals: [t.connectionPaths, t.connection_paths, t.metapaths, t.traversals, t.paths]
      .find((list) => Array.isArray(list) && list.length > 0)
      ?.map(normalizeTraversal)
      .filter(Boolean) ?? [],
    supportingSources: Array.isArray(t.supportingSources) ? t.supportingSources : [],
    // Deep links to the record behind each source, e.g. the CTD entry for this
    // gene–disease pair. Sources used to link to the database's home page.
    supportingSourceLinks: (Array.isArray(t.supportingSourceLinks) ? t.supportingSourceLinks : Array.isArray(t.supporting_source_links) ? t.supporting_source_links : [])
      .map((l) =>
        typeof l === "string"
          ? { source: null, label: l, url: l }
          : l && (l.url || l.href)
          ? { source: l.source ?? l.name ?? l.database ?? null, label: l.label ?? l.title ?? l.source ?? l.name ?? null, url: l.url ?? l.href }
          : null
      )
      .filter((l) => l && /^https?:\/\//i.test(l.url)),
    pathCount: t.path_count ?? t.pathCount ?? (Array.isArray(t.connectionTypes) ? t.connectionTypes.length : null),
    customAdded: t.customAdded ?? t.custom_added ?? false,
    fromKnowledgeGraph: t.fromKnowledgeGraph ?? t.from_knowledge_graph ?? null,
  };
};

/**
 * Split the `interpretation` markdown into per-target blocks.
 *
 * The real response formats it as "**Protein name (UNIPROT)**: prose" separated
 * by blank lines, so it renders far better as a list of titled paragraphs than
 * as one wall of text with literal asterisks in it.
 */
export const parseInterpretation = (text) => {
  if (!text || typeof text !== "string") return [];

  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const match = block.match(/^\*\*(.+?)\*\*:\s*([\s\S]*)$/);
      if (match) {
        return { title: match[1].trim(), body: match[2].trim() };
      }
      // Strip any stray bold markers so no asterisks reach the page.
      return { title: null, body: block.replace(/\*\*/g, "").trim() };
    });
};

/** Merge the `table` array's extra columns onto the matching target. */
const mergeTable = (targets, table) => {
  if (!Array.isArray(table) || !table.length) return targets;

  const byId = new Map(
    table
      .filter((row) => row && (row.uniprot_id || row.uniprotId))
      .map((row) => [row.uniprot_id ?? row.uniprotId, row])
  );

  return targets.map((t) => {
    const row = byId.get(t.id);
    if (!row) return t;
    return {
      ...t,
      rank: row.rank ?? t.rank,
      label: row.label ?? t.label,
      pathCount: row.path_count ?? t.pathCount,
      noveltyLabel: row.novelty_label ?? t.noveltyLabel,
      sourcingStatus: row.sourcing_status ?? t.sourcingStatus,
    };
  });
};

/**
 * The single entry point. Returns a stable shape whether or not there is data,
 * so callers never branch on null.
 */
export const normalizeTxkgResult = (payload) => {
  const r = inner(payload);
  if (!r) return EMPTY;

  const rawTargets = Array.isArray(r.targets) ? r.targets : [];
  let targets = rawTargets
    .map(normalizeTarget)
    .filter(Boolean)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  targets = mergeTable(targets, r.table);

  if (!targets.length) return EMPTY;

  const recommendation = r.recommendation ?? null;

  return {
    hasData: true,
    disease: r.disease ?? null,
    diseaseId: r.diseaseId ?? r.disease_id ?? null,
    // Prefer the API's own count, but never let it disagree with what renders.
    count: Number.isFinite(Number(r.count)) ? Number(r.count) : targets.length,
    targets,
    interpretation: r.interpretation ?? null,
    interpretationBlocks: parseInterpretation(r.interpretation),
    subgraph: r.subgraph ?? null,
    recommendation,
    // The job result names the module to hand off to — the same information the
    // supervisor gives, arriving mid-pipeline.
    nextModule: recommendation?.next_module ?? recommendation?.nextModule ?? null,
    counts: r.counts ?? null,
    summary: r.summary ?? null,
    method: r.method ?? null,
    subgraphHtmlUrl: r.subgraphHtmlUrl ?? r.subgraph_html_url ?? null,
    // What the novelty labels ("well explored", "moderate", "high") and the
    // scores mean. Testing asked what they mean; the API now says.
    labelDefinitions: readDefinitions(
      r.method?.label_definitions ?? r.method?.labelDefinitions ?? r.label_definitions ?? r.labelDefinitions
    ),
    scoreDefinitions: readDefinitions(
      r.scoreDefinitions ?? r.score_definitions ?? r.method?.scoreDefinitions ?? r.method?.score_definitions
    ),
  };
};

/**
 * Meta-path analysis, read from the three GET /agents/metapath/{jobId}*
 * endpoints.
 *
 * The collection documents these routes but carries no example response, so
 * nothing here assumes field names beyond the obvious ones: the stats row is
 * whatever numeric fields the analysis returns (nothing is invented when it
 * returns none), and scores / traversals accept a bare array or one wrapped in
 * a list field.
 */
const listFrom = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const humanise = (key) =>
  String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const pathText = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((step) => (step && typeof step === "object" ? step.label ?? step.name ?? step.id : step))
      .filter((step) => step != null && step !== "")
      .join(" → ");
  }
  return value == null ? "" : String(value);
};

/** "PROTEIN_DISEASE_ASSOCIATION" → "Protein disease association". */
const relationText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

/**
 * One meta-path traversal: the actual nodes walked and the relation on each hop.
 *
 * Testing found traversals rendered as "gene/protein → biological_process →
 * gene/protein" — the node TYPES — instead of the node names the backend
 * returns. A row looks like:
 *   { node_names: ["Thrombocytosis", "Tyrosine-protein kinase JAK2", "hsa04935", …],
 *     node_types: ["disease", "gene/protein", "pathway", …],
 *     edges: ["PROTEIN_DISEASE_ASSOCIATION", …],
 *     edge_labels: ["Protein Disease Association", …],
 *     intermediate, intermediate_name, hop_count, context_weight }
 * Older shapes (a `path` string or array) are still read.
 *
 * @returns {{ steps: {name, type}[], edgeLabels: string[], target, targetName,
 *   hopCount, contextWeight, text } | null}
 */
export const normalizeTraversal = (row) => {
  if (row == null) return null;

  let steps = [];
  let edgeLabels = [];

  if (typeof row === "string") {
    steps = row.split(/→|->/).map((name) => ({ name: name.trim(), type: null })).filter((s) => s.name);
  } else if (typeof row === "object") {
    const names = row.node_names ?? row.nodeNames;
    const types = row.node_types ?? row.nodeTypes ?? [];
    const nodeList = row.nodes ?? row.path;
    if (Array.isArray(names) && names.length) {
      steps = names.map((name, i) => ({ name: String(name), type: types[i] ?? null }));
    } else if (Array.isArray(nodeList) && nodeList.some((n) => n && typeof n === "object")) {
      // Nodes as objects: [{ name, type }, …]
      steps = nodeList
        .filter(Boolean)
        .map((n) =>
          typeof n === "object"
            ? { name: String(n.name ?? n.label ?? n.id ?? ""), type: n.type ?? n.node_type ?? null }
            : { name: String(n), type: null }
        )
        .filter((st) => st.name);
    } else {
      const text = pathText(row.path ?? row.nodes ?? row.traversal ?? row.metapath);
      steps = text.split(/→|->/).map((name) => ({ name: name.trim(), type: null })).filter((s) => s.name);
    }
    const labels = row.edge_labels ?? row.edgeLabels;
    edgeLabels = Array.isArray(labels) && labels.length
      ? labels.map(String)
      : Array.isArray(row.edges)
      ? row.edges.map((e) => (e && typeof e === "object" ? String(e.label ?? relationText(e.type ?? e.relation)) : relationText(e)))
      : [];
  }

  if (!steps.length) return null;

  return {
    steps,
    edgeLabels,
    target: row.target ?? row.target_id ?? row.targetId ?? null,
    targetName: row.target_name ?? row.targetName ?? steps[steps.length - 1].name,
    hopCount: row.hop_count ?? row.hopCount ?? Math.max(steps.length - 1, 0),
    contextWeight: row.context_weight ?? row.contextWeight ?? null,
    text: steps.map((s) => s.name).join(" → "),
  };
};

export const normalizeMetapath = ({ analysis, scores, traversals } = {}) => {
  const statsSource =
    analysis && typeof analysis === "object" && !Array.isArray(analysis)
      ? analysis.stats && typeof analysis.stats === "object"
        ? analysis.stats
        : analysis.summary && typeof analysis.summary === "object"
        ? analysis.summary
        : analysis
      : {};

  const stats = Object.entries(statsSource)
    .filter(([key, value]) => typeof value === "number" && Number.isFinite(value) && !/id$/i.test(key))
    .map(([key, value]) => ({
      label: humanise(key),
      value: Number.isInteger(value) ? String(value) : value.toFixed(2),
    }));

  const scoreRows = listFrom(scores, ["scores", "items", "results", "metapaths"])
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      // A row that names its nodes is shown as the actual path, not the
      // metapath type pattern in `metapath`.
      const traversal = (row.node_names ?? row.nodeNames) ? normalizeTraversal(row) : null;
      const name = traversal?.text ?? pathText(row.metapath ?? row.path ?? row.name ?? row.target ?? row.id);
      const score = Number(row.score ?? row.value ?? row.weight);
      if (!name) return null;
      return { name, traversal, score: Number.isFinite(score) ? formatScore(score) : "—" };
    })
    .filter(Boolean);

  const traversalRows = listFrom(traversals, ["traversals", "items", "paths", "results"])
    .map(normalizeTraversal)
    .filter(Boolean);

  return {
    hasData: Boolean(stats.length || scoreRows.length || traversalRows.length),
    stats,
    scores: scoreRows,
    traversals: traversalRows,
  };
};

export const EMPTY_TXKG_RESULT = EMPTY;

export default normalizeTxkgResult;
