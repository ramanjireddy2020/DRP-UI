/**
 * Colours, sizes and legend handling shared by the inline subgraph
 * (SubgraphView) and its full-size view in a new tab (SubgraphFullView).
 */

/**
 * Node colours by type — the app's theme palette.
 *
 * Nodes carry a `type` and no colour, so the colour is always resolved here
 * from the normalised type. The API's `color_legend` (and any `node.color`)
 * uses a different palette and is deliberately not read, and neither is the
 * old txkg_test.py HTML renderer's.
 *
 * Types are matched EXACTLY, on a canonical key or a listed alias, after
 * normalising case and separators ("gene/protein", "Gene / Protein",
 * "biological_process", "Biological Process" …). It used to be a substring
 * match, so "genetic_disorder" read as a gene and "cell" / "complex" /
 * "tissue" fell through to Other.
 */
export const NODE_TYPE_STYLES = [
  { key: "disease", label: "Disease", color: "#F25966", radius: 16, aliases: ["disease", "diseases", "diseasehub"] },
  { key: "gene/protein", label: "Gene / Protein", color: "#F28C33", radius: 14, aliases: ["geneprotein", "proteingene", "gene", "genes", "protein", "proteins"] },
  { key: "pathway", label: "Pathway", color: "#149E99", radius: 13, aliases: ["pathway", "pathways"] },
  { key: "biological_process", label: "Biological process", color: "#3B82F6", radius: 12, aliases: ["biologicalprocess", "biologicalprocesses"] },
  { key: "molecular_function", label: "Molecular function", color: "#EAB308", radius: 12, aliases: ["molecularfunction", "molecularfunctions"] },
  { key: "cellular_component", label: "Cellular component", color: "#A3A3A3", radius: 12, aliases: ["cellularcomponent", "cellularcomponents"] },
  // Kept although drugs are not normally part of context-graph traversal.
  { key: "drug/compound", label: "Drug / Compound", color: "#8C4DBF", radius: 13, aliases: ["drugcompound", "compounddrug", "drug", "drugs", "compound", "compounds"] },
  { key: "complex", label: "Complex", color: "#A66BC4", radius: 13, aliases: ["complex", "complexes", "proteincomplex"] },
  { key: "genetic_disorder", label: "Genetic disorder", color: "#D94F64", radius: 12, aliases: ["geneticdisorder", "geneticdisorders"] },
  { key: "tissue", label: "Tissue", color: "#84B77A", radius: 12, aliases: ["tissue", "tissues"] },
  { key: "cell", label: "Cell", color: "#35B8D4", radius: 12, aliases: ["cell", "cells", "celltype"] },
];

export const OTHER_NODE_STYLE = { key: "other", label: "Other", color: "#64748B", radius: 11, aliases: [] };

/** The query disease: drawn in the disease colour, larger, with a ring. */
export const HUB_STROKE = "#FFFFFF";
export const HUB_RADIUS = 24;

/** "Biological Process" / "biological_process" / "gene/protein" → "biologicalprocess" / "geneprotein". */
const squash = (value) => String(value ?? "").toLowerCase().replace(/[\s_\-/]+/g, "");

const STYLE_BY_ALIAS = new Map();
NODE_TYPE_STYLES.forEach((style) => {
  [style.key, ...style.aliases].forEach((alias) => STYLE_BY_ALIAS.set(squash(alias), style));
});

/** The canonical type key for a node type ("gene/protein", "cell", …), or "other". */
export const normalizeNodeType = (type) => (STYLE_BY_ALIAS.get(squash(type)) ?? OTHER_NODE_STYLE).key;

/**
 * { key, label, color, radius } for a node type. The one lookup for every
 * place that colours or classifies nodes: the canvas, the legend, the
 * protein/gene list, disease-hub detection and the meta-path node chips.
 * Unknown or missing types resolve to Other.
 */
export const styleForType = (type) => STYLE_BY_ALIAS.get(squash(type)) ?? OTHER_NODE_STYLE;

/**
 * Nodes and edges in one shape, whatever the subgraph JSON calls its fields.
 *
 * The canvas used to read `node.type` / `node.label` / `edge.source` only; a
 * payload using `node_type`, `name`, `from`/`to` etc. rendered every node grey
 * as "Other". Edges whose ends are objects (a pre-resolved graph) are reduced
 * to ids.
 */
const idOf = (end) => (end && typeof end === "object" ? end.id ?? end.name ?? null : end ?? null);

