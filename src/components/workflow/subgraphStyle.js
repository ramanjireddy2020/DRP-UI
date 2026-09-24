/**
 * Colours, sizes and legend handling shared by the inline subgraph
 * (SubgraphView) and its full-size view in a new tab (SubgraphFullView).
 */

/** Node colours by type, matching the palette the static picture used. */
const TYPE_COLORS = [
  { match: "disease hub", label: "Disease (query)", color: "#1F2433", radius: 26 },
  { match: "disease", label: "Disease", color: "#F25966", radius: 12 },
  { match: "gene", label: "Gene / Protein", color: "#F28C33", radius: 15 },
  { match: "protein", label: "Gene / Protein", color: "#F28C33", radius: 15 },
  { match: "drug", label: "Drug / Compound", color: "#8C4DBF", radius: 14 },
  { match: "compound", label: "Drug / Compound", color: "#8C4DBF", radius: 14 },
  { match: "pathway", label: "Pathway", color: "#149E99", radius: 14 },
  { match: "biological_process", label: "Biological process", color: "#149E99", radius: 13 },
  { match: "molecular_function", label: "Molecular function", color: "#3B82F6", radius: 13 },
];

const FALLBACK_STYLE = { label: "Other", color: "#64748B", radius: 12 };

/** The hub is drawn dark on a dark canvas, so it gets a light ring. */
export const HUB_COLOR = "#1F2433";
export const HUB_STROKE = "#00BCD4";
export const HUB_RADIUS = 26;

export const styleForType = (type) => {
  const text = String(type ?? "").toLowerCase();
  return TYPE_COLORS.find((entry) => text.includes(entry.match)) ?? FALLBACK_STYLE;
};

/**
 * The API's `legend`. The collection shows it as an object (empty in the
 * example), so both a { label: colour } map and a [{ label, color }] list are
 * read. A value that is not a colour is shown as the entry's description.
 */
const isColour = (value) =>
  typeof value === "string" && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(value.trim());

const readApiLegend = (legend) => {
  if (Array.isArray(legend)) {
    return legend
      .map((entry) =>
        entry && typeof entry === "object"
          ? {
              label: entry.label ?? entry.type ?? entry.name ?? null,
              color: entry.color ?? entry.colour ?? null,
            }
          : entry
          ? { label: String(entry), color: null }
          : null
      )
      .filter((entry) => entry?.label);
  }
  if (legend && typeof legend === "object") {
    return Object.entries(legend).map(([label, value]) => {
      if (value && typeof value === "object") {
        return { label: value.label ?? label, color: value.color ?? value.colour ?? null };
      }
      return isColour(value)
        ? { label, color: value }
        : { label: value ? `${label}: ${value}` : label, color: null };
    });
  }
  return [];
};

/**
 * Legend entries for a graph.
 *
 * Testing reported "no legend": the API's `legend` usually comes back empty,
 * and the legend was only drawn from that. When it is empty, build one from
 * the node types actually present so every colour on the canvas is explained.
 */
export const buildLegend = (graph) => {
  const fromApi = readApiLegend(graph?.legend).map((entry) => ({
    label: entry.label,
    color: entry.color || styleForType(entry.label).color,
  }));
  if (fromApi.length) return fromApi;

  const seen = new Map();
  (graph?.nodes ?? []).forEach((node) => {
    const style = String(node.type ?? "").toLowerCase().includes("hub")
      ? { label: "Disease (query)", color: HUB_COLOR }
      : styleForType(node.type);
    if (!seen.has(style.label)) seen.set(style.label, style.color);
  });
  return [...seen].map(([label, color]) => ({ label, color }));
};

/**
 * The hub — whichever node the API marks as the disease hub, else the most
 * connected one. Drawn larger so the query disease is easy to find.
 */
export const findHubId = (nodes, edges) => {
  if (!nodes.length) return null;
  const explicit = nodes.find((n) => String(n.type ?? "").toLowerCase().includes("hub"));
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
