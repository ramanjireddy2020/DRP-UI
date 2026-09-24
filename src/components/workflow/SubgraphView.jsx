import React, { useMemo, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { FONT, TEAL, GRAY_BG, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";
import KnowledgeGraphCanvas, { GraphLegend } from "./KnowledgeGraphCanvas";
import { buildLegend, normalizeGraph, styleForType } from "./subgraphStyle";
import { uniprotUrl } from "../../workflow/sourceLinks";
import { looksLikeAccession } from "../../workflow/selections";
import { openSubgraphInNewTab } from "./subgraphHandoff";

/**
 * The knowledge-graph picture, drawn from GET /agents/subgraph/{graphJobId}.
 *
 * It replaced a hand-drawn SVG with Type 2 Diabetes at the centre and JAK2,
 * DPP4, GLP1R, Metformin, Imatinib and Ruxolitinib at fixed coordinates, plus
 * fixed footer counts of 52 / 15 / 10. The same picture rendered for every
 * disease.
 *
 * The API returns nodes and edges with no coordinates. They used to be placed
 * on fixed concentric rings in an SVG, which testing reported as static and
 * tightly packed, with no legend and no larger view. The graph is now an
 * interactive force layout (KnowledgeGraphCanvas), the legend is always shown
 * (built from node types when the API's is empty), and it can be opened
 * full-size in a new tab.
 */

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
  const hasGraph = Boolean(graph?.nodes?.length);
  const legend = useMemo(() => buildLegend(graph), [graph]);

  /**
   * The protein nodes in the graph, with how many edges each has.
   *
   * These replace the "DRUG CANDIDATES — 0 candidates" stat: TxKG finds
   * protein targets, not drugs, so testing asked for the proteins drawn in the
   * graph to be listed instead.
   */
  const proteins = useMemo(() => {
    const { nodes, edges } = normalizeGraph(graph);
    const degree = new Map();
    edges.forEach((e) => {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    });
    return nodes
      .filter((n) => styleForType(n.type).label === "Protein / Gene")
      .map((n) => ({ id: String(n.id), label: n.label, connections: degree.get(n.id) || 0 }))
      .sort((a, b) => b.connections - a.connections);
  }, [graph]);
  const [openFailed, setOpenFailed] = useState(false);

  const openLargerView = () => {
    setOpenFailed(!openSubgraphInNewTab({ graph, stats, diseaseLabel }));
  };

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

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: "12px", mb: "12px" }}>
        <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>
          Here is the generated knowledge graph
          {diseaseLabel ? ` for ${diseaseLabel}` : ""}. It shows the curated and predicted
          relationships between the ranked targets, their pathways and overlapping proteins.
        </Typography>
        <Button
          onClick={openLargerView}
          startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
          sx={{
            flexShrink: 0,
            textTransform: "none",
            fontFamily: FONT,
            fontSize: "13px",
            fontWeight: 600,
            color: TEAL,
            border: `1px solid ${BORDER}`,
            borderRadius: "8px",
            px: "12px",
          }}
        >
          Open in new tab
        </Button>
      </Box>

      <KnowledgeGraphCanvas graph={graph} onNodeClick={onNodeClick} />

      <GraphLegend entries={legend} />

      {openFailed && (
        <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626", mt: "8px" }}>
          Couldn't open the larger view: browser storage is unavailable or full.
        </Typography>
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
          { label: "PROTEINS", value: proteins.length, unit: proteins.length === 1 ? "protein" : "proteins" },
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

      {proteins.length > 0 && (
        <Box sx={{ mt: "12px", border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 120px 100px", gap: "8px", p: "8px 12px", bgcolor: GRAY_BG }}>
            {["Protein", "UniProt ID", "Connections"].map((h) => (
              <Typography key={h} sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                {h}
              </Typography>
            ))}
          </Box>
          <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
            {proteins.map((p) => (
              <Box
                key={p.id}
                sx={{ display: "grid", gridTemplateColumns: "1fr 120px 100px", gap: "8px", p: "8px 12px", borderTop: `1px solid ${BORDER}` }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>{p.label}</Typography>
                {looksLikeAccession(p.id) ? (
                  <Typography
                    component="a"
                    href={uniprotUrl(p.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontFamily: FONT, fontSize: "13px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                  >
                    {p.id}
                  </Typography>
                ) : (
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>{p.id}</Typography>
                )}
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>{p.connections}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
};

export default SubgraphView;