export const normalizeGraph = (graph) => {
  const nodes = (graph?.nodes ?? [])
    .filter(Boolean)
    .map((n) => ({
      ...n,
      id: n.id ?? n.node_id ?? n.nodeId ?? n.name,
      label: n.label ?? n.name ?? n.node_name ?? n.nodeName ?? n.id,
      type: n.type ?? n.node_type ?? n.nodeType ?? n.category ?? n.group ?? n.kind ?? null,
    }))
    .filter((n) => n.id != null);

  const edges = (graph?.edges ?? graph?.links ?? [])
    .filter(Boolean)
    .map((e) => ({
      ...e,
      source: idOf(e.source ?? e.from ?? e.src ?? e.source_id),
      target: idOf(e.target ?? e.to ?? e.dst ?? e.target_id),
      label: e.label ?? e.edge_label ?? e.edgeLabel ?? e.relation ?? e.type ?? null,
    }))
    .filter((e) => e.source != null && e.target != null);

  // Comorbidity links are not shown (testing: they were being added to the
  // genetic-disorder representation incorrectly). A node that was connected
  // ONLY through such links is dropped with them; isolated nodes that never
  // had a link are kept.
  const isComorbidity = (e) =>
    [e.label, e.type, e.relation, e.edge_type, e.edgeType].some((v) => /comorbid/i.test(String(v ?? "")));
  const kept = edges.filter((e) => !isComorbidity(e));
  if (kept.length === edges.length) return { nodes, edges };

  const linked = new Set();
  kept.forEach((e) => {
    linked.add(e.source);
    linked.add(e.target);
  });
  const touchedByRemoved = new Set();
  edges.filter(isComorbidity).forEach((e) => {
    touchedByRemoved.add(e.source);
    touchedByRemoved.add(e.target);
  });
  return {
    nodes: nodes.filter((n) => linked.has(n.id) || !touchedByRemoved.has(n.id)),
    edges: kept,
  };
};

/**
 * Legend entries for a graph: one per node type actually drawn, in the same
 * colours the canvas uses.
 *
 * It used to prefer the API's `legend`, whose colours the canvas never used,
 * so the key could disagree with the picture (and it was usually empty).
 */
export const buildLegend = (graph) => {
  const seen = new Map();
  normalizeGraph(graph).nodes.forEach((node) => {
    const style = styleForType(node.type);
    if (!seen.has(style.label)) seen.set(style.label, style.color);
  });
  return [...seen].map(([label, color]) => ({ label, color }));
};

/**
 * The hub — whichever node the API marks as the disease hub, else a disease
 * node, else the most connected one. Drawn larger so the query disease is
 * easy to find.
 */
export const findHubId = (nodes, edges) => {
  if (!nodes.length) return null;
  const explicit =
    nodes.find((n) => String(n.type ?? "").toLowerCase().includes("hub")) ??
    nodes.find((n) => normalizeNodeType(n.type) === "disease");
  if (explicit) return explicit.id;

  const degree = new Map();
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  });
  return nodes.reduce(
    (best, n) => ((degree.get(n.id) || 0) > (degree.get(best.id) || 0) ? n : best),
    nodes[0]
  ).id;
};

/**
 * Actual paths between two nodes of the subgraph, as named steps with the
 * relation on each hop — the same shape normalizeTraversal() returns.
 *
 * Used for a target's meta-path traversals when no analysis traversal names
 * it, so the list shows real node names (from the graph the user is looking
 * at) instead of the path TYPES ("gene/protein → biological_process").
 * Undirected, simple paths only, shortest first.
 */
export const pathsBetween = (graph, fromId, toId, { maxHops = 3, limit = 3 } = {}) => {
  const { nodes, edges } = normalizeGraph(graph);
  if (fromId == null || toId == null || fromId === toId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(fromId) || !byId.has(toId)) return [];

  const adjacent = new Map();
  edges.forEach((e) => {
    if (!adjacent.has(e.source)) adjacent.set(e.source, []);
    if (!adjacent.has(e.target)) adjacent.set(e.target, []);
    adjacent.get(e.source).push({ to: e.target, label: e.label });
    adjacent.get(e.target).push({ to: e.source, label: e.label });
  });

  const found = [];
  // Breadth-first over partial paths, so shorter paths come out first.
  let frontier = [{ ids: [fromId], labels: [] }];
  for (let hop = 0; hop < maxHops && found.length < limit; hop += 1) {
    const next = [];
    frontier.forEach((path) => {
      const last = path.ids[path.ids.length - 1];
      (adjacent.get(last) ?? []).forEach(({ to, label }) => {
        if (path.ids.includes(to)) return;
        const extended = { ids: [...path.ids, to], labels: [...path.labels, label] };
        if (to === toId) found.push(extended);
        else next.push(extended);
      });
    });
    // Keep the search bounded on dense graphs.
    frontier = next.slice(0, 500);
  }

  return found.slice(0, limit).map(({ ids, labels }) => {
    const steps = ids.map((id) => ({ name: String(byId.get(id)?.label ?? id), type: byId.get(id)?.type ?? null }));
    const edgeLabels = labels.map((l) => (l == null ? "" : String(l)));
    return {
      steps,
      edgeLabels,
      target: toId,
      targetName: steps[steps.length - 1].name,
      hopCount: steps.length - 1,
      contextWeight: null,
      text: steps.map((s) => s.name).join(" → "),
    };
  });
};
