import React, { useEffect, useState } from 'react';
import './TXKGPhase.css';
import {
  Box, Typography, Button, Tabs, Tab, Checkbox,
  TextField, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton
} from '@mui/material';
import litminexApi from '../../../services/api/litminex';
import { moduleDisplayFor } from '../../../workflow/moduleMap';
import { linksForSource, uniprotUrl } from '../../../workflow/sourceLinks';
import PhaseActions from '../PhaseActions';
import SubgraphView from '../SubgraphView';
import { useCurrentUser } from '../../../context/CurrentUserContext';
import { ExpandMoreOutlined, AddOutlined } from '@mui/icons-material';
import {
  FONT, TEAL, USER_MSG_BG, GRAY_BG, BORDER, BORDER_LIGHT,
  TEXT_DARK, TEXT_MUTED, INSIGHTS_HEADER, ACTIVE_TAB, MOCK_TARGETS,
} from '../workflowConstants';

const SparkleIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M11.9 3.25L13.55 9.1C13.67 9.52 14 9.85 14.42 9.97L20.27 11.62C20.75 11.76 20.75 12.44 20.27 12.58L14.42 14.23C14 14.35 13.67 14.68 13.55 15.1L11.9 20.95C11.76 21.43 11.08 21.43 10.94 20.95L9.29 15.1C9.17 14.68 8.84 14.35 8.42 14.23L2.57 12.58C2.09 12.44 2.09 11.76 2.57 11.62L8.42 9.97C8.84 9.85 9.17 9.52 9.29 9.1L10.94 3.25C11.08 2.77 11.76 2.77 11.9 3.25Z"
      stroke="#00BCD4"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="5.25" cy="18.45" r="1.75" stroke="#00BCD4" strokeWidth="1.65" />
    <path d="M18.45 3.25V7.05M16.55 5.15H20.35" stroke="#00BCD4" strokeWidth="1.45" strokeLinecap="round" />
  </svg>
);

