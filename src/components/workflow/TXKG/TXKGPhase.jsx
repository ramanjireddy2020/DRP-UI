import React, { useCallback, useEffect, useState } from 'react';
import './TXKGPhase.css';
import {
  Box, Typography, Button, Tabs, Tab, Checkbox,
  TextField, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton,
  Drawer, CircularProgress,
} from '@mui/material';
import litminexApi from '../../../services/api/litminex';
import txkgApi from '../../../services/api/txkg';
import { formatScore } from '../../../workflow/txkgResult';
import { moduleDisplayFor } from '../../../workflow/moduleMap';
import { linksForSource, uniprotUrl } from '../../../workflow/sourceLinks';
import PhaseActions from '../PhaseActions';
import SubgraphView from '../SubgraphView';
import { styleForType } from '../subgraphStyle';
import { ExpandMoreOutlined, AddOutlined, CloseOutlined } from '@mui/icons-material';
import {
  FONT, TEAL, GRAY_BG, BORDER, BORDER_LIGHT,
  TEXT_DARK, TEXT_MUTED, INSIGHTS_HEADER, ACTIVE_TAB,
} from '../workflowConstants';

/**
 * Chip colours for the API's novelty labels. The chips used to test for
 * "High", which the API never sends — it says "Well-explored", "Moderate" and
 * so on — so every chip rendered amber.
 */
const noveltyChipColours = (label) => {
  const text = String(label || '').toLowerCase();
  if (/novel|unexplored|under-?explored|emerging|high/.test(text)) {
    return { bg: 'rgba(0,188,212,0.12)', fg: '#00A3B8' };
  }
  if (/moderate|medium|partial/.test(text)) {
    return { bg: 'rgba(217,140,26,0.12)', fg: '#D98C1A' };
  }
  if (/well-?explored|known|established|low/.test(text)) {
    return { bg: 'rgba(100,116,139,0.14)', fg: '#475569' };
  }
  return { bg: 'rgba(148,163,184,0.14)', fg: '#64748B' };
};

/** One entry of an insight tab's `items`, whatever shape it arrives in. */
const readInsightItem = (item) => {
  if (item == null) return null;
  if (typeof item !== 'object') return { title: null, body: String(item), url: null };
  return {
    title: item.title ?? item.name ?? item.target ?? item.label ?? null,
    body: item.content ?? item.description ?? item.text ?? item.summary ?? item.detail ?? null,
    url: item.url ?? item.link ?? (item.doi ? `https://doi.org/${item.doi}` : null),
  };
};

/** Markdown bold markers are not rendered, so they are dropped. */
const plain = (text) => String(text ?? '').replace(/\*\*/g, '').trim();

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

/**
 * One meta-path as it was walked: node names, coloured by node type (same
 * colours as the subgraph), with the relation written on each arrow.
 * Replaces the "gene/protein → biological_process → gene/protein" type strings.
 */
const PathChain = ({ traversal }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 6px" }}>
    {traversal.steps.map((step, i) => (
      <React.Fragment key={i}>
        {i > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: "2px" }}>
            {traversal.edgeLabels[i - 1] && (
              <Typography sx={{ fontFamily: FONT, fontSize: "9px", color: "#94A3B8", lineHeight: "11px", whiteSpace: "nowrap" }}>
                {traversal.edgeLabels[i - 1]}
              </Typography>
            )}
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#94A3B8", lineHeight: "12px" }}>→</Typography>
          </Box>
        )}
        <Box
          title={step.type || undefined}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            p: "2px 8px",
            borderRadius: "10px",
            border: `1px solid ${BORDER}`,
            bgcolor: "#FFFFFF",
          }}
        >
          {step.type && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: styleForType(step.type).color, flexShrink: 0 }} />}
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#111827", lineHeight: "14px" }}>{step.name}</Typography>
        </Box>
      </React.Fragment>
    ))}
    {(traversal.hopCount != null || traversal.contextWeight != null) && (
      <Typography sx={{ fontFamily: FONT, fontSize: "10px", color: "#94A3B8", ml: "4px" }}>
        {[
          traversal.hopCount != null && `${traversal.hopCount} hop${traversal.hopCount === 1 ? "" : "s"}`,
          traversal.contextWeight != null && `context weight ${traversal.contextWeight}`,
        ].filter(Boolean).join(" · ")}
      </Typography>
    )}
  </Box>
);

