import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide } from "d3";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import { FONT, TEXT_MUTED } from "./workflowConstants";
import { styleForType, findHubId, normalizeGraph, HUB_STROKE, HUB_RADIUS } from "./subgraphStyle";

/**
 * Interactive knowledge-graph canvas.
 *
 * Replaces the fixed SVG that placed nodes on hard-coded concentric rings.
 * Testing reported it as "static / tightly packed": nothing could be moved,
 * labels overlapped once there were more than a handful of nodes, and there
 * was no way to zoom in. This uses a force layout so nodes spread out on
 * their own, and supports drag (nodes), scroll-zoom and pan, with zoom / fit
 * controls in the corner.
 */

const BACKGROUND = "#0F172A";
const LINK_COLOR = "rgba(148,163,184,0.35)";
const LABEL_COLOR = "#D1D9E6";

// Canvas sizes are in graph units; the SVG radii were tuned for an 840px wide
// picture, so they are scaled down to keep nodes from dominating the layout.
const NODE_SCALE = 0.5;

// Edge labels are only legible once zoomed in; drawing them at every zoom level
// is what made the old picture look packed.
const LINK_LABEL_MIN_ZOOM = 1.6;

const ControlButton = ({ title, onClick, children }) => (
  <Tooltip title={title} placement="left">
    <IconButton
      size="small"
      onClick={onClick}
      aria-label={title}
      sx={{
        bgcolor: "rgba(30,41,59,0.85)",
        color: "#E2E8F0",
        "&:hover": { bgcolor: "rgba(51,65,85,0.95)" },
        width: 30,
        height: 30,
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

const KnowledgeGraphCanvas = ({ graph, height = 420, onNodeClick }) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const fittedRef = useRef(false);
  const [width, setWidth] = useState(0);

  // Track the container width so the canvas fills the card and the new-tab
  // view, and follows window resizes.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ForceGraph mutates the objects it is given (adds x/y/vx/vy and swaps link
  // ids for node references), so it gets copies rather than the API payload.
  // Links pointing at a node that isn't in the payload would crash the layout,
  // so they are dropped.
  const data = useMemo(() => {
    const { nodes, edges } = normalizeGraph(graph);
    const hubId = findHubId(nodes, edges);
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes: nodes.map((n) => ({ ...n, __hub: n.id === hubId })),
      links: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    };
  }, [graph]);

  // A new graph (e.g. after a node expansion) should be framed again once it
  // settles.
  useEffect(() => {
    fittedRef.current = false;
  }, [data]);

  // Spread nodes out: stronger repulsion, longer links, and a collision radius
  // so labels don't sit on top of each other.
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-260);
    fg.d3Force("link")?.distance(70);
    fg.d3Force(
      "collide",
      forceCollide((node) => radiusOf(node) + 14)
    );
    fg.d3ReheatSimulation();
  }, [data, width]);

  const handleEngineStop = useCallback(() => {
    if (fittedRef.current) return;
    fittedRef.current = true;
    graphRef.current?.zoomToFit(400, 40);
  }, []);

  const zoomBy = (factor) => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.zoom(fg.zoom() * factor, 250);
  };

  const drawNode = useCallback((node, ctx, globalScale) => {
    const radius = radiusOf(node);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = styleForType(node.type).color;
    ctx.fill();
    if (node.__hub) {
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = HUB_STROKE;
      ctx.stroke();
    }

    // Keep labels a constant on-screen size regardless of zoom.
    const fontSize = (node.__hub ? 12 : 10) / globalScale;
    ctx.font = `${node.__hub ? 600 : 500} ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = LABEL_COLOR;
    ctx.fillText(node.label || node.id, node.x, node.y + radius + 2 / globalScale);
  }, []);

  const paintHitArea = useCallback((node, color, ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radiusOf(node) + 2, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  const drawLinkLabel = useCallback((link, ctx, globalScale) => {
    const label = typeof link.label === "string" ? link.label.trim() : "";
    if (!label || globalScale < LINK_LABEL_MIN_ZOOM) return;
    const { source, target } = link;
    if (typeof source !== "object" || typeof target !== "object") return;
    ctx.font = `${9 / globalScale}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(label, (source.x + target.x) / 2, (source.y + target.y) / 2);
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", width: "100%", height, borderRadius: "12px", overflow: "hidden", bgcolor: BACKGROUND }}
    >
      {width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={width}
          height={height}
          backgroundColor={BACKGROUND}
          nodeId="id"
          nodeLabel={(node) => `${node.label || node.id}${node.type ? ` (${node.type})` : ""}`}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={paintHitArea}
          linkColor={() => LINK_COLOR}
          linkWidth={1}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={drawLinkLabel}
          cooldownTicks={150}
          onEngineStop={handleEngineStop}
          onNodeClick={onNodeClick ? (node) => onNodeClick(node.id) : undefined}
          onNodeDragEnd={(node) => {
            // Pin a dragged node where it was dropped so the user's arrangement sticks.
            node.fx = node.x;
            node.fy = node.y;
          }}
        />
      )}

      <Box sx={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: "6px" }}>
        <ControlButton title="Zoom in" onClick={() => zoomBy(1.4)}>
          <ZoomInIcon sx={{ fontSize: 18 }} />
        </ControlButton>
        <ControlButton title="Zoom out" onClick={() => zoomBy(1 / 1.4)}>
          <ZoomOutIcon sx={{ fontSize: 18 }} />
        </ControlButton>
        <ControlButton title="Fit to view" onClick={() => graphRef.current?.zoomToFit(400, 40)}>
          <CenterFocusStrongIcon sx={{ fontSize: 18 }} />
        </ControlButton>
      </Box>

      <Typography
        sx={{
          position: "absolute",
          left: 12,
          bottom: 8,
          fontFamily: FONT,
          fontSize: "11px",
          color: TEXT_MUTED,
          pointerEvents: "none",
        }}
      >
        Scroll to zoom · drag to pan · drag a node to move it
      </Typography>
    </Box>
  );
};

/** Colour key for the node types on the canvas. See buildLegend. */
export const GraphLegend = ({ entries }) =>
  entries.length > 0 && (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", mt: "10px" }}>
      {entries.map((entry) => (
        <Box key={entry.label} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: entry.color,
            }}
          />
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>{entry.label}</Typography>
        </Box>
      ))}
    </Box>
  );

function radiusOf(node) {
  return (node.__hub ? HUB_RADIUS : styleForType(node.type).radius) * NODE_SCALE;
}

export default KnowledgeGraphCanvas;
