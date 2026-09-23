import React, { useMemo } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { FONT, TEAL, GRAY_BG, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";

/**
 * The knowledge-graph picture, drawn from GET /agents/subgraph/{graphJobId}.
 *
 * It replaced a hand-drawn SVG with Type 2 Diabetes at the centre and JAK2,
 * DPP4, GLP1R, Metformin, Imatinib and Ruxolitinib at fixed coordinates, plus
 * fixed footer counts of 52 / 15 / 10. The same picture rendered for every
 * disease.
 *
 * Layout is computed rather than fetched: the API returns nodes and edges with
 * no coordinates, so this places the disease hub at the centre and everything
 * else on rings by node type. Deterministic, so the graph does not jump between
 * renders.
 */

/** Node colours by type, matching the palette the static picture used. */
const TYPE_COLORS = [
  { match: "disease hub", color: "#1F2433", radius: 26 },
  { match: "disease", color: "#F25966", radius: 12 },
  { match: "gene", color: "#F28C33", radius: 15 },
  { match: "protein", color: "#F28C33", radius: 15 },
  { match: "drug", color: "#8C4DBF", radius: 14 },
  { match: "compound", color: "#8C4DBF", radius: 14 },
  { match: "pathway", color: "#149E99", radius: 14 },
  { match: "biological_process", color: "#149E99", radius: 13 },
  { match: "molecular_function", color: "#3B82F6", radius: 13 },
];

const styleForType = (type) => {
  const text = String(type ?? "").toLowerCase();
  const hit = TYPE_COLORS.find((entry) => text.includes(entry.match));
  return hit ?? { color: "#64748B", radius: 12 };
};

/**
 * The API's `legend`. The collection shows it as an object (empty in the
 * example), so both a { label: colour } map and a [{ label, color }] list are
 * read. A value that is not a colour is shown as the entry's description.
 */
const isColour = (value) =>
  typeof value === "string" && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(value.trim());

const readLegend = (legend) => {
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

const WIDTH = 840;
const HEIGHT = 360;

/**
 * Place nodes without coordinates from the API.
 *
 * The hub — whichever node the API marks as the disease hub, else the most
 * connected one — goes in the middle. The rest are distributed over up to three
 * concentric rings so a dense graph stays readable.
 */
const layout = (nodes, edges) => {
  if (!nodes.length) return [];

  const degree = new Map();
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  });

  const hubIndex = (() => {
    const explicit = nodes.findIndex((n) =>
      String(n.type ?? "").toLowerCase().includes("hub")
    );
    if (explicit >= 0) return explicit;

    let best = 0;
    nodes.forEach((n, i) => {
      if ((degree.get(n.id) || 0) > (degree.get(nodes[best].id) || 0)) best = i;
    });
    return best;
  })();

  const others = nodes.filter((_, i) => i !== hubIndex);
  const rings = others.length > 18 ? 3 : others.length > 8 ? 2 : 1;
  const perRing = Math.ceil(others.length / rings);

  const placed = new Map();
  placed.set(nodes[hubIndex].id, { x: WIDTH / 2, y: HEIGHT / 2, node: nodes[hubIndex], hub: true });

  others.forEach((node, i) => {
    const ring = Math.floor(i / perRing);
    const indexInRing = i % perRing;
    const countInRing = Math.min(perRing, others.length - ring * perRing);

    // Offset each ring's start angle so nodes do not line up radially.
    const angle = (indexInRing / countInRing) * Math.PI * 2 + ring * 0.6;
    const radiusX = 130 + ring * 115;
    const radiusY = 78 + ring * 58;

    placed.set(node.id, {
      x: WIDTH / 2 + Math.cos(angle) * radiusX,
      y: HEIGHT / 2 + Math.sin(angle) * radiusY,
      node,
      hub: false,
    });
  });

  return placed;
};

