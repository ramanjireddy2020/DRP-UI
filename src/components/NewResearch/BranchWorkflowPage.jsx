import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Typography, IconButton, Button, TextField } from "@mui/material";
import {
  ChatBubbleOutlineOutlined,
  ArticleOutlined,
  TimelineOutlined,
  ShareOutlined,
  KeyboardArrowUpOutlined,
  ExpandMoreOutlined,
  ExpandLessOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";

// Design tokens
const FONT = "'Inter', sans-serif";
const TEAL = "#0ABFBC";
const GRAY_BG = "#F8FAFC";
const BORDER = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";
const SIDEBAR_BG = "#F1F5F9";
const ACTIVE_STEP_BG = "#E0F8F7";

// Workflow steps
const WORKFLOW_STEPS = [
  { id: 1, number: "01", label: "Targets", active: true },
  { id: 2, number: "02", label: "Literature", active: false },
  { id: 3, number: "03", label: "Drugs", active: false },
  { id: 4, number: "04", label: "Screen", active: false },
  { id: 5, number: "05", label: "Novelty", active: false },
  { id: 6, number: "06", label: "Docs", active: false },
];

// Mock target data
const MOCK_TARGETS = [
  { rank: 1, protein: "PPARG receptor", score: "89.00", selected: true },
  { rank: 2, protein: "DPP4", score: "84.00", selected: true },
  { rank: 3, protein: "Thrombopondin", score: "39.00", selected: false },
  { rank: 4, protein: "JAK2", score: "33.00", selected: true },
  { rank: 5, protein: "Interleukin-5 receptor", score: "33.00", selected: false },
  { rank: 6, protein: "Cytokine receptor common subunit beta", score: "23.00", selected: false },
  { rank: 7, protein: "Granulocyte colony-stimulating factor receptor", score: "22.00", selected: false },
  { rank: 8, protein: "Macrophage colony-stimulating factor 1 receptor", score: "23.00", selected: false },
  { rank: 9, protein: "Interleukin-9 receptor", score: "21.00", selected: false },
  { rank: 10, protein: "Cathrin-associated mediating protein 22", score: "21.00", selected: false },
];

const BranchWorkflowPage = () => {
  const location = useLocation();
  const query = location.state?.query || "find protein targets for diabetes";
  
  const [loadingPhase, setLoadingPhase] = useState("loading"); // loading, results, targetSelection, literature
  const [activeStep, setActiveStep] = useState(1);
  const [branchOpen, setBranchOpen] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [txkgExpanded, setTxkgExpanded] = useState(true);
  const [subgraphExpanded, setSubgraphExpanded] = useState(false);
  const [metapathExpanded, setMetapathExpanded] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState([1, 2, 4]); // Selected target ranks (PPARG, DPP4, JAK2)
  const [interpretationExpanded, setInterpretationExpanded] = useState(true);
  const [customTargetInput, setCustomTargetInput] = useState("");

  // Auto-progress from loading to results
  React.useEffect(() => {
    if (loadingPhase === "loading") {
      const timer = setTimeout(() => {
        setLoadingPhase("results");
      }, 3000); // 3 seconds loading
      return () => clearTimeout(timer);
    }
  }, [loadingPhase]);

  const currentStepData = WORKFLOW_STEPS.find(s => s.id === activeStep);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FFFFFF", fontFamily: FONT }}>
      {/* ═══════════════════ TOP HEADER BAR ═══════════════════ */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: "24px", py: "12px", borderBottom: `1px solid ${BORDER}`,
        bgcolor: "#FFFFFF", flexShrink: 0,
      }}>
        {/* Left: Branch + Step */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Branch selector */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              BRANCH
            </Typography>
            <Box
              onClick={() => setBranchOpen(!branchOpen)}
              sx={{
                display: "flex", alignItems: "center", gap: "6px",
                px: "10px", py: "4px",
                border: `1px solid ${BORDER}`, borderRadius: "6px",
                bgcolor: "#FFFFFF", cursor: "pointer",
                "&:hover": { bgcolor: GRAY_BG },
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: "50%",
                bgcolor: TEAL, flexShrink: 0,
              }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: TEXT_DARK }}>
                Main
              </Typography>
              <ExpandMoreOutlined sx={{ fontSize: 16, color: TEXT_MUTED }} />
            </Box>
          </Box>

          {/* Current step indicator */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: "50%",
              bgcolor: TEAL, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>
                {currentStepData?.number}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEXT_DARK }}>
              Target identification
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
              / 6
            </Typography>
          </Box>

          {/* Status badges */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", ml: "8px" }}>
            <Box sx={{
              display: "flex", alignItems: "center", gap: "4px",
              px: "8px", py: "3px", borderRadius: "12px",
              bgcolor: "#D1FAE5",
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10B981" }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#059669" }}>
                Lit 0 accepted
              </Typography>
            </Box>
            <Box sx={{
              display: "flex", alignItems: "center", gap: "4px",
              px: "8px", py: "3px", borderRadius: "12px",
              bgcolor: "#FEF3C7",
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#D97706" }}>
                2 pending
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right: Action buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            startIcon={<ChatBubbleOutlineOutlined sx={{ fontSize: 16 }} />}
            sx={{
              px: "12px", py: "6px", borderRadius: "8px",
              bgcolor: TEXT_DARK, color: "#FFFFFF",
              textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600,
              "&:hover": { bgcolor: "#1E293B" },
            }}
          >
            Chat
          </Button>
          <Button
            startIcon={<ArticleOutlined sx={{ fontSize: 16 }} />}
            endIcon={
              <Box sx={{
                minWidth: 18, height: 18, borderRadius: "10px",
                bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: "#FFFFFF" }}>1</Typography>
              </Box>
            }
            sx={{
              px: "12px", py: "6px", borderRadius: "8px",
              border: `1px solid ${BORDER}`, bgcolor: "#FFFFFF", color: TEXT_DARK,
              textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600,
              "&:hover": { bgcolor: GRAY_BG },
            }}
          >
            Artifacts
          </Button>
          <IconButton
            size="small"
            sx={{
              width: 32, height: 32, borderRadius: "8px",
              border: `1px solid ${BORDER}`, bgcolor: "#FFFFFF",
              color: TEXT_MUTED,
              "&:hover": { bgcolor: GRAY_BG },
            }}
          >
            <TimelineOutlined sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              width: 32, height: 32, borderRadius: "8px",
              border: `1px solid ${BORDER}`, bgcolor: "#FFFFFF",
              color: TEXT_MUTED,
              "&:hover": { bgcolor: GRAY_BG },
            }}
          >
            <ShareOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* ═══════════════════ MAIN CONTENT AREA ═══════════════════ */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT SIDEBAR - Workflow Steps */}
        <Box sx={{
          width: "280px", flexShrink: 0,
          bgcolor: SIDEBAR_BG, borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column",
        }}>
          {/* Query title */}
          <Box sx={{ px: "20px", py: "16px", borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEXT_DARK, lineHeight: 1.4 }}>
              {query}
            </Typography>
          </Box>

          {/* Steps list */}
          <Box sx={{ flex: 1, overflowY: "auto", py: "8px" }}>
            {WORKFLOW_STEPS.map((step) => (
              <Box
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                sx={{
                  display: "flex", alignItems: "center", gap: "12px",
                  px: "20px", py: "12px", mx: "8px", mb: "4px",
                  borderRadius: "8px", cursor: "pointer",
                  bgcolor: step.id === activeStep ? ACTIVE_STEP_BG : "transparent",
                  borderLeft: step.id === activeStep ? `3px solid ${TEAL}` : "3px solid transparent",
                  "&:hover": { bgcolor: step.id === activeStep ? ACTIVE_STEP_BG : "#E2E8F0" },
                }}
              >
                <Box sx={{
                  width: 32, height: 32, borderRadius: "50%",
                  bgcolor: step.id === activeStep ? TEAL : "#FFFFFF",
                  border: step.id === activeStep ? "none" : `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Typography sx={{
                    fontFamily: FONT, fontSize: "12px", fontWeight: 700,
                    color: step.id === activeStep ? "#FFFFFF" : TEXT_MUTED,
                  }}>
                    {step.number}
                  </Typography>
                </Box>
                <Typography sx={{
                  fontFamily: FONT, fontSize: "14px", fontWeight: step.id === activeStep ? 600 : 500,
                  color: step.id === activeStep ? TEXT_DARK : TEXT_MUTED,
                }}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* MAIN CONTENT - Results Area */}
        <Box sx={{
          flex: 1, display: "flex", flexDirection: "column",
          bgcolor: GRAY_BG, overflow: "hidden",
        }}>
          {/* Scrollable content */}
          <Box sx={{ flex: 1, overflowY: "auto", px: "32px", py: "24px" }}>
            
            {/* ═══════════ LOADING STATE (Image 1) ═══════════ */}
            {loadingPhase === "loading" && (
              <Box sx={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: "100%", gap: "24px",
              }}>
                <Box sx={{
                  width: 48, height: 48, border: `4px solid ${BORDER}`,
                  borderTop: `4px solid ${TEAL}`, borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }} />
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>
                    INOVAPATH TXKG AGENT
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK }}>
                    Searching biomedical databases (NCBI, UniProt, TxKG national...
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ═══════════ RESULTS STATE (Image 2) ═══════════ */}
            {loadingPhase === "results" && (
              <>
                {/* User query header */}
                <Box sx={{
                  bgcolor: "#E0F8F7", border: `1px solid ${TEAL}20`,
                  borderRadius: "12px", p: "16px", mb: "20px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>
                    DR. PRIYA (YOU)
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, lineHeight: 1.6 }}>
                    {query}
                  </Typography>
                </Box>

                {/* TXKG Expandable Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", overflow: "hidden", mb: "16px",
                }}>
                  <Box
                    onClick={() => setTxkgExpanded(!txkgExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      bgcolor: "#FFFFFF",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>
                      TXKG
                    </Typography>
                    {txkgExpanded ? (
                      <ExpandLessOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    ) : (
                      <ExpandMoreOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    )}
                  </Box>
                  {txkgExpanded && (
                    <Box sx={{ px: "20px", pb: "20px" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.7, mb: "16px" }}>
                        I found 10 protein targets strongly associated with Type 2 Diabetes pathways. Here are the top candidates ranked by therapeutic relevance:
                      </Typography>
                      
                      <Box sx={{ display: "flex", gap: "16px" }}>
                        {/* Results Table */}
                        <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                          {/* Table Header */}
                          <Box sx={{
                            display: "grid", gridTemplateColumns: "100px 1fr 100px",
                            gap: "16px", px: "16px", py: "10px",
                            bgcolor: GRAY_BG, borderBottom: `1px solid ${BORDER}`,
                          }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>UNIPROT ID</Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>TARGET</Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", textAlign: "right" }}>SCORE</Typography>
                          </Box>
                          {/* Table Rows */}
                          {MOCK_TARGETS.map((target, idx) => (
                            <Box
                              key={target.id}
                              sx={{
                                display: "grid", gridTemplateColumns: "100px 1fr 100px",
                                gap: "16px", px: "16px", py: "12px",
                                bgcolor: target.selected ? "#F0FDFC" : "#FFFFFF",
                                borderBottom: idx < MOCK_TARGETS.length - 1 ? `1px solid ${BORDER}` : "none",
                                cursor: "pointer",
                                "&:hover": { bgcolor: target.selected ? "#E0F8F7" : GRAY_BG },
                              }}
                            >
                              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#2563EB" }}>
                                {target.id}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
                                  {target.protein}
                                </Typography>
                                {target.tag && (
                                  <Box sx={{ px: "6px", py: "2px", borderRadius: "4px", bgcolor: "#D1FAE5" }}>
                                    <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: "#059669" }}>
                                      {target.tag}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textAlign: "right" }}>
                                {target.score}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        {/* Insights Panel */}
                        <Box sx={{ width: "300px", border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden", bgcolor: "#FFFFFF" }}>
                          <Box sx={{ px: "16px", py: "12px", borderBottom: `1px solid ${BORDER}` }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEXT_DARK }}>
                              Insights
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
                            {["Interpretation", "Recommendations", "Sources"].map((tab, i) => (
                              <Box
                                key={tab}
                                sx={{
                                  flex: 1, py: "8px", textAlign: "center", cursor: "pointer",
                                  borderBottom: i === 0 ? `2px solid ${TEAL}` : "2px solid transparent",
                                  mb: "-1px",
                                }}
                              >
                                <Typography sx={{
                                  fontFamily: FONT, fontSize: "11px",
                                  fontWeight: i === 0 ? 700 : 500,
                                  color: i === 0 ? TEAL : TEXT_MUTED,
                                }}>
                                  {tab}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                          <Box sx={{ px: "16px", py: "12px" }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, lineHeight: 1.6 }}>
                              The predicted therapeutic targets for Type 2 Diabetes suggest a potential mechanism involving insulin signaling pathways, particularly JAK2 and DPP4.
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Action buttons */}
                      <Box sx={{ display: "flex", gap: "10px", mt: "16px" }}>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Branch
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Rerun
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Export
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* SUBGRAPH Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", overflow: "hidden", mb: "16px",
                }}>
                  <Box
                    onClick={() => setSubgraphExpanded(!subgraphExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>
                      SUB GRAPH
                    </Typography>
                    {subgraphExpanded ? (
                      <ExpandLessOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    ) : (
                      <ExpandMoreOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    )}
                  </Box>
                  {subgraphExpanded && (
                    <Box sx={{ px: "20px", pb: "20px" }}>
                      <Box sx={{ p: "12px", mb: "16px" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>
                          INOVAPATH DISCOVER AGENT
                        </Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.7 }}>
                          Here is the generated knowledge graph for Type 2 Diabetes. This map illustrates the validated and predicted relationships between JAK2, drug molecules, associated pathways, and overlapping diseases based on TxKG relations:
                        </Typography>
                      </Box>

                      {/* Knowledge Graph Visualization */}
                      <Box sx={{ bgcolor: "#0A1628", borderRadius: "12px", overflow: "hidden", mb: "16px" }}>
                        <svg width="100%" height="350" viewBox="0 0 800 350" style={{ display: "block" }}>
                          {/* Edges */}
                          <line x1="300" y1="120" x2="400" y2="175" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="220" y1="180" x2="400" y2="175" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="300" y1="120" x2="220" y2="180" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="400" y1="175" x2="500" y2="120" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="400" y1="175" x2="550" y2="145" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="400" y1="175" x2="520" y2="200" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="400" y1="175" x2="550" y2="250" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="400" y1="175" x2="650" y2="165" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="180" y1="240" x2="220" y2="180" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="260" y1="260" x2="220" y2="180" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="340" y1="270" x2="400" y2="175" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="520" y1="200" x2="550" y2="250" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="650" y1="165" x2="680" y2="210" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                          <line x1="550" y1="250" x2="580" y2="280" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

                          {/* Nodes */}
                          {/* Type 2 Diabetes - center */}
                          <circle cx="400" cy="175" r="24" fill="#F97316" fillOpacity="0.9" />
                          <text x="400" y="210" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="11" fontFamily="Inter,sans-serif">Type 2 Diabetes</text>

                          {/* Proteins - Orange */}
                          <circle cx="300" cy="120" r="18" fill="#F97316" fillOpacity="0.9" />
                          <text x="300" y="105" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="10" fontFamily="Inter,sans-serif">JAK2</text>
                          
                          <circle cx="220" cy="180" r="18" fill="#F97316" fillOpacity="0.9" />
                          <text x="220" y="165" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="10" fontFamily="Inter,sans-serif">SGLT2</text>

                          <circle cx="500" cy="120" r="18" fill="#F97316" fillOpacity="0.9" />
                          <text x="500" y="105" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="10" fontFamily="Inter,sans-serif">DPP4</text>

                          <circle cx="550" cy="145" r="16" fill="#F97316" fillOpacity="0.9" />
                          <text x="550" y="130" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">INSR</text>

                          <circle cx="650" cy="165" r="18" fill="#F97316" fillOpacity="0.9" />
                          <text x="650" y="150" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="10" fontFamily="Inter,sans-serif">GLP1R</text>

                          {/* Pathways - Teal */}
                          <circle cx="520" cy="200" r="16" fill="#0ABFBC" fillOpacity="0.9" />
                          <text x="520" y="225" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Insulin Sig.</text>

                          <circle cx="550" cy="250" r="16" fill="#0ABFBC" fillOpacity="0.9" />
                          <text x="550" y="275" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">JAK-STAT</text>

                          {/* Compounds - Purple */}
                          <circle cx="180" cy="240" r="16" fill="#A855F7" fillOpacity="0.9" />
                          <text x="180" y="265" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Ruxolitinib</text>

                          <circle cx="260" cy="260" r="16" fill="#A855F7" fillOpacity="0.9" />
                          <text x="260" y="285" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Metformin</text>

                          <circle cx="340" cy="270" r="16" fill="#A855F7" fillOpacity="0.9" />
                          <text x="340" y="295" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Imatinib</text>

                          {/* Comorbidity - Pink */}
                          <circle cx="680" cy="210" r="16" fill="#EC4899" fillOpacity="0.9" />
                          <text x="680" y="235" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Obesity</text>

                          <circle cx="580" cy="280" r="14" fill="#EC4899" fillOpacity="0.9" />
                          <text x="580" y="305" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9" fontFamily="Inter,sans-serif">Type 2 Diabetes</text>
                        </svg>

                        {/* Legend */}
                        <Box sx={{ display: "flex", gap: "14px", px: "16px", pb: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", pt: "10px", flexWrap: "wrap" }}>
                          {[
                            { color: "#F97316", label: "Disease Hub" },
                            { color: "#F97316", label: "Protein" },
                            { color: "#0ABFBC", label: "Pathway" },
                            { color: "#A855F7", label: "Compound" },
                            { color: "#EC4899", label: "Comorbidity" },
                          ].map((item, i) => (
                            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                              <Typography sx={{ fontFamily: FONT, fontSize: "10px", color: "rgba(255,255,255,0.55)" }}>{item.label}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Stats */}
                      <Box sx={{ display: "flex", gap: "32px", mb: "16px" }}>
                        {[
                          { label: "RELATIONSHIPS FOUND", value: "52 relations" },
                          { label: "DRUG CANDIDATES", value: "15 candidates" },
                          { label: "PATHWAY CONNECTIONS", value: "10 connections" },
                        ].map((stat, i) => (
                          <Box key={i}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px", mb: "4px" }}>
                              {stat.label}
                            </Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: TEXT_DARK }}>
                              {stat.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Action buttons */}
                      <Box sx={{ display: "flex", gap: "10px" }}>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Branch
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Rerun
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Export
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* METAPATH Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", overflow: "hidden", mb: "16px",
                }}>
                  <Box
                    onClick={() => setMetapathExpanded(!metapathExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>
                      METAPATH
                    </Typography>
                    {metapathExpanded ? (
                      <ExpandLessOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    ) : (
                      <ExpandMoreOutlined sx={{ fontSize: 20, color: TEXT_MUTED }} />
                    )}
                  </Box>
                  {metapathExpanded && (
                    <Box sx={{ px: "20px", pb: "20px" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK, mb: "16px" }}>
                        TxKG — Meta-Path Analysis
                      </Typography>

                      {/* Stats bar */}
                      <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap", mb: "20px" }}>
                        {[
                          { n: "12", l: "Paths" },
                          { n: "8", l: "Targets" },
                          { n: "5", l: "Pathways" },
                          { n: "1.5", l: "Avg/Target" },
                          { n: "24", l: "Nodes" },
                          { n: "38", l: "Edges" },
                          { n: "4", l: "Clusters" },
                        ].map((stat, i) => (
                          <Box key={i} sx={{
                            display: "flex", alignItems: "baseline", gap: "4px",
                            px: "12px", py: "6px", border: `1px solid ${BORDER}`,
                            borderRadius: "6px", bgcolor: GRAY_BG,
                          }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK }}>
                              {stat.n}
                            </Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>
                              {stat.l}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Two columns */}
                      <Box sx={{ display: "flex", gap: "16px", mb: "16px" }}>
                        {/* Left: Target Prediction Scores */}
                        <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                          <Box sx={{ px: "14px", py: "10px", borderBottom: `1px solid ${BORDER}`, bgcolor: GRAY_BG }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Target Prediction Scores
                            </Typography>
                          </Box>
                          {[
                            { gene: "PPARG", name: "Peroxisome proliferator-activated receptor gamma", score: 92 },
                            { gene: "DPP4", name: "Dipeptidyl peptidase-4", score: 87 },
                            { gene: "GLP1R", name: "Glucagon-like peptide-1 receptor", score: 79 },
                            { gene: "SGLT2", name: "Sodium-glucose co-transporter 2", score: 71 },
                            { gene: "INSR", name: "Insulin receptor", score: 65 },
                          ].map((target, i) => (
                            <Box key={i} sx={{
                              display: "flex", alignItems: "center", gap: "10px",
                              px: "14px", py: "12px", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none",
                            }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEXT_DARK }}>
                                  {target.gene}
                                </Typography>
                                <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, mt: "2px" }}>
                                  {target.name}
                                </Typography>
                              </Box>
                              <Box sx={{
                                width: 38, height: 38, borderRadius: "50%",
                                bgcolor: TEAL, display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
                                  {target.score}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>

                        {/* Right: Meta-Path Traversals */}
                        <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
                          <Box sx={{ px: "14px", py: "10px", borderBottom: `1px solid ${BORDER}`, bgcolor: GRAY_BG }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Meta-Path Traversals
                            </Typography>
                          </Box>
                          {[
                            { gene: "PPARG", paths: ["T2D → PPARG", "T2D → Insulin resistance → PPARG", "T2D → Thiazolidinediones → PPARG"], score: 92 },
                            { gene: "DPP4", paths: ["T2D → GLP-1 → DPP4"], score: 87 },
                            { gene: "GLP1R", paths: ["T2D → Incretin → GLP1R"], score: 79 },
                            { gene: "SGLT2", paths: ["T2D → Glucose → SGLT2"], score: 71 },
                            { gene: "INSR", paths: ["T2D → Insulin sig. → INSR"], score: 65 },
                          ].map((target, i) => (
                            <Box key={i} sx={{
                              display: "flex", alignItems: "flex-start", gap: "10px",
                              px: "14px", py: "12px", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none",
                            }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEXT_DARK, mb: "6px" }}>
                                  {target.gene}
                                </Typography>
                                {target.paths.map((path, pi) => (
                                  <Typography key={pi} sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, lineHeight: 1.6 }}>
                                    • {path}
                                  </Typography>
                                ))}
                              </Box>
                              <Box sx={{
                                width: 38, height: 38, borderRadius: "50%",
                                bgcolor: TEAL, display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
                                  {target.score}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Action buttons */}
                      <Box sx={{ display: "flex", gap: "10px" }}>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Branch
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Rerun
                        </Button>
                        <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                          Export
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* READY FOR LITERATURE MINING Section */}
                <Box sx={{
                  bgcolor: "#E0F8F7", border: `1px solid ${TEAL}40`,
                  borderRadius: "12px", p: "20px", mb: "16px",
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "12px" }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: TEAL, flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      READY FOR LITERATURE MINING
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.7, mb: "20px" }}>
                    TxKG analysis is complete. Would you like to proceed to LitMinex with the recommended targets, or select specific targets from the identified list?
                  </Typography>

                  <Box sx={{ display: "flex", gap: "16px" }}>
                    {/* Option 1: Proceed with Recommended Targets */}
                    <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "12px", bgcolor: "#FFFFFF", p: "20px" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK, mb: "8px" }}>
                        Proceed with Recommended Targets
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "16px", lineHeight: 1.6 }}>
                        Run LitMinex on all 10 identified targets ranked by therapeutic relevance
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setActiveStep(2);
                          setLoadingPhase("literature");
                        }}
                        fullWidth
                        sx={{
                          textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600,
                          bgcolor: TEAL, py: "10px",
                          "&:hover": { bgcolor: "#089B98" },
                        }}
                      >
                        Use recommended targets
                      </Button>
                    </Box>

                    {/* Option 2: Select Custom Targets */}
                    <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "12px", bgcolor: "#FFFFFF", p: "20px" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK, mb: "8px" }}>
                        Select Custom Targets
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "16px", lineHeight: 1.6 }}>
                        Choose specific targets from the list or enter your own for literature mining
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setLoadingPhase("targetSelection")}
                        fullWidth
                        sx={{
                          textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600,
                          borderColor: BORDER, color: TEXT_DARK, py: "10px",
                          "&:hover": { bgcolor: GRAY_BG, borderColor: BORDER },
                        }}
                      >
                        Select Targets
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </>
            )}

            {/* ═══════════ TARGET SELECTION STATE (Image 3) ═══════════ */}
            {loadingPhase === "targetSelection" && (
              <>
                {/* User query header */}
                <Box sx={{
                  bgcolor: "#E0F8F7", border: `1px solid ${TEAL}20`,
                  borderRadius: "12px", p: "16px", mb: "20px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>
                    DR. PRIYA (YOU)
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, lineHeight: 1.6 }}>
                    {query}
                  </Typography>
                </Box>

                {/* Collapsible TXKG Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", mb: "12px", overflow: "hidden",
                }}>
                  <Box
                    onClick={() => setTxkgExpanded(!txkgExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: "6px",
                        bgcolor: "#E0F8F7", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEAL }}>
                          #
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEXT_DARK }}>
                        TXKG
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {txkgExpanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Collapsible SUBGRAP Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", mb: "12px", overflow: "hidden",
                }}>
                  <Box
                    onClick={() => setSubgraphExpanded(!subgraphExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: "6px",
                        bgcolor: "#E0F8F7", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEAL }}>
                          #
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEXT_DARK }}>
                        SUBGRAP
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {subgraphExpanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Collapsible METAPATH Section */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", mb: "20px", overflow: "hidden",
                }}>
                  <Box
                    onClick={() => setMetapathExpanded(!metapathExpanded)}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: "20px", py: "14px", cursor: "pointer",
                      "&:hover": { bgcolor: GRAY_BG },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: "6px",
                        bgcolor: "#E0F8F7", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEAL }}>
                          #
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEXT_DARK }}>
                        METAPATH
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      {metapathExpanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Target Selection Panel */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", p: "20px", mb: "20px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK, mb: "8px" }}>
                    Select Targets for LitMinex
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, mb: "16px" }}>
                    Choose from the identified targets or add your own
                  </Typography>

                  {/* Target checkboxes */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", mb: "16px" }}>
                    {MOCK_TARGETS.map((target) => (
                      <Box
                        key={target.rank}
                        onClick={() => {
                          setSelectedTargets(prev =>
                            prev.includes(target.rank)
                              ? prev.filter(r => r !== target.rank)
                              : [...prev, target.rank]
                          );
                        }}
                        sx={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          px: "12px", py: "10px", cursor: "pointer",
                          borderRadius: "8px",
                          bgcolor: selectedTargets.includes(target.rank) ? "#E0F8F7" : "#FFFFFF",
                          border: `1px solid ${selectedTargets.includes(target.rank) ? TEAL : BORDER}`,
                          "&:hover": { bgcolor: "#F0FDFC" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Box sx={{
                            width: 20, height: 20, borderRadius: "4px",
                            bgcolor: selectedTargets.includes(target.rank) ? TEAL : "#FFFFFF",
                            border: selectedTargets.includes(target.rank) ? "none" : `2px solid ${BORDER}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {selectedTargets.includes(target.rank) && (
                              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>✓</Typography>
                            )}
                          </Box>
                          <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEXT_DARK }}>
                            {target.protein}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_MUTED }}>
                          {target.score}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Add custom target */}
                  <Box sx={{ mb: "20px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "8px" }}>
                      Add custom target
                    </Typography>
                    <Box sx={{ display: "flex", gap: "8px" }}>
                      <TextField
                        value={customTargetInput}
                        onChange={(e) => setCustomTargetInput(e.target.value)}
                        placeholder="Add custom target (e.g. EGFR, VEGFR2...)"
                        fullWidth
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            fontFamily: FONT,
                            fontSize: "13px",
                            borderRadius: "8px",
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (customTargetInput.trim()) {
                            // Add custom target logic here
                            setCustomTargetInput("");
                          }
                        }}
                        sx={{
                          minWidth: "40px",
                          width: "40px",
                          height: "40px",
                          p: 0,
                          bgcolor: TEAL,
                          borderRadius: "8px",
                          "&:hover": { bgcolor: "#089B98" },
                        }}
                      >
                        <Typography sx={{ fontSize: "20px", fontWeight: 600, color: "#FFFFFF" }}>+</Typography>
                      </Button>
                    </Box>
                  </Box>

                  {/* Bottom bar with counter and action buttons */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: "16px", borderTop: `1px solid ${BORDER}` }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
                      {selectedTargets.length} targets selected
                    </Typography>
                    <Box sx={{ display: "flex", gap: "10px" }}>
                      <Button
                        variant="outlined"
                        onClick={() => setLoadingPhase("results")}
                        sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setActiveStep(2);
                          setLoadingPhase("literature");
                        }}
                        sx={{
                          textTransform: "none", fontFamily: FONT, fontSize: "13px",
                          bgcolor: TEAL,
                          "&:hover": { bgcolor: "#089B98" },
                        }}
                      >
                        Proceed to LitMinex
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </>
            )}

            {/* ═══════════ LITERATURE RESULTS STATE (Image 4) ═══════════ */}
            {loadingPhase === "literature" && (
              <>
                {/* User query header */}
                <Box sx={{
                  bgcolor: "#E0F8F7", border: `1px solid ${TEAL}20`,
                  borderRadius: "12px", p: "16px", mb: "20px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>
                    DR. PRIYA (YOU)
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, lineHeight: 1.6 }}>
                    Mine literature for Type 2 Diabetes drug targets with confidence scoring
                  </Typography>
                </Box>

                {/* Literature agent response */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", p: "20px", mb: "20px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "12px" }}>
                    INOVAPATH LITERATURE AGENT
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.7 }}>
                    Literature mining complete. Found 124 articles across PubMed and clinical databases. Results ranked by confidence score with keyword extraction.
                  </Typography>
                </Box>

                {/* Results table */}
                <Box sx={{
                  bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: "12px", overflow: "hidden",
                }}>
                  <Box sx={{ px: "20px", py: "12px", borderBottom: `1px solid ${BORDER}` }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>
                      Results - 124 articles found
                    </Typography>
                  </Box>

                  {/* Table Header */}
                  <Box sx={{
                    display: "grid", gridTemplateColumns: "40px 2fr 80px 120px 200px 60px",
                    gap: "12px", px: "16px", py: "10px",
                    bgcolor: GRAY_BG, borderBottom: `1px solid ${BORDER}`,
                  }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>#</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Title</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Year</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Confidence Score</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Found Keywords</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Preview</Typography>
                  </Box>

                  {/* Table Rows - Mock data */}
                  {[
                    { rank: 1, title: "Metformin repurposing for JAK2-me...", year: 2024, score: "100%", scoreColor: "#10B981", keywords: "metformin, JAK2, insulin" },
                    { rank: 2, title: "SGLT2 inhibitor mechanisms in pancr...", year: 2023, score: "95%", scoreColor: "#10B981", keywords: "SGLT2, beta-cell" },
                    { rank: 3, title: "GLP-1 receptor agonist effects on he...", year: 2024, score: "94%", scoreColor: "#10B981", keywords: "GLP-1, hepatic glucose" },
                    { rank: 4, title: "PI3K/Akt pathway modulation in Typ...", year: 2022, score: "91%", scoreColor: "#10B981", keywords: "PI3K, Akt, diabetes" },
                    { rank: 5, title: "AMPK activation and glucose transp...", year: 2023, score: "88%", scoreColor: "#D97706", keywords: "AMPK, glucose" },
                    { rank: 6, title: "PPAR-gamma agonists for improving...", year: 2024, score: "85%", scoreColor: "#D97706", keywords: "PPAR-gamma, insulin" },
                    { rank: 7, title: "Genome-wide association studies fo...", year: 2022, score: "82%", scoreColor: "#F97316", keywords: "GWAS, T2D loci" },
                    { rank: 8, title: "DPP-4 inhibitor efficacy in glycemic...", year: 2023, score: "79%", scoreColor: "#DC2626", keywords: "DPP-4, glycemic control" },
                  ].map((article, idx) => (
                    <Box
                      key={article.rank}
                      sx={{
                        display: "grid", gridTemplateColumns: "40px 2fr 80px 120px 200px 60px",
                        gap: "12px", px: "16px", py: "12px",
                        borderBottom: idx < 7 ? `1px solid ${BORDER}` : "none",
                        cursor: "pointer",
                        "&:hover": { bgcolor: GRAY_BG },
                      }}
                    >
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                        {article.rank}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                        {article.title}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                        {article.year}
                      </Typography>
                      <Box sx={{
                        px: "8px", py: "4px", borderRadius: "4px",
                        bgcolor: `${article.scoreColor}20`,
                        display: "inline-block",
                      }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: article.scoreColor }}>
                          {article.score}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
                        {article.keywords}
                      </Typography>
                      <IconButton size="small">
                        <VisibilityOutlined sx={{ fontSize: 16, color: TEXT_MUTED }} />
                      </IconButton>
                    </Box>
                  ))}

                  {/* Pagination */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", py: "16px", borderTop: `1px solid ${BORDER}` }}>
                    <Button size="small" disabled sx={{ minWidth: 32 }}>«</Button>
                    <Button size="small" variant="contained" sx={{ minWidth: 32, bgcolor: TEAL }}>1</Button>
                    <Button size="small" sx={{ minWidth: 32 }}>2</Button>
                    <Button size="small" sx={{ minWidth: 32 }}>3</Button>
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mx: "8px" }}>...</Typography>
                    <Button size="small" sx={{ minWidth: 32 }}>12</Button>
                    <Button size="small" sx={{ minWidth: 32 }}>»</Button>
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, ml: "16px" }}>
                      Showing 1-10 of 47 articles
                    </Typography>
                  </Box>
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: "flex", gap: "10px", mt: "16px" }}>
                  <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                    Branch
                  </Button>
                  <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                    Rerun
                  </Button>
                  <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px" }}>
                    Export
                  </Button>
                </Box>
              </>
            )}
          </Box>

          {/* ═══════════════════ BOTTOM CHAT INPUT ═══════════════════ */}
          <Box sx={{
            borderTop: `1px solid ${BORDER}`,
            bgcolor: "#FFFFFF", px: "32px", py: "16px",
            flexShrink: 0,
          }}>
            <Box sx={{
              display: "flex", alignItems: "center", gap: "12px",
              border: `1px solid ${BORDER}`, borderRadius: "12px",
              bgcolor: GRAY_BG, px: "16px", py: "10px",
            }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Ask a follow-up"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={{
                  "& .MuiInputBase-input": {
                    fontFamily: FONT, fontSize: "14px", color: TEXT_DARK,
                    padding: 0,
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: TEXT_MUTED, opacity: 1,
                  },
                }}
              />
              <IconButton
                size="small"
                sx={{
                  width: 32, height: 32, borderRadius: "50%",
                  bgcolor: TEAL, color: "#FFFFFF",
                  flexShrink: 0,
                  "&:hover": { bgcolor: "#089B98" },
                }}
              >
                <KeyboardArrowUpOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BranchWorkflowPage;