const SectionAccordionSummary = ({ label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
    <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <SparkleIcon />
    </Box>
    <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
      {label}
    </Typography>
  </Box>
);

const TXKGPhase = ({
  workflowPhase,
  query,
  txkg,
  expandedAccordion,
  setExpandedAccordion,
  insightTab,
  setInsightTab,
  selectedTargets,
  setSelectedTargets,
  setWorkflowPhase,
  setActiveStep,
  setShowBranchDialog,
  /** The runner's live progress line, shown on the loading screen. */
  progressMessage,
  /**
   * Hands the session to LitMineX via POST /sessions/{id}/steps, carrying the
   * selected targets translated to gene names.
   *
   * Both "proceed" buttons used to call
   * setActiveStep(1); setWorkflowPhase("litminex-loading") — which changed the
   * screen without starting an agent or sending the selections anywhere.
   */
  onContinue,
  continuePending = false,
  /** Branch / Rerun / Export handlers from usePhaseActions. */
  actions = {},
  /** Live subgraph from /agents/subgraph/* — replaces the static SVG. */
  subgraph = null,
  onGenerateSubgraph,
}) => {
  /**
   * The signed-in researcher's own label for chat bubbles, and the one agent
   * name this module answers by. Both were hardcoded — "DR. PRIYA (YOU)" and
   * "INOVAPATH TXKG AGENT".
   */
  const { chatLabel: userLabel } = useCurrentUser();
  const agentDisplay = moduleDisplayFor('txkg') ?? { label: 'TxKG', role: null };
  // Real TxKG results when the job has returned; the original fixture until
  // then, so the screen is never empty. `mockTargets` keeps its name because
  // three separate tables below render from it.
  const hasLiveData = Boolean(txkg?.hasData);
  const mockTargets = hasLiveData ? txkg.targets : MOCK_TARGETS;

  // The old copy hard-coded "10 protein targets" and "Type 2 Diabetes". Both
  // come from the response now — the sample run returned 11 targets for
  // Cancer Pain, so either half being stale was visibly wrong.
  const diseaseLabel = hasLiveData ? txkg.disease : "Type 2 Diabetes";
  const targetCount = hasLiveData ? txkg.count : MOCK_TARGETS.length;

  const headline = `I found ${targetCount} protein target${targetCount === 1 ? "" : "s"} strongly associated with ${diseaseLabel} pathways. Here are the top candidates ranked by therapeutic relevance:`;

  /**
   * Insights → Recommendations.
   *
   * The API returns one recommendation object plus per-target novelty, so the
   * list is built from the top targets and the chip reads the novelty label
   * rather than a hard-coded "High"/"Medium".
   */
  const recommendationRows = hasLiveData
    ? txkg.targets.slice(0, 5).map((t) => ({
        target: t.name,
        status: t.noveltyLabel || "—",
        desc:
          `${t.category || "Candidate"} · score ${t.score}` +
          (t.pathCount ? ` · ${t.pathCount} connecting path${t.pathCount === 1 ? "" : "s"}` : "") +
          (t.literatureHits != null ? ` · ${t.literatureHits} literature hit${t.literatureHits === 1 ? "" : "s"}` : ""),
      }))
    : [
        { target: "JAK2", status: "High", desc: "Best entry point for insulin signaling inhibition; may reduce glucose regulation." },
        { target: "DPP4", status: "High", desc: "Well-validated target with existing gliptin class drugs; strong repurposing potential." },
        { target: "GLP1R", status: "Medium", desc: "Incretin pathway modulation for glucose-dependent insulin secretion enhancement." },
        { target: "SGLT2", status: "Medium", desc: "Renal glucose reabsorption target; proven clinical efficacy across multiple cytokine pathways." },
      ];

  /**
   * Insights → Sources.
   *
   * The response carries `supportingSources` per target — the curated
   * databases a path was sourced from — not journal citations with DOIs. So
   * this tab now lists the real evidence bases and how many targets each
   * supports, which is what the data actually describes.
   */
  const FIXTURE_TOP = [
    { name: "PPARG", desc: "Peroxisome proliferator-activated receptor gamma", score: "92" },
    { name: "DPP4", desc: "Dipeptidyl peptidase-4", score: "87" },
    { name: "GLP1R", desc: "Glucagon-like peptide-1 receptor", score: "79" },
    { name: "SGLT2", desc: "Sodium-glucose co-transporter 2", score: "71" },
    { name: "INSR", desc: "Insulin receptor", score: "65" },
  ];

  /** Top five, for the graph-side summary panels. */
  const topTargets = hasLiveData
    ? txkg.targets.slice(0, 5).map((t) => ({
        name: t.name,
        desc: t.fullName || t.name,
        score: t.score,
      }))
    : FIXTURE_TOP;

  /**
   * Metapaths come from each target's `connectionTypes`, e.g.
   * "disease→gene/protein→pathway→gene/protein". Substituting the disease name
   * for the literal word "disease" makes them readable without inventing
   * anything.
   */
  const prettyPath = (p) =>
    String(p || "")
      .replace(/disease/gi, diseaseLabel || "disease")
      .split("→")
      .map((s) => s.trim())
      .join(" → ");

  /** The #1 target is shown as its own featured card, so these start at rank 2. */
  const featuredTarget = hasLiveData ? txkg.targets[0] : null;

  const metapathRows = hasLiveData
    ? txkg.targets.slice(1, 5).map((t) => ({
        name: t.name,
        path: t.connectionTypes.length ? prettyPath(t.connectionTypes[0]) : "No sourced path",
        score: t.score,
      }))
    : [
        { name: "DPP4", path: "T2D → GLP-1 → DPP4", score: "87" },
        { name: "GLP1R", path: "T2D → Incretin → GLP1R", score: "79" },
        { name: "SGLT2", path: "T2D → Glucose → SGLT2", score: "71" },
        { name: "INSR", path: "T2D → Insulin sig. → INSR", score: "65" },
      ];

  const sourceRows = (() => {
    if (!hasLiveData) return null;
    const tally = new Map();
    txkg.targets.forEach((t) => {
      t.supportingSources.forEach((s) => tally.set(s, (tally.get(s) || 0) + 1));
    });
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, links: linksForSource(name) }));
  })();

  const [customTargets, setCustomTargets] = useState([]);
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [isAddingCustomTarget, setIsAddingCustomTarget] = useState(false);
  const [customTargetError, setCustomTargetError] = useState(null);

  const normalizeTargetList = (responseData) => {
    if (!Array.isArray(responseData)) return [];

    return responseData
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return (
            item.name ||
            item.target ||
            item.value ||
            item.label ||
            item.id ||
            item.uniprot ||
            ''
          );
        }
        return '';
      })
      .map((value) => value?.trim())
      .filter(Boolean);
  };

  const fetchCustomTargets = async () => {
    try {
      const payload = await litminexApi.getCustomTargets();
      const list = Array.isArray(payload) ? payload : [payload];
      setCustomTargets(normalizeTargetList(list));
    } catch (error) {
      setCustomTargetError(error?.userMessage || error?.message || 'Custom targets could not be loaded.');
      setCustomTargets([]);
    }
  };

  const handleAddCustomTarget = async () => {
    const trimmedTarget = customTargetInput.trim();
    if (!trimmedTarget) return;

    setIsAddingCustomTarget(true);
    setCustomTargetError(null);

    try {
      await litminexApi.addCustomTarget(trimmedTarget);

      // Re-fetch the canonical list of custom targets so UI stays in sync
      await fetchCustomTargets();

      // A hand-written target is already a gene symbol, so it goes into the
      // selection as typed — toGeneNames() passes symbols through untouched.
      setSelectedTargets((prev) => (
        prev.includes(trimmedTarget) ? prev : [...prev, trimmedTarget]
      ));
      setCustomTargetInput('');
    } catch (error) {
      // This used to console.error and leave the input looking like it had
      // worked, with the target silently absent from the next agent's run.
      setCustomTargetError(error?.userMessage || error?.message || 'The target could not be added.');
    } finally {
      setIsAddingCustomTarget(false);
    }
  };

  useEffect(() => {
    if (workflowPhase === 'target-selection') {
      fetchCustomTargets();
    }
  }, [workflowPhase]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (workflowPhase === 'txkg-loading') {
    return (
      <Box className="txkg-loading-content" sx={{ bgcolor: GRAY_BG }}>
        <div className="user-message-row">
          <div className="user-message-bubble">
            <div className="user-bubble-header">
              <span className="user-name">{userLabel}</span>
            </div>
            <div className="user-message-text">{query}</div>
          </div>
        </div>
        <div className="agent-thinking-row">
          <div className="thinking-bubble">
            <div className="bubble-header">
              <div className="agent-avatar">
                <SparkleIcon size={11.67} />
              </div>
              {/* Item T5: module name as written, full agent name beneath. */}
              <span className="agent-name">
                {agentDisplay.label}
                {agentDisplay.role && (
                  <span className="agent-role">({agentDisplay.role})</span>
                )}
              </span>
            </div>
            <div className="status-processing">
              <div className="spinner-container">
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
              </div>
              {/* The agent's own progress line when it has reported one. The
                  fixed string below is only the state before the first poll
                  returns — it used to be all the user ever saw, regardless of
                  what the run was actually doing. */}
              <span className="processing-text">
                {progressMessage || 'Searching biomedical databases (NCBI, UniProt, TxKG relations)...'}
              </span>
            </div>
          </div>
        </div>
      </Box>
    );
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  if (workflowPhase === 'txkg-results') {
    return (
      <Box className="txkg-results-content" sx={{ bgcolor: GRAY_BG }}>
        {/* User message */}
        <div className="user-message-row">
          <div className="user-message-bubble">
            <div className="user-bubble-header">
              <span className="user-name">{userLabel}</span>
            </div>
            <div className="user-message-text">{query}</div>
          </div>
        </div>

        {/* TXKG result agent-message-row — Figma: 1120 × 644 */}
        <div className="agent-message-row result-row result-row-txkg">
          <div className="result-card result-card-txkg">
          <Accordion
            expanded={expandedAccordion === "txkg"}
            onChange={() => setExpandedAccordion(expandedAccordion === "txkg" ? "" : "txkg")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
            >
              <SectionAccordionSummary label="TXKG" />
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px", bgcolor: "#FFFFFF" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
                {headline}
              </Typography>
              <Box sx={{ display: "flex", gap: "12px" }}>
                {/* Target Table */}
                <Box sx={{ flex: "0 0 52%", minWidth: 0 }}>
                  <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                    <Box sx={{ display: "flex", bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER_LIGHT}`, gap: "8px" }}>
                      <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>UNIPROT ID</Typography>
                      <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>TARGET</Typography>
                      <Typography sx={{ flex: "0 0 80px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", textAlign: "right", letterSpacing: "0.5px" }}>SCORE</Typography>
                    </Box>
                    {mockTargets.map((target, i) => (
                      <Box key={target.id} sx={{ display: "flex", p: "12px 16px", borderBottom: i < mockTargets.length - 1 ? `1px solid ${BORDER}` : "none", bgcolor: i === 0 ? "rgba(0,188,212,0.08)" : "transparent", "&:hover": { bgcolor: i === 0 ? "rgba(0,188,212,0.12)" : "#F8FAFC" } }}>
                        <Typography component="a" href={uniprotUrl(target.id)} target="_blank" rel="noopener noreferrer" sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{target.id}</Typography>
                        <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>{target.name}</Typography>
                        <Typography sx={{ flex: "0 0 80px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textAlign: "right" }}>{target.score}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                {/* Insights Panel */}
                <Box sx={{ flex: 1, minWidth: 0, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                  <Box sx={{ bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER_LIGHT}` }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: INSIGHTS_HEADER, lineHeight: "100%" }}>Insights</Typography>
                    
                  </Box>
                  <Box sx={{ borderBottom: `1px solid ${BORDER}`, p: "4px" }}>
                    <Tabs value={insightTab} onChange={(e, val) => setInsightTab(val)} TabIndicatorProps={{ style: { display: "none" } }}
                      sx={{ minHeight: "32px", "& .MuiTab-root": { minHeight: "23px", p: "4px 10px", textTransform: "none", fontFamily: FONT, fontSize: "10px", fontWeight: 600, lineHeight: "100%", color: TEXT_MUTED, "&.Mui-selected": { color: ACTIVE_TAB } } }}>
                      <Tab label="Interpretation" />
                      <Tab label="Recommendations" />
                      <Tab label="Sources" />
                    </Tabs>
                  </Box>
                  <Box sx={{ p: "16px", overflowY: "auto", maxHeight: "340px" }}>
                    {insightTab === 0 && (
                      hasLiveData && txkg.interpretationBlocks.length ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {txkg.summary && (
                            <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: INSIGHTS_HEADER, lineHeight: 1.5 }}>
                              {txkg.summary}
                            </Typography>
                          )}
                          {/* The API returns interpretation as "**Name (ID)**: prose"
                              blocks; rendering them as titled paragraphs keeps the
                              markdown asterisks off the page. */}
                          {txkg.interpretationBlocks.map((block, i) => (
                            <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              {block.title && (
                                <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1A1F26", lineHeight: 1.4 }}>
                                  {block.title}
                                </Typography>
                              )}
                              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#404552", lineHeight: 1.6 }}>
                                {block.body}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#404552", lineHeight: 1.6 }}>
                          The predicted therapeutic targets for Type 2 Diabetes suggest a potential mechanism of action involving the modulation of insulin signaling pathways, particularly those regulated by JAK2 and DPP4.
                          <br /><br />
                          The involvement of JAK2, which is a key downstream effector of cytokine receptor signaling, implies that inhibiting this pathway may help mitigate elevated blood glucose and insulin resistance. The identification of GLP1R and SGLT2 as potential targets also hints at roles for incretin-related pathways in the pathogenesis of Type 2 Diabetes.
                          <br /><br />
                          These findings highlight the complexity of Type 2 Diabetes and the need for further investigation into the interplay between metabolic and immune signaling pathways.
                        </Typography>
                      )
                    )}
                    {insightTab === 1 && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: "#1A1F26", lineHeight: "100%" }}>Recommendations</Typography>

                        {/* The agent's own next step, when it gave one. It names the
                            module to hand off to, which is the same information the
                            supervisor provides — arriving mid-pipeline. */}
                        {hasLiveData && txkg.recommendation?.text && (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", p: "10px 12px", bgcolor: "#F0FDFC", border: `1px solid ${TEAL}`, borderRadius: "8px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "100%" }}>
                                Suggested next step
                              </Typography>
                              {txkg.nextModule && (
                                <Chip label={txkg.nextModule} size="small" sx={{ bgcolor: "rgba(0,188,212,0.14)", color: TEAL, fontFamily: FONT, fontSize: "10px", fontWeight: 700, height: "17px", borderRadius: "4px", "& .MuiChip-label": { px: "8px", py: "2px", lineHeight: "100%" } }} />
                              )}
                            </Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#404552", lineHeight: 1.55 }}>
                              {txkg.recommendation.text}
                            </Typography>
                          </Box>
                        )}

                        {recommendationRows.map((rec, i) => (
                          <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "4px", p: "10px 12px", bgcolor: "#FAFCFF", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#1A1A26", lineHeight: "100%" }}>{rec.target}</Typography>
                              <Chip label={rec.status} size="small" sx={{ bgcolor: rec.status === "High" ? "rgba(20,158,133,0.12)" : "rgba(217,140,26,0.12)", color: rec.status === "High" ? "#00BCD4" : "#D98C1A", fontFamily: FONT, fontSize: "10px", fontWeight: 600, height: "17px", borderRadius: "4px", "& .MuiChip-label": { px: "8px", py: "2px", lineHeight: "100%" } }} />
                            </Box>
                            {/* lineHeight was 100%, which clipped any wrapped desc —
                                the live descriptions are longer than the fixture's. */}
                            <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#4D5461", lineHeight: 1.45 }}>{rec.desc}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {insightTab === 2 && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", pt: "12px" }}>
                        {hasLiveData ? (
                          <>
                            {/* The response carries curated evidence bases per target
                                (`supportingSources`), not journal citations with DOIs —
                                so this lists the real sources and how many targets each
                                one supports. */}
                            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>Evidence sources</Typography>
                            {sourceRows.length ? (
                              sourceRows.map((source, i) => (
                                <Box key={source.name} sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#262E38", lineHeight: 1.4 }}>[{i + 1}] {source.name}</Typography>
                                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#667080", lineHeight: "100%" }}>
                                    Supports {source.count} of {txkg.targets.length} targets
                                  </Typography>

                                  {/* Item 17: the sources are followable now.
                                      The API gives prose labels with no URL and
                                      no accession, so these are the databases'
                                      own entry points — one label can name
                                      several ("CTD / MedGen …"). A label that
                                      matches nothing stays unlinked rather than
                                      pointing somewhere invented. */}
                                  {source.links.length > 0 && (
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mt: "2px" }}>
                                      {source.links.map((link) => (
                                        <Typography
                                          key={link.url}
                                          component="a"
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          sx={{
                                            fontFamily: FONT,
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            color: TEAL,
                                            textDecoration: "none",
                                            "&:hover": { textDecoration: "underline" },
                                          }}
                                        >
                                          {link.name} ↗
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              ))
                            ) : (
                              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#667080", lineHeight: 1.5 }}>
                                No targets in this run carried a curated supporting source.
                              </Typography>
                            )}

                            {txkg.method && (
                              <Box sx={{ pt: "4px", borderTop: `1px solid ${BORDER}` }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px", mt: "10px", mb: "6px", lineHeight: "100%" }}>Method</Typography>
                                <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#667080", lineHeight: 1.6 }}>
                                  {[
                                    txkg.method.graph_nodes != null && `${txkg.method.graph_nodes.toLocaleString()} nodes`,
                                    txkg.method.graph_edges != null && `${txkg.method.graph_edges.toLocaleString()} edges`,
                                    txkg.method.candidate_pool != null && `pool of ${txkg.method.candidate_pool}`,
                                    txkg.method.correction_method,
                                  ].filter(Boolean).join(" · ")}
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>References</Typography>
                            {[
                              { title: "JAK2 inhibition in Type 2 Diabetes: A systematic review", journal: "Nature Reviews Drug Discovery, 2023", doi: "DOI: 10.1038/nrd.2023.142" },
                              { title: "DPP4 inhibitors and cardiovascular outcomes in diabetic patients", journal: "The Lancet Diabetes & Endocrinology, 2022", doi: "DOI: 10.1016/S2213-8587(22)00156-2" },
                              { title: "GLP-1 receptor agonists: mechanisms and therapeutic potential", journal: "Cell Metabolism, 2023", doi: "DOI: 10.1016/j.cmet.2023.04.008" },
                              { title: "SGLT2 inhibitors in the management of Type 2 Diabetes", journal: "New England Journal of Medicine, 2022", doi: "DOI: 10.1056/NEJMra2203096" },
                              { title: "Insulin signaling pathways as drug targets for T2D", journal: "Pharmacological Reviews, 2023", doi: "DOI: 10.1124/pharmrev.122.000560" },
                            ].map((source, i) => (
                              <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>[{i + 1}] {source.title}</Typography>
                                <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#667080", lineHeight: "100%" }}>{source.journal}</Typography>
                                <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#00BCD4", lineHeight: "100%", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>{source.doi}</Typography>
                              </Box>
                            ))}
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: "12px", mt: "16px" }}>
                <Button onClick={() => setShowBranchDialog?.(true)} variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>Branch</Button>
                <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>Rerun</Button>
                <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>Export</Button>
              </Box>
            </AccordionDetails>
          </Accordion>
          </div>
        </div>

        {/* SUBGRAPH result agent-message-row */}
        <div className="agent-message-row result-row result-row-subgraph">
          <div className="result-card result-card-subgraph">
          <Accordion
            expanded={expandedAccordion === "subgraph"}
            onChange={() => setExpandedAccordion(expandedAccordion === "subgraph" ? "" : "subgraph")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
            >
              <SectionAccordionSummary label="SUBGRAPH" />
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px" }}>
              {/* Item 18: the subgraph is live now. This was a hand-drawn SVG
                  with Type 2 Diabetes at the centre and JAK2 / DPP4 / GLP1R /
                  Metformin at fixed coordinates, plus fixed footer counts of
                  52 / 15 / 10 — the same picture for every disease. */}
              <SubgraphView
                graph={subgraph?.graph}
                stats={subgraph?.stats}
                loading={subgraph?.loading}
                error={subgraph?.error}
                onGenerate={onGenerateSubgraph}
                onNodeClick={subgraph?.onNodeClick}
                diseaseLabel={hasLiveData ? diseaseLabel : null}
              />
              <PhaseActions {...actions} />
            </AccordionDetails>
          </Accordion>
          </div>
        </div>

        {/* METAPATH result agent-message-row */}
        <div className="agent-message-row result-row result-row-metapath">
          <div className="result-card result-card-metapath">
          <Accordion
            expanded={expandedAccordion === "metapath"}
            onChange={() => setExpandedAccordion(expandedAccordion === "metapath" ? "" : "metapath")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
            >
              <SectionAccordionSummary label="METAPATH ANALYSIS" />
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: "#111827", mb: "16px" }}>TxKG — Meta-Path Analysis</Typography>
              <Box sx={{ display: "flex", alignItems: "center", p: "12px 16px", gap: "32px", bgcolor: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
                {[{ value: "12", label: "Paths" }, { value: "8", label: "Targets" }, { value: "5", label: "Pathways" }, { value: "1.5", label: "Avg/Target" }, { value: "24", label: "Nodes" }, { value: "38", label: "Edges" }, { value: "4", label: "Clusters" }].map((stat, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: "#111827", lineHeight: "19px" }}>{stat.value}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>{stat.label}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: "16px", mt: "16px" }}>
              {/* Item 19: only the meta-paths are shown here. The left column
                  was a duplicate "Target Prediction Scores" list — the same
                  ranked targets already rendered in the results table above,
                  which made the panel read as two different scores for the
                  same target. */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", lineHeight: "16px" }}>Meta-Path Traversals</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", p: "10px 12px", gap: "6px", bgcolor: "#F9FAFB", borderRadius: "8px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", lineHeight: "16px" }}>
                        {featuredTarget ? featuredTarget.name : "PPARG"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", p: "3px 8px", bgcolor: "#00BCD4", borderRadius: "8px" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#FFFFFF", lineHeight: "13px" }}>
                          {featuredTarget ? featuredTarget.score : "92"}
                        </Typography>
                      </Box>
                    </Box>
                    {/* Each sourced connection type for the top-ranked target. */}
                    {(featuredTarget
                      ? (featuredTarget.connectionTypes.length
                          ? featuredTarget.connectionTypes.map(prettyPath)
                          : ["No sourced path for this target"])
                      : ["T2D → PPARG", "T2D → Insulin resistance → PPARG", "T2D → Thiazolidinediones → PPARG"]
                    ).map((path, i) => (
                      <Typography key={i} sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: 1.35 }}>• {path}</Typography>
                    ))}
                  </Box>
                  {metapathRows.map((item, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", p: "6px 12px", gap: "8px", borderBottom: `1px solid ${BORDER}` }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 500, color: "#111827", lineHeight: "15px" }}>{item.name}</Typography>
                      <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>{item.path}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", p: "3px 8px", bgcolor: "#D1FAE5", borderRadius: "8px" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#059669", lineHeight: "13px" }}>{item.score}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
              <PhaseActions {...actions} />
            </AccordionDetails>
          </Accordion>
          </div>
        </div>

        {/* Bridge card */}
        <div className="agent-message-row-bridge">
            <div className="agent-icon"></div>
            <div className="bridge-content">
              <h3 className="bridge-header">READY FOR LITERATURE MINING</h3>
              <p className="bridge-message">
                TxKG analysis is complete. Would you like to proceed to LitMinex with the recommended targets, or select specific targets from the identified list?
              </p>
              <div className="option-cards">
                <div className="option-card">
                  <h4 className="option-card-title">Proceed with Recommended Targets</h4>
                  <p className="option-card-description">
                    Run LitMinex on {targetCount === 1 ? "the" : `all ${targetCount}`} identified target
                    {targetCount === 1 ? "" : "s"} ranked by therapeutic relevance
                  </p>
                  <button
                    className="option-card-button primary"
                    disabled={continuePending}
                    onClick={onContinue}
                  >
                    <span className="option-card-button-label">
                      {continuePending ? "Starting LitMineX…" : "Use recommended targets"}
                    </span>
                  </button>
                </div>
                <div className="option-card">
                  <h4 className="option-card-title">Select Custom Targets</h4>
                  <p className="option-card-description">Choose specific targets from the list or enter your own for literature mining</p>
                  <button className="option-card-button secondary" onClick={() => setWorkflowPhase("target-selection")}>
                    <span className="option-card-button-label">Select Targets</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
      </Box>
    );
  }

  // ─── Target Selection ─────────────────────────────────────────────────────
  if (workflowPhase === 'target-selection') {
    return (
      <Box sx={{ p: "24px 40px 0 40px", bgcolor: GRAY_BG }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
          <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "12px" }}>{userLabel}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px" }}>{query}</Typography>
          </Box>
        </Box>

        {/* TXKG collapsed */}
        <Box sx={{ p: "4px 0" }}>
          <Accordion
            expanded={expandedAccordion === "txkg"}
            onChange={() => setExpandedAccordion(expandedAccordion === "txkg" ? "" : "txkg")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SparkleIcon />
                </Box>
                <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.05em" }}>TXKG</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
                {headline}
              </Typography>
              <Box sx={{ display: "flex", gap: "12px" }}>
                <Box sx={{ flex: "0 0 52%", minWidth: 0 }}>
                  <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                    <Box sx={{ display: "flex", bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                      {["UNIPROT ID", "TARGET", "SCORE"].map((h, i) => <Typography key={i} sx={{ flex: i === 1 ? 1 : "0 0 100px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", textAlign: i === 2 ? "right" : "left" }}>{h}</Typography>)}
                    </Box>
                    {mockTargets.map((t, i) => (
                      <Box key={t.id} sx={{ display: "flex", p: "10px 12px", borderBottom: i < mockTargets.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        <Typography component="a" href={uniprotUrl(t.id)} target="_blank" rel="noopener noreferrer" sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{t.id}</Typography>
                        <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>{t.name}</Typography>
                        <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textAlign: "right" }}>{t.score}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                  <Box sx={{ bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: INSIGHTS_HEADER }}>Insights</Typography>
                    
                  </Box>
                  <Box sx={{ borderBottom: `1px solid ${BORDER}`, px: "4px" }}>
                    <Tabs value={insightTab} onChange={(_, v) => setInsightTab(v)} TabIndicatorProps={{ style: { display: "none" } }}
                      sx={{ minHeight: "32px", "& .MuiTab-root": { minHeight: "28px", p: "4px 10px", textTransform: "none", fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: TEXT_MUTED, "&.Mui-selected": { color: ACTIVE_TAB } } }}>
                      <Tab label="Interpretation" /><Tab label="Recommendations" /><Tab label="Sources" />
                    </Tabs>
                  </Box>
                  <Box sx={{ p: "12px", maxHeight: "320px", overflowY: "auto" }}>
                    {insightTab === 0 && (
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#404552", lineHeight: 1.6 }}>
                        {hasLiveData
                          ? (txkg.summary || txkg.interpretationBlocks[0]?.body || "No interpretation was returned for this run.")
                          : "The predicted therapeutic targets for Type 2 Diabetes suggest a potential mechanism of action involving the modulation of insulin signaling pathways, particularly those regulated by JAK2 and DPP4."}
                      </Typography>
                    )}
                    {insightTab === 1 && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[{ target: "JAK2", status: "High", desc: "Best entry point for insulin signaling inhibition." }, { target: "DPP4", status: "High", desc: "Well-validated with existing gliptin class drugs." }, { target: "GLP1R", status: "Medium", desc: "Incretin pathway modulation for glucose-dependent insulin secretion." }].map((r, i) => (
                          <Box key={i} sx={{ p: "8px 10px", bgcolor: "#FAFCFF", border: `1px solid ${BORDER}`, borderRadius: "6px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#1A1A26" }}>{r.target}</Typography>
                              <Chip label={r.status} size="small" sx={{ height: "16px", bgcolor: r.status === "High" ? "rgba(20,158,133,0.12)" : "rgba(217,140,26,0.12)", color: r.status === "High" ? "#00BCD4" : "#D98C1A", fontFamily: FONT, fontSize: "10px", fontWeight: 600, "& .MuiChip-label": { px: "6px" } }} />
                            </Box>
                            <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#4D5461", mt: "2px" }}>{r.desc}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
                <PhaseActions {...actions} />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* SUBGRAPH collapsed */}
        <Box sx={{ p: "4px 0" }}>
          <Accordion
            expanded={expandedAccordion === "subgraph"}
            onChange={() => setExpandedAccordion(expandedAccordion === "subgraph" ? "" : "subgraph")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SparkleIcon />
                </Box>
                <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.05em" }}>SUBGRAPH</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px" }}>
              {/* Item 18: the subgraph is live now. This was a hand-drawn SVG
                  with Type 2 Diabetes at the centre and JAK2 / DPP4 / GLP1R /
                  Metformin at fixed coordinates, plus fixed footer counts of
                  52 / 15 / 10 — the same picture for every disease. */}
              <SubgraphView
                graph={subgraph?.graph}
                stats={subgraph?.stats}
                loading={subgraph?.loading}
                error={subgraph?.error}
                onGenerate={onGenerateSubgraph}
                onNodeClick={subgraph?.onNodeClick}
                diseaseLabel={hasLiveData ? diseaseLabel : null}
              />
              <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
                <PhaseActions {...actions} />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* METAPATH collapsed */}
        <Box sx={{ p: "4px 0" }}>
          <Accordion
            expanded={expandedAccordion === "metapath"}
            onChange={() => setExpandedAccordion(expandedAccordion === "metapath" ? "" : "metapath")}
            sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
              sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SparkleIcon />
                </Box>
                <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.05em" }}>METAPATH ANALYSIS</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: "16px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: "#111827", mb: "12px" }}>TxKG — Meta-Path Analysis</Typography>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "24px", p: "12px 16px", bgcolor: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: "8px", mb: "16px" }}>
                {[{ v: "12", l: "Paths" }, { v: "8", l: "Targets" }, { v: "5", l: "Pathways" }, { v: "1.5", l: "Avg/Target" }, { v: "24", l: "Nodes" }, { v: "38", l: "Edges" }, { v: "4", l: "Clusters" }].map((s, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: "#111827" }}>{s.v}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#6B7280" }}>{s.l}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: "16px" }}>
              {/* Item 19: only the meta-paths are shown here. The left column
                  was a duplicate "Target Prediction Scores" list — the same
                  ranked targets already rendered in the results table above,
                  which made the panel read as two different scores for the
                  same target. */}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", mb: "8px" }}>Meta-Path Traversals</Typography>
                  {(hasLiveData
                    ? txkg.targets.slice(0, 5).map((t, i) => ({
                        n: t.name,
                        p: t.connectionTypes.length
                          ? t.connectionTypes.map(prettyPath).join(" / ")
                          : "No sourced path",
                        s: t.score,
                        teal: i === 0,
                      }))
                    : [
                        { n: "PPARG", p: "T2D → PPARG / T2D → Insulin resistance → PPARG", s: "92", teal: true },
                        { n: "DPP4", p: "T2D → GLP-1 → DPP4", s: "87" },
                        { n: "GLP1R", p: "T2D → Incretin → GLP1R", s: "79" },
                        { n: "SGLT2", p: "T2D → Glucose → SGLT2", s: "71" },
                        { n: "INSR", p: "T2D → Insulin sig. → INSR", s: "65" },
                      ]
                  ).map((item, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", p: "6px 10px", gap: "8px", borderBottom: `1px solid ${BORDER}` }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 500, color: "#111827", minWidth: 44 }}>{item.n}</Typography>
                      <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", color: "#6B7280" }}>{item.p}</Typography>
                      <Box sx={{ p: "3px 8px", bgcolor: item.teal ? "#00BCD4" : "#D1FAE5", borderRadius: "8px" }}><Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: item.teal ? "#FFFFFF" : "#059669" }}>{item.s}</Typography></Box>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
                <PhaseActions {...actions} />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Target Selection Panel */}
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "20px", mb: "8px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK, mb: "4px" }}>Select Targets for LitMinex</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "16px" }}>Choose from the identified targets or add your own</Typography>
          {mockTargets.map((target) => (
            <Box key={target.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: "10px", borderBottom: `1px solid ${BORDER}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Checkbox
                  checked={selectedTargets.includes(target.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedTargets([...selectedTargets, target.id]);
                    else setSelectedTargets(selectedTargets.filter(id => id !== target.id));
                  }}
                  sx={{ p: "4px", color: BORDER, "&.Mui-checked": { color: TEAL } }}
                />
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: selectedTargets.includes(target.id) ? 600 : 400, color: TEXT_DARK }}>{target.name}</Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: selectedTargets.includes(target.id) ? TEAL : TEXT_MUTED, fontWeight: selectedTargets.includes(target.id) ? 600 : 400 }}>{target.score}</Typography>
            </Box>
          ))}

          {customTargets.length > 0 && (
            <Box sx={{ mt: "8px", borderTop: `1px solid ${BORDER}`, pt: "8px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, mb: "8px" }}>Custom targets</Typography>
              {customTargets.map((targetName) => {
                const isSelected = selectedTargets.includes(targetName);

                return (
                  <Box key={targetName} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: "10px", borderBottom: `1px solid ${BORDER}` }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTargets((prev) => (prev.includes(targetName) ? prev : [...prev, targetName]));
                          } else {
                            setSelectedTargets((prev) => prev.filter((id) => id !== targetName));
                          }
                        }}
                        sx={{ p: "4px", color: BORDER, "&.Mui-checked": { color: TEAL } }}
                      />
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: TEXT_DARK }}>{targetName}</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: isSelected ? TEAL : TEXT_MUTED, fontWeight: isSelected ? 600 : 400 }}>Custom</Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ mt: "12px", mb: "16px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "8px" }}>Add custom target</Typography>
            <TextField
              value={customTargetInput}
              onChange={(event) => { setCustomTargetInput(event.target.value); setCustomTargetError(null); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddCustomTarget();
                }
              }}
              placeholder="Add custom target (e.g. EGFR, VEGFR2...)"
              fullWidth size="small"
              sx={{ "& .MuiOutlinedInput-root": { fontFamily: FONT, fontSize: "13px", borderRadius: "8px" } }}
              InputProps={{ endAdornment: (
                <IconButton
                  aria-label="Add custom target"
                  onClick={handleAddCustomTarget}
                  disabled={isAddingCustomTarget || !customTargetInput.trim()}
                  size="small"
                  sx={{ bgcolor: TEAL, borderRadius: "6px", p: "6px", "&:hover": { bgcolor: "#089B98" }, opacity: isAddingCustomTarget || !customTargetInput.trim() ? 0.7 : 1 }}
                >
                  <AddOutlined sx={{ fontSize: 16, color: "#FFFFFF" }} />
                </IconButton>
              )}}
            />
            {/* A failed add used to be swallowed by console.error, so the
                target looked accepted but never reached the next agent. */}
            {customTargetError && (
              <Typography
                role="alert"
                sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626", mt: "6px" }}
              >
                {customTargetError}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>{selectedTargets.length} targets selected</Typography>
            <Box sx={{ display: "flex", gap: "12px" }}>
              <Button onClick={() => setWorkflowPhase("txkg-results")} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>Cancel</Button>
              <Button
                disabled={selectedTargets.length === 0 || continuePending}
                onClick={onContinue}
                sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600, px: "20px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" }, "&.Mui-disabled": { bgcolor: "#E2E8F0" } }}
              >
                {continuePending ? "Starting LitMineX…" : "Proceed to LitMinex"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
};

export default TXKGPhase;