const TXKGPhase = ({
  workflowPhase,
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
  /** The TxKG job — keys the insight tabs and the target detail drawer. */
  jobId = null,
  /**
   * Meta-path analysis over the generated graph:
   * { data: normalizeMetapath(...) | null, loading, error, onAnalyze }.
   * onAnalyze is undefined until a subgraph exists to analyse.
   */
  metapath = null,
}) => {
  /**
   * The signed-in researcher's own label for chat bubbles, and the one agent
   * name this module answers by. Both were hardcoded — "DR. PRIYA (YOU)" and
   * "DRP TXKG AGENT".
   */
  const agentDisplay = moduleDisplayFor('txkg') ?? { label: 'TxKG', role: null };
  // Real TxKG results only. This used to fall back to MOCK_TARGETS (a Type 2
  // Diabetes fixture) whenever the result was empty, and those rows could be
  // ticked and sent on to LitMineX. An empty result now says so instead.
  const hasLiveData = Boolean(txkg?.hasData);
  const targets = hasLiveData ? txkg.targets : [];

  // The old copy hard-coded "10 protein targets" and "Type 2 Diabetes". Both
  // come from the response now.
  const diseaseLabel = hasLiveData ? txkg.disease : null;
  const targetCount = hasLiveData ? txkg.count : 0;

  const headline = `I found ${targetCount} protein target${targetCount === 1 ? "" : "s"} associated with ${diseaseLabel || "this query"}. Here are the top targets ranked by therapeutic relevance:`;

  /**
   * Insights → Recommendations.
   *
   * The API returns one recommendation object plus per-target novelty, so the
   * list is built from the top targets and the chip reads the novelty label.
   * The AI commentary for this tab comes from /agents/txkg/insights and is
   * rendered above these rows.
   */
  const recommendationRows = targets.slice(0, 5).map((t) => ({
    target: t.name,
    status: t.noveltyLabel || "—",
    desc:
      `${t.category || "Target"} · score ${t.score}` +
      (t.pathCount ? ` · ${t.pathCount} connecting path${t.pathCount === 1 ? "" : "s"}` : "") +
      (t.literatureHits != null ? ` · ${t.literatureHits} literature hit${t.literatureHits === 1 ? "" : "s"}` : ""),
  }));

  /**
   * Insights → Sources.
   *
   * The response carries `supportingSources` per target — the curated
   * databases a path was sourced from — not journal citations with DOIs. So
   * this tab now lists the real evidence bases and how many targets each
   * supports, which is what the data actually describes.
   */
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

  /**
   * Meta-path traversals: which target rows are expanded.
   *
   * Testing reported the paths opened only for the first target: rank 1 was a
   * fixed card listing every path, while ranks 2–5 were plain rows showing
   * just their first path with nothing to click. Every target is now an
   * expandable row. Rank 1 starts open; this holds the names the user has
   * toggled away from that default, so it survives re-renders and resets
   * naturally when a new target list arrives.
   */
  const [toggledMetapathTargets, setToggledMetapathTargets] = useState(() => new Set());
  const isMetapathOpen = (name, index) => (index === 0) !== toggledMetapathTargets.has(name);
  const toggleMetapathTarget = (name) =>
    setToggledMetapathTargets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const sourceRows = (() => {
    if (!hasLiveData) return [];
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
          // GET /agents/litminex/targets/custom returns [{ targetName }]; the
          // rest are kept for older payloads.
          return (
            item.targetName ||
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

  /**
   * @param {string} [ensure] - a target just added; kept in the list even if
   *   the re-read does not return it yet, so it always has a checkbox.
   */
  const fetchCustomTargets = useCallback(async (ensure) => {
    const withEnsured = (list) =>
      ensure && !list.includes(ensure) ? [...list, ensure] : list;
    try {
      const payload = await litminexApi.getCustomTargets();
      const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
      setCustomTargets(withEnsured([...new Set(normalizeTargetList(list))]));
    } catch (error) {
      setCustomTargetError(error?.userMessage || error?.message || 'Custom targets could not be loaded.');
      setCustomTargets((prev) => withEnsured(prev));
    }
  }, []);

  const handleAddCustomTarget = async () => {
    const trimmedTarget = customTargetInput.trim();
    if (!trimmedTarget) return;

    setIsAddingCustomTarget(true);
    setCustomTargetError(null);

    try {
      await litminexApi.addCustomTarget(trimmedTarget);

      // Re-fetch the canonical list of custom targets so UI stays in sync
      await fetchCustomTargets(trimmedTarget);

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
  }, [workflowPhase, fetchCustomTargets]);

  /**
   * Custom rows = the server's custom list plus anything selected that is not
   * a TxKG row, so every ticked target can be unticked.
   */
  const targetIds = new Set(targets.map((t) => t.id));
  const customRows = [
    ...new Set([
      ...customTargets,
      ...selectedTargets.filter((id) => !targetIds.has(id)),
    ]),
  ];

  // ─── Insight tabs: GET /agents/txkg/insights/{jobId}?tab= ───────────────────
  // Cached per job and tab, so flicking between tabs does not re-ask the LLM.
  const [insights, setInsights] = useState({});
  const insightTabName = txkgApi.insightTabParam(insightTab);
  const insightKey = jobId ? `${jobId}|${insightTabName}` : null;
  const insightEntry = insightKey ? insights[insightKey] : null;
  const showsInsights =
    hasLiveData && (workflowPhase === 'txkg-results' || workflowPhase === 'target-selection');

  const loadInsight = useCallback(async (id, tab) => {
    const key = `${id}|${tab}`;
    setInsights((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const data = await txkgApi.getInsights(id, tab);
      setInsights((prev) => ({
        ...prev,
        [key]: {
          data: {
            content: typeof data?.content === 'string' ? plain(data.content) : '',
            items: (Array.isArray(data?.items) ? data.items : []).map(readInsightItem).filter(Boolean),
          },
        },
      }));
    } catch (err) {
      setInsights((prev) => ({
        ...prev,
        [key]: { error: err?.userMessage || err?.message || 'These insights could not be loaded.' },
      }));
    }
  }, []);

  useEffect(() => {
    if (!showsInsights || !jobId || insightEntry) return;
    loadInsight(jobId, insightTabName);
  }, [showsInsights, jobId, insightTabName, insightEntry, loadInsight]);

  // ─── Target detail drawer: GET /agents/txkg/targets/{uniprotId}?jobId= ─────
  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!detailTarget) return undefined;
    let cancelled = false;
    setDetail({ loading: true, error: null, data: null });
    txkgApi
      .getTargetDetail(detailTarget.id, jobId)
      .then((data) => {
        if (!cancelled) setDetail({ loading: false, error: null, data });
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail({
            loading: false,
            error: err?.userMessage || err?.message || 'The target detail could not be loaded.',
            data: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [detailTarget, jobId]);

  // ─── Shared render pieces ──────────────────────────────────────────────────

  const apiInsightHasContent = Boolean(
    insightEntry?.data && (insightEntry.data.content || insightEntry.data.items.length)
  );

  /** The agent's commentary for the selected tab, from /agents/txkg/insights. */
  const renderApiInsight = () => {
    if (!jobId) return null;
    if (!insightEntry || insightEntry.loading) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CircularProgress size={12} sx={{ color: TEAL }} />
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
            Loading the agent's commentary…
          </Typography>
        </Box>
      );
    }
    if (insightEntry.error) {
      return (
        <Box role="alert" sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626" }}>{insightEntry.error}</Typography>
          <Button
            size="small"
            onClick={() => loadInsight(jobId, insightTabName)}
            sx={{ textTransform: "none", fontFamily: FONT, fontSize: "12px", color: TEAL, minWidth: 0, p: "0 4px" }}
          >
            Retry
          </Button>
        </Box>
      );
    }
    if (!apiInsightHasContent) return null;
    const { content, items } = insightEntry.data;
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {content && (
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#404552", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {content}
          </Typography>
        )}
        {items.map((item, i) => (
          <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {item.title && (
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1A1F26", lineHeight: 1.4 }}>
                {plain(item.title)}
              </Typography>
            )}
            {item.body && (
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#404552", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {plain(item.body)}
              </Typography>
            )}
            {item.url && (
              <Typography
                component="a"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                {item.url} ↗
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  /**
   * One insight tab's body. The API's commentary leads; the rows derived from
   * the job result (real data: per-target novelty, the agent's next-step
   * recommendation, the curated evidence bases) follow it. The Type 2
   * Diabetes paragraph, the fixed JAK2/DPP4/GLP1R recommendations and the
   * invented DOIs that used to stand in for missing data are gone.
   */
  const renderInsightTabBody = () => {
    if (insightTab === 0) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {renderApiInsight()}
          {!apiInsightHasContent && !insightEntry?.loading && (
            txkg.interpretationBlocks.length ? (
              <>
                {txkg.summary && (
                  <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: INSIGHTS_HEADER, lineHeight: 1.5 }}>
                    {txkg.summary}
                  </Typography>
                )}
                {/* The job result's interpretation, as "**Name (ID)**: prose"
                    blocks rendered as titled paragraphs. */}
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
              </>
            ) : (
              !insightEntry?.error && (
                <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#667080", lineHeight: 1.5 }}>
                  No interpretation was returned for this run.
                </Typography>
              )
            )
          )}
        </Box>
      );
    }

    if (insightTab === 1) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: "#1A1F26", lineHeight: "100%" }}>Recommendations</Typography>
          {renderApiInsight()}

          {/* The agent's own next step, when it gave one. */}
          {txkg.recommendation?.text && (
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

          {recommendationRows.map((rec, i) => {
            const chip = noveltyChipColours(rec.status);
            return (
              <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "4px", p: "10px 12px", bgcolor: "#FAFCFF", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#1A1A26", lineHeight: "100%" }}>{rec.target}</Typography>
                  <Chip label={rec.status} size="small" sx={{ bgcolor: chip.bg, color: chip.fg, fontFamily: FONT, fontSize: "10px", fontWeight: 600, height: "17px", borderRadius: "4px", "& .MuiChip-label": { px: "8px", py: "2px", lineHeight: "100%" } }} />
                </Box>
                <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#4D5461", lineHeight: 1.45 }}>{rec.desc}</Typography>
              </Box>
            );
          })}
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", pt: "12px" }}>
        {renderApiInsight()}
        {/* The job result carries curated evidence bases per target
            (`supportingSources`), not journal citations — so these are the
            real sources and how many targets each one supports. */}
        <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>Evidence sources</Typography>
        {sourceRows.length ? (
          sourceRows.map((source, i) => (
            <Box key={source.name} sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#262E38", lineHeight: 1.4 }}>[{i + 1}] {source.name}</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#667080", lineHeight: "100%" }}>
                Supports {source.count} of {txkg.targets.length} targets
              </Typography>
              {/* The databases' own entry points; a label that matches
                  nothing stays unlinked rather than pointing somewhere
                  invented. */}
              {source.links.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", mt: "2px" }}>
                  {source.links.map((link) => (
                    <Typography
                      key={link.url}
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
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
      </Box>
    );
  };

  /**
   * The meta-path stats row. It was fixed at 12 / 8 / 5 / 1.5 / 24 / 38 / 4
   * for every disease; it now shows what POST /agents/metapath/analyze
   * computed, or says how to get it.
   */
  const renderMetapathStats = (containerSx) => {
    const stats = metapath?.data?.stats ?? [];
    if (stats.length) {
      return (
        <Box sx={containerSx}>
          {stats.map((stat) => (
            <Box key={stat.label} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: "#111827", lineHeight: "19px" }}>{stat.value}</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      );
    }

    return (
      <Box sx={containerSx}>
        {metapath?.loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CircularProgress size={14} sx={{ color: TEAL }} />
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#6B7280" }}>Running meta-path analysis…</Typography>
          </Box>
        ) : (
          <Typography
            role={metapath?.error ? "alert" : undefined}
            sx={{ fontFamily: FONT, fontSize: "12px", color: metapath?.error ? "#DC2626" : "#6B7280", lineHeight: 1.5 }}
          >
            {metapath?.error ||
              (metapath?.data
                ? "The meta-path analysis returned no summary figures."
                : metapath?.onAnalyze
                ? "Meta-path statistics come from a separate analysis of the knowledge graph."
                : "Generate the knowledge graph first — meta-path statistics are computed from it.")}
          </Typography>
        )}
        {metapath?.onAnalyze && !metapath?.loading && (
          <Button
            size="small"
            onClick={metapath.onAnalyze}
            sx={{ textTransform: "none", fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: TEAL }}
          >
            {metapath?.data || metapath?.error ? "Run again" : "Run meta-path analysis"}
          </Button>
        )}
      </Box>
    );
  };

  /**
   * Node-level paths for one target: from the target itself when the TxKG
   * payload carries them, else the meta-path analysis traversals that end at
   * (or name) this target.
   */
  const traversalsFor = (t) => {
    if (t.traversals?.length) return t.traversals;
    const rows = metapath?.data?.traversals ?? [];
    const names = [t.id, t.name, t.fullName, t.geneName].filter(Boolean).map((v) => String(v).toLowerCase());
    return rows.filter((row) =>
      [row.target, row.targetName].some((v) => v != null && names.includes(String(v).toLowerCase()))
    );
  };

  /** Top five targets, each expandable to list all of its sourced meta-paths. */
  const renderMetapathTraversals = () => (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
      <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", lineHeight: "16px" }}>
        Meta-Path Traversals
      </Typography>
      {targets.slice(0, 5).map((t, i) => {
        const open = isMetapathOpen(t.name, i);
        const real = traversalsFor(t);
        // Fallback when no node-level paths are available yet: the path types.
        const paths = t.connectionTypes.map(prettyPath);
        return (
          <Box
            key={`${t.name}-${i}`}
            sx={{ display: "flex", flexDirection: "column", borderRadius: "8px", bgcolor: open ? "#F9FAFB" : "transparent", borderBottom: open ? "none" : `1px solid ${BORDER}` }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => toggleMetapathTarget(t.name)}
              aria-expanded={open}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                p: "8px 12px",
                width: "100%",
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONT,
              }}
            >
              <ExpandMoreOutlined
                sx={{ width: 18, height: 18, color: "#94A3B8", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#111827", lineHeight: "15px", minWidth: 44 }}>
                {t.name}
              </Typography>
              {/* Collapsed rows preview the first path and how many more there are. */}
              <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", color: "#6B7280", lineHeight: "13px", visibility: open ? "hidden" : "visible" }}>
                {real.length
                  ? `${real[0].text}${real.length > 1 ? ` (+${real.length - 1} more)` : ""}`
                  : `${paths.length ? paths[0] : "No sourced path"}${paths.length > 1 ? ` (+${paths.length - 1} more)` : ""}`}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", p: "3px 8px", bgcolor: i === 0 ? "#00BCD4" : "#D1FAE5", borderRadius: "8px" }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: i === 0 ? "#FFFFFF" : "#059669", lineHeight: "13px" }}>
                  {t.score}
                </Typography>
              </Box>
            </Box>
            {open && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", p: "0 12px 10px 38px" }}>
                {real.length ? (
                  real.map((traversal, j) => <PathChain key={j} traversal={traversal} />)
                ) : (
                  <>
                    {paths.length > 0 && (
                      <Typography sx={{ fontFamily: FONT, fontSize: "10px", color: "#94A3B8" }}>
                        Path types. Run meta-path analysis to see the actual nodes.
                      </Typography>
                    )}
                    {(paths.length ? paths : ["No sourced path for this target"]).map((path, j) => (
                      <Typography key={j} sx={{ fontFamily: FONT, fontSize: "11px", color: "#6B7280", lineHeight: 1.35 }}>
                        • {path}
                      </Typography>
                    ))}
                  </>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );

  /** Scores and traversals from the meta-path analysis, when it has run. */
  const renderMetapathResults = () => {
    const data = metapath?.data;
    if (!data || (!data.scores.length && !data.traversals.length)) return null;
    return (
      <Box sx={{ mt: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {data.scores.length > 0 && (
          <>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", lineHeight: "16px" }}>Meta-path scores</Typography>
            {data.scores.map((row, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", p: "6px 12px", gap: "8px", borderBottom: `1px solid ${BORDER}` }}>
                <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", color: "#6B7280", lineHeight: 1.35 }}>{row.name}</Typography>
                <Box sx={{ p: "3px 8px", bgcolor: "#D1FAE5", borderRadius: "8px" }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#059669", lineHeight: "13px" }}>{row.score}</Typography>
                </Box>
              </Box>
            ))}
          </>
        )}
        {data.traversals.length > 0 && (
          <>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#111827", lineHeight: "16px", mt: "8px" }}>Analysed traversals</Typography>
            {data.traversals.slice(0, 25).map((row, i) => (
              <Box key={i} sx={{ py: "4px", borderBottom: `1px solid ${BORDER}` }}>
                <PathChain traversal={row} />
              </Box>
            ))}
          </>
        )}
      </Box>
    );
  };

  /** A clickable row of the ranked-target table; opens the detail drawer. */
  const openDetail = (target) => setDetailTarget(target);

  const detailData = detail.data || {};
  const detailRows = detailTarget
    ? [
        ["Name", detailData.name ?? detailTarget.fullName],
        ["Gene", detailData.geneName ?? detailTarget.geneName],
        ["UniProt ID", detailData.uniprotId ?? detailTarget.id],
        ["Organism", detailData.organism],
        ["Score", detailData.score != null ? formatScore(detailData.score) : detailTarget.score],
        ["Category", detailTarget.category],
        ["Novelty", detailTarget.noveltyLabel],
        ["Confirmed by sourcing", detailTarget.confirmed == null ? null : detailTarget.confirmed ? "Yes" : "No"],
        ["Literature hits", detailTarget.literatureHits],
        ["Patent hits", detailTarget.patentHits],
      ].filter(([, value]) => value != null && value !== "")
    : [];

  const detailDrawer = (
    <Drawer
      anchor="right"
      open={Boolean(detailTarget)}
      onClose={() => setDetailTarget(null)}
      PaperProps={{ sx: { width: 380, maxWidth: "100vw", p: "24px", boxSizing: "border-box" } }}
    >
      {detailTarget && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: TEXT_DARK }}>
              {detailData.geneName || detailTarget.name}
            </Typography>
            <IconButton size="small" aria-label="Close target detail" onClick={() => setDetailTarget(null)}>
              <CloseOutlined sx={{ fontSize: 18, color: "#6B7280" }} />
            </IconButton>
          </Box>

          {detail.loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CircularProgress size={14} sx={{ color: TEAL }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>Loading from UniProt…</Typography>
            </Box>
          )}
          {detail.error && (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626" }}>{detail.error}</Typography>
          )}

          {detailRows.map(([label, value]) => (
            <Box key={label}>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "4px" }}>
                {label}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK }}>{String(value)}</Typography>
            </Box>
          ))}

          <Typography
            component="a"
            href={detailData.uniprotUrl || uniprotUrl(detailTarget.id)}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            ↗ View on UniProt
          </Typography>
        </Box>
      )}
    </Drawer>
  );

  // ─── Loading ────────────────────────────────────────────────────────────
  if (workflowPhase === 'txkg-loading') {
    return (
      <Box className="txkg-loading-content" sx={{ bgcolor: GRAY_BG }}>
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

  // ─── No targets ──────────────────────────────────────────────────────────
  // An empty or unreadable result used to render the Type 2 Diabetes fixture
  // as if it were this run's answer. It now says plainly that there is
  // nothing, with Rerun still available.
  if ((workflowPhase === 'txkg-results' || workflowPhase === 'target-selection') && !hasLiveData) {
    return (
      <Box className="txkg-results-content" sx={{ bgcolor: GRAY_BG }}>
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "10px", p: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>
            TxKG finished but returned no targets for this query, so there is nothing to rank or pass on to LitMineX.
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.5 }}>
            Try naming the disease more specifically, or rerun the step.
          </Typography>
          <PhaseActions {...actions} />
        </Box>
      </Box>
    );
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  if (workflowPhase === 'txkg-results') {
    return (
      <Box className="txkg-results-content" sx={{ bgcolor: GRAY_BG }}>

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
                    {targets.map((target, i) => (
                      <Box
                        key={target.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Show detail for ${target.name}`}
                        onClick={() => openDetail(target)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDetail(target);
                          }
                        }}
                        sx={{ display: "flex", p: "12px 16px", cursor: "pointer", borderBottom: i < targets.length - 1 ? `1px solid ${BORDER}` : "none", bgcolor: i === 0 ? "rgba(0,188,212,0.08)" : "transparent", "&:hover": { bgcolor: i === 0 ? "rgba(0,188,212,0.12)" : "#F8FAFC" } }}
                      >
                        <Typography component="a" href={uniprotUrl(target.id)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{target.id}</Typography>
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
                    {renderInsightTabBody()}
                  </Box>
                </Box>
              </Box>
              {/* These three were plain Buttons with no onClick (Branch only
                  opened a mock dialog). They are the shared, wired row now. */}
              <Box sx={{ mt: "16px" }}>
                <PhaseActions {...actions} />
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
                diseaseLabel={diseaseLabel}
                notice={subgraph?.notice ?? null}
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
              {renderMetapathStats({ display: "flex", alignItems: "center", flexWrap: "wrap", p: "12px 16px", gap: "32px", bgcolor: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: "8px" })}
              <Box sx={{ display: "flex", gap: "16px", mt: "16px" }}>
              {/* Item 19: only the meta-paths are shown here. The left column
                  was a duplicate "Target Prediction Scores" list — the same
                  ranked targets already rendered in the results table above,
                  which made the panel read as two different scores for the
                  same target. */}
                {renderMetapathTraversals()}
              </Box>
              {renderMetapathResults()}
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
                  {/* The copy says "all N", and all N are now what is sent. This
                      used to send only the three pre-ticked rows. */}
                  <p className="option-card-description">
                    Run LitMinex on {targets.length === 1 ? "the" : `all ${targets.length}`} identified target
                    {targets.length === 1 ? "" : "s"} ranked by therapeutic relevance
                  </p>
                  <button
                    className="option-card-button primary"
                    disabled={continuePending || !targets.length}
                    onClick={() => onContinue?.(targets.map((t) => t.id))}
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
        {detailDrawer}
      </Box>
    );
  }

  // ─── Target Selection ─────────────────────────────────────────────────────
  if (workflowPhase === 'target-selection') {
    return (
      <Box sx={{ p: "24px 40px 0 40px", bgcolor: GRAY_BG }}>
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
                    {targets.map((t, i) => (
                      <Box
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Show detail for ${t.name}`}
                        onClick={() => openDetail(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDetail(t);
                          }
                        }}
                        sx={{ display: "flex", p: "10px 12px", cursor: "pointer", borderBottom: i < targets.length - 1 ? `1px solid ${BORDER}` : "none", "&:hover": { bgcolor: "#F8FAFC" } }}
                      >
                        <Typography component="a" href={uniprotUrl(t.id)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{t.id}</Typography>
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
                    {renderInsightTabBody()}
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
                diseaseLabel={diseaseLabel}
                notice={subgraph?.notice ?? null}
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
              {renderMetapathStats({ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "24px", p: "12px 16px", bgcolor: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: "8px", mb: "16px" })}
              <Box sx={{ display: "flex", gap: "16px" }}>
              {/* Item 19: only the meta-paths are shown here. The left column
                  was a duplicate "Target Prediction Scores" list — the same
                  ranked targets already rendered in the results table above,
                  which made the panel read as two different scores for the
                  same target. */}
                {renderMetapathTraversals()}
              </Box>
              {renderMetapathResults()}
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
          {targets.map((target) => (
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

          {customRows.length > 0 && (
            <Box sx={{ mt: "8px", borderTop: `1px solid ${BORDER}`, pt: "8px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, mb: "8px" }}>Custom targets</Typography>
              {customRows.map((targetName) => {
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
                onClick={() => onContinue?.()}
                sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600, px: "20px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" }, "&.Mui-disabled": { bgcolor: "#E2E8F0" } }}
              >
                {continuePending ? "Starting LitMineX…" : "Proceed to LitMinex"}
              </Button>
            </Box>
          </Box>
        </Box>
        {detailDrawer}
      </Box>
    );
  }

  return null;
};

export default TXKGPhase;