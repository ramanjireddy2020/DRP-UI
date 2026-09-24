import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Typography, IconButton, Button } from "@mui/material";
import {
  MessageSquare,
  FileText,
  GitBranch,
  Share2,
  ChevronDown,
  Sparkles,
  ChevronUp,
} from "lucide-react";

// Design tokens matching Figma
const FONT = "'Geist', 'Inter', sans-serif";
const TEAL = "#00BCD4";
const GRAY_BG = "#F8FAFC";
const BORDER = "#E2E8F0";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const SIDEBAR_BG = "#F5F8FA";

const CompleteWorkflowPage = () => {
  const location = useLocation();
  const query = location.state?.query || "Find protein targets associated with Type 2 Diabetes for drug repurposing";
  
  const [activeTab, setActiveTab] = useState("chat");
  const [txkgExpanded, setTxkgExpanded] = useState(true);
  const [discoverExpanded, setDiscoverExpanded] = useState(true);
  const [metapathExpanded, setMetapathExpanded] = useState(true);

  // Mock targets data
  const TARGETS = [
    { id: "P37231", name: "PPARG receptor", score: "89.00", highlight: true },
    { id: "P27487", name: "DPP4", score: "84.00" },
    { id: "P43220", name: "Thrombospondin", score: "39.00" },
    { id: "Q8TDF5", name: "Interleukin-5 receptor", score: "33.00" },
    { id: "P06213", name: "Cytokine receptor common subunit beta", score: "23.00" },
    { id: "Q13131", name: "Granulocyte colony-stimulating factor receptor", score: "22.00" },
    { id: "Q86V97", name: "Macrophage colony-stimulating factor 1 receptor", score: "23.00" },
    { id: "P78552", name: "Interleukin-9 receptor", score: "21.00" },
    { id: "P42345", name: "Phosphatidylinositol 3,4,5-trisphosphate 5-phosphatase 2", score: "21.00" },
    { id: "P42336", name: "Cathrin-associated mediating protein 22", score: "21.00" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100vh", bgcolor: GRAY_BG, fontFamily: FONT }}>
      {/* ═══════════════════ TOP NAV (Breadcrumb) ═══════════════════ */}
      <Box sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        height: "49px",
        bgcolor: "#FFFFFF",
        borderBottom: `1px solid ${BORDER}`,
        boxSizing: "border-box",
      }}>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", color: "#94A3B8" }}>
            New Project
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", color: "#CBD5E1" }}>
            /
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", color: "#94A3B8" }}>
            Type 2 Diabetes
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", color: "#CBD5E1" }}>
            /
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", fontWeight: 600, color: TEXT_DARK }}>
            JAK2 Query
          </Typography>
        </Box>
      </Box>

      {/* ═══════════════════ APP TOOLBAR (Tabs) ═══════════════════ */}
      <Box sx={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "24px 0px 0px",
        height: "92px",
        bgcolor: "#FFFFFF",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Box sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "0px 32px",
          gap: "16px",
          width: "100%",
          height: "44px",
        }}>
          {/* Left tabs */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
            {/* Pill tabs container */}
            <Box sx={{
              display: "flex",
              alignItems: "flex-start",
              padding: "4px",
              bgcolor: "#F0F2F5",
              borderRadius: "22px",
              gap: "0px",
            }}>
              {/* Chat tab (active) */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                padding: "5px 12px",
                gap: "6px",
                bgcolor: TEXT_DARK,
                borderRadius: "20px",
                cursor: "pointer",
              }}>
                <MessageSquare size={12} color="#FFFFFF" />
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, lineHeight: "17px", color: "#FFFFFF" }}>
                  Chat
                </Typography>
              </Box>

              {/* Artifacts tab */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                gap: "6px",
                cursor: "pointer",
              }}>
                <FileText size={14} color={TEXT_MUTED} />
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, lineHeight: "17px", color: "#475569" }}>
                  Artifacts
                </Typography>
                <Box sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "18px",
                  height: "18px",
                  bgcolor: "#F1F5F9",
                  borderRadius: "9px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, lineHeight: "13px", color: "#475569" }}>
                    1
                  </Typography>
                </Box>
              </Box>

              {/* Lineage tab */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                gap: "6px",
                cursor: "pointer",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, lineHeight: "17px", color: "#475569" }}>
                  Lineage
                </Typography>
              </Box>
            </Box>

            {/* Target identification query tab */}
            <Box sx={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              gap: "8px",
              height: "44px",
            }}>
              <Box sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "20px",
                height: "20px",
                bgcolor: TEAL,
                borderRadius: "10px",
              }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, lineHeight: "13px", color: "#FFFFFF" }}>
                  1
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, lineHeight: "17px", color: TEXT_DARK }}>
                Target identification query
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", lineHeight: "17px", color: "#94A3B8" }}>
                / 1
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Box sx={{ width: 6, height: 6, bgcolor: "#FFC107", borderRadius: "50%" }} />
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", lineHeight: "14px", color: "#475569" }}>
                    Searching databases
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right: Branch selector + Share */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", color: TEXT_MUTED }}>
              BRANCH
            </Typography>
            <Box sx={{
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "3px 8px",
              gap: "6px",
              bgcolor: GRAY_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: "6px",
              cursor: "pointer",
            }}>
              <GitBranch size={12} color="#475569" />
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 500, lineHeight: "16px", color: TEXT_DARK }}>
                Main
              </Typography>
              <ChevronDown size={12} color={TEXT_MUTED} />
            </Box>

            <Box sx={{
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "6px 14px",
              gap: "6px",
              border: `1px solid ${BORDER}`,
              borderRadius: "8px",
              cursor: "pointer",
            }}>
              <Share2 size={14} color="#475569" />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, lineHeight: "17px", color: "#475569" }}>
                Share
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ═══════════════════ CONTENT WITH STEPPER ═══════════════════ */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Vertical Stepper Sidebar */}
        <Box sx={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "30px 0px 0px",
          width: "180px",
          bgcolor: SIDEBAR_BG,
          border: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          {/* Active Step (TxKG - step 3) */}
          <Box sx={{ display: "flex", width: "100%", height: "42px", position: "relative" }}>
            <Box sx={{ width: "3px", height: "42px", bgcolor: TEAL }} />
            <Box sx={{ display: "flex", alignItems: "center", padding: "0px 0px 0px 13px", width: "36px" }}>
              <Box sx={{ boxSizing: "border-box", width: "20px", height: "0px", border: `1.5px solid ${TEAL}` }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Box sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "3px 8px",
                bgcolor: TEAL,
                borderRadius: "11px",
              }}>
                <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700, lineHeight: "15px", color: "#FFFFFF" }}>
                  03
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: 700, lineHeight: "18px", color: TEAL }}>
                TxKG
              </Typography>
            </Box>
          </Box>

          {/* Connector dots */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 0px", gap: "4px", width: "54px", height: "18px", ml: "16px" }}>
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
          </Box>

          {/* Step 4 */}
          <Box sx={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: "12px", height: "33px", width: "100%" }}>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: "17px", color: "#94A3B8" }}>
              ScreenSuite
            </Typography>
          </Box>

          {/* Connector dots */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 0px", gap: "4px", width: "54px", height: "18px", ml: "16px" }}>
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
            <Box sx={{ width: 3, height: 3, bgcolor: "#D0D8E4", borderRadius: "50%" }} />
          </Box>

          {/* Step 5 */}
          <Box sx={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: "12px", height: "33px", width: "100%" }}>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: "17px", color: "#94A3B8" }}>
              NoveltySearch
            </Typography>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          flex: 1,
          overflow: "auto",
        }}>
          {/* Chat Flow Container */}
          <Box sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "24px 40px 40px",
            width: "100%",
            boxSizing: "border-box",
          }}>
            {/* Messages List */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", width: "100%" }}>
              {/* User Message */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", padding: "8px 0px", width: "100%" }}>
                <Box sx={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "16px",
                  gap: "8px",
                  maxWidth: "680px",
                  bgcolor: "#F0FDF9",
                  border: "1px solid rgba(226, 232, 240, 0.3)",
                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.03)",
                  borderRadius: "12px",
                }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, lineHeight: "14px", textTransform: "uppercase", color: TEAL }}>
                    DR. PRIYA (YOU)
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", lineHeight: "22px", color: TEXT_DARK }}>
                    {query}
                  </Typography>
                </Box>
              </Box>

              {/* Agent Thinking Message */}
              <Box sx={{ display: "flex", alignItems: "flex-start", padding: "8px 0px", width: "100%" }}>
                <Box sx={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "20px",
                  gap: "14px",
                  width: "100%",
                  bgcolor: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.0392157)",
                  borderRadius: "12px",
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Box sx={{
                      boxSizing: "border-box",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "32px",
                      height: "32px",
                      bgcolor: "#F0FDFB",
                      border: `1.5px solid ${TEAL}`,
                      borderRadius: "8px",
                    }}>
                      <Sparkles size={14} color={TEAL} />
                    </Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, lineHeight: "14px", textTransform: "uppercase", color: TEXT_DARK }}>
                      DRP TXKG AGENT
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: TEAL, borderRadius: "50%" }} />
                      <Box sx={{ width: 8, height: 8, bgcolor: TEAL, opacity: 0.5, borderRadius: "50%" }} />
                      <Box sx={{ width: 8, height: 8, bgcolor: TEAL, opacity: 0.2, borderRadius: "50%" }} />
                    </Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: "14px", lineHeight: "18px", color: "#475569" }}>
                      Searching biomedical databases (NCBI, UniProt, TxKG relations)...
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Chat Input Bar */}
            <Box sx={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "16px",
              gap: "12px",
              width: "100%",
              maxWidth: "980px",
              bgcolor: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.0392157)",
              borderRadius: "12px",
              mt: "24px",
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", lineHeight: "18px", color: "#94A3B8" }}>
                Type @ for agents or ask a research question...
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Box sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    padding: "6px",
                    bgcolor: "#F1F5F9",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 3.5V10.5M3.5 7H10.5" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Box>
                </Box>
                <Box sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "32px",
                  height: "32px",
                  bgcolor: TEXT_DARK,
                  borderRadius: "16px",
                  cursor: "pointer",
                }}>
                  <Box sx={{
                    boxSizing: "border-box",
                    width: "10px",
                    height: "10px",
                    border: "1.5px solid #FFFFFF",
                    borderRadius: "2px",
                  }} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CompleteWorkflowPage;
