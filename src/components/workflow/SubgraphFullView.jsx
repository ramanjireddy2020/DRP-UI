import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import KnowledgeGraphCanvas, { GraphLegend } from "./KnowledgeGraphCanvas";
import { buildLegend } from "./subgraphStyle";
import { readSubgraphHandoff } from "./subgraphHandoff";
import { FONT, TEXT_DARK, TEXT_MUTED, BORDER } from "./workflowConstants";

/**
 * Full-window subgraph, opened in a new tab from the SUBGRAPH card.
 *
 * Testing reported there was no larger view: the graph was capped at the
 * width of the chat column. This page gives it the whole viewport. Node
 * expansion isn't offered here because it belongs to the workflow session in
 * the original tab.
 */

const HEADER_HEIGHT = 64;
const LEGEND_HEIGHT = 44;

const SubgraphFullView = () => {
  const [params] = useSearchParams();
  const payload = useMemo(() => readSubgraphHandoff(params.get("id")), [params]);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const disease = payload?.diseaseLabel;
    document.title = disease ? `Knowledge graph – ${disease}` : "Knowledge graph";
  }, [payload]);

  const legend = useMemo(() => buildLegend(payload?.graph), [payload]);

  if (!payload?.graph?.nodes?.length) {
    return (
      <Box sx={{ p: "32px", fontFamily: FONT }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, mb: "6px" }}>
          This knowledge graph is no longer available.
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
          Open it again from the SUBGRAPH section of your research workflow.
        </Typography>
      </Box>
    );
  }

  const { graph, diseaseLabel } = payload;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "#FFFFFF" }}>
      <Box
        sx={{
          height: HEADER_HEIGHT,
          px: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK }}>
          Knowledge graph{diseaseLabel ? ` · ${diseaseLabel}` : ""}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
          {graph.nodes.length} nodes · {graph.edges?.length ?? 0} edges
        </Typography>
      </Box>

      <Box sx={{ px: "24px", pt: "12px" }}>
        <KnowledgeGraphCanvas
          graph={graph}
          height={Math.max(360, viewportHeight - HEADER_HEIGHT - LEGEND_HEIGHT - 36)}
        />
        <GraphLegend entries={legend} />
      </Box>
    </Box>
  );
};

export default SubgraphFullView;
