/**
 * Colours, sizes and legend handling shared by the inline subgraph
 * (SubgraphView) and its full-size view in a new tab (SubgraphFullView).
 */

/**
 * Node colours by type.
 *
 * Testing asked for the graph to be colour-coded from the JSON, with proteins,
 * disease, pathways and biological processes each in their own colour and the
 * same colours in the legend. Pathway and biological process used to share a
 * teal, so the two were indistinguishable. Matching is on a normalised type
 * ("gene/protein", "biological_process", "Biological Process" all work).
 */
const TYPE_COLORS = [
  { match: "disease", label: "Disease", color: "#F25966", radius: 16 },
  { match: "gene", label: "Protein / Gene", color: "#F28C33", radius: 14 },
  { match: "protein", label: "Protein / Gene", color: "#F28C33", radius: 14 },
  { match: "pathway", label: "Pathway", color: "#149E99", radius: 13 },
  { match: "biologicalprocess", label: "Biological process", color: "#3B82F6", radius: 12 },
  { match: "molecularfunction", label: "Molecular function", color: "#EAB308", radius: 12 },
  { match: "cellularcomponent", label: "Cellular component", color: "#A3A3A3", radius: 12 },
  { match: "drug", label: "Drug / Compound", color: "#8C4DBF", radius: 13 },
  { match: "compound", label: "Drug / Compound", color: "#8C4DBF", radius: 13 },
];

const FALLBACK_STYLE = { label: "Other", color: "#64748B", radius: 11 };

/** The query disease: drawn in the disease colour, larger, with a ring. */
export const HUB_STROKE = "#FFFFFF";
export const HUB_RADIUS = 24;

const squash = (value) => String(value ?? "").toLowerCase().replace(/[\s_\-/]+/g, "");

export const styleForType = (type) => {
  const text = squash(type);
  return TYPE_COLORS.find((entry) => text.includes(entry.match)) ?? FALLBACK_STYLE;
};

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

  return { nodes, edges };
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
    nodes.find((n) => styleForType(n.type).label === "Disease");
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