const SubgraphView = ({
  /** { nodes, edges, legend } from GET /agents/subgraph/{graphJobId} */
  graph,
  /** { relationshipsFound, drugCandidates, pathwayConnections } */
  stats,
  loading = false,
  error = null,
  onGenerate,
  onNodeClick,
  diseaseLabel,
  /** Outcome of the last node expansion (failure / no neighbours), if any. */
  notice = null,
}) => {
  const positions = useMemo(
    () => layout(graph?.nodes ?? [], graph?.edges ?? []),
    [graph]
  );

  const hasGraph = Boolean(graph?.nodes?.length);
  const legend = useMemo(() => readLegend(graph?.legend), [graph]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", p: "24px" }}>
        <CircularProgress size={16} sx={{ color: TEAL }} />
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
          Building the knowledge graph…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box role="alert" sx={{ p: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#DC2626" }}>{error}</Typography>
        {onGenerate && (
          <Button
            onClick={onGenerate}
            sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEAL }}
          >
            Try again
          </Button>
        )}
      </Box>
    );
  }

  if (!hasGraph) {
    return (
      <Box sx={{ p: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.6 }}>
          {/* The subgraph is a SEPARATE job from the TxKG query, so it has to be
              asked for. Previously a fixed picture rendered here whether or not
              one had ever been built. */}
          No knowledge graph has been generated for this run yet. It is built as its own job
          from the targets above.
        </Typography>
        {onGenerate && (
          <Button
            onClick={onGenerate}
            variant="contained"
            disableElevation
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 600,
              bgcolor: TEAL,
              "&:hover": { bgcolor: "#089B98" },
            }}
          >
            Generate knowledge graph
          </Button>
        )}
      </Box>
    );
  }

  const nodeList = [...positions.values()];

  return (
    <>
      <Typography
        sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}
      >
        Here is the generated knowledge graph
        {diseaseLabel ? ` for ${diseaseLabel}` : ""}. It shows the curated and predicted
        relationships between the ranked targets, their pathways and overlapping proteins.
      </Typography>

      <Box sx={{ borderRadius: "12px", overflow: "hidden", lineHeight: 0 }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          style={{ maxWidth: WIDTH }}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Knowledge graph with ${graph.nodes.length} nodes and ${graph.edges?.length ?? 0} edges`}
        >
          <rect width={WIDTH} height={HEIGHT} fill="#0F172A" rx="12" />

          {/* Edges first so nodes sit on top. */}
          {(graph.edges ?? []).map((edge, i) => {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            if (!from || !to) return null;
            const label = typeof edge.label === "string" ? edge.label.trim() : "";
            return (
              <g key={`e-${i}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(102,115,140,0.4)"
                  strokeWidth="1.2"
                />
                {/* The relation name, when the API gives one. */}
                {label && (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 3}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="7"
                    fontFamily="Inter,sans-serif"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {nodeList.map(({ x, y, node, hub }) => {
            const style = styleForType(node.type);
            const radius = hub ? 26 : style.radius;
            return (
              <g
                key={node.id}
                onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
                style={{ cursor: onNodeClick ? "pointer" : "default" }}
              >
                <circle cx={x} cy={y} r={radius} fill={hub ? "#1F2433" : style.color} />
                <text
                  x={x}
                  y={y + radius + 12}
                  textAnchor="middle"
                  fill="#D1D9E6"
                  fontSize="9"
                  fontFamily="Inter,sans-serif"
                  fontWeight="500"
                >
                  {node.label || node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>

      {legend.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "12px", mt: "10px" }}>
          {legend.map((entry) => (
            <Box key={entry.label} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: entry.color || styleForType(entry.label).color,
                }}
              />
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>
                {entry.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {notice && (
        <Typography
          role="status"
          sx={{ fontFamily: FONT, fontSize: "12px", color: notice.isError ? "#DC2626" : TEXT_MUTED, mt: "8px" }}
        >
          {notice.text}
        </Typography>
      )}

      {/* Footer counts. These were fixed at 52 / 15 / 10. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: "16px",
          bgcolor: GRAY_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "8px",
          mt: "12px",
        }}
      >
        {[
          { label: "RELATIONSHIPS FOUND", value: stats?.relationshipsFound, unit: "relations" },
          { label: "DRUG CANDIDATES", value: stats?.drugCandidates, unit: "candidates" },
          { label: "PATHWAY CONNECTIONS", value: stats?.pathwayConnections, unit: "connections" },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography
                sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{ fontFamily: FONT, fontSize: "20px", fontWeight: 700, color: "#0F172A", lineHeight: "26px" }}
              >
                {stat.value ?? "—"}{" "}
                <Typography component="span" sx={{ fontSize: "14px", fontWeight: 400 }}>
                  {stat.unit}
                </Typography>
              </Typography>
            </Box>
            {i < arr.length - 1 && <Box sx={{ width: "1px", height: "40px", bgcolor: BORDER }} />}
          </React.Fragment>
        ))}
      </Box>
    </>
  );
};

export default SubgraphView;
