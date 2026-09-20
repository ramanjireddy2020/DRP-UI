import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ArtifactsPage from "./ArtifactsPage";
import LineagePage from "./LineagePage";
import ShareModal from "../ShareModal/ShareModal";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button,
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions
} from "@mui/material";
import { ExpandMoreOutlined, CloseOutlined } from "@mui/icons-material";
import SideBar from "../SideBar/SideBar";
import TXKGPhase from "../workflow/TXKG/TXKGPhase";
import LiteminexPhase from "../workflow/Liteminex/LiteminexPhase";
import CuratexPhase from "../workflow/Curatex/CuratexPhase";
import ScreeningSuitePhase from "../workflow/ScreeningSuite/ScreeningSuitePhase";
import NoveltySearchPhase from "../workflow/NoveltySearch/NoveltySearchPhase";
import useWorkflowSession from "../../hooks/useWorkflowSession";
import useJob from "../../hooks/useJob";
import usePhaseResults from "../../hooks/usePhaseResults";
import { moduleForPhase, isErrorPhase, MODULE_BY_KEY } from "../../workflow/moduleMap";
import { normalizeTxkgResult } from "../../workflow/txkgResult";
import { toGeneNames, buildSelections } from "../../workflow/selections";
import { toApiWeights } from "../../workflow/phaseResults";
import curatexApi from "../../services/api/curatex";
import litminexApi from "../../services/api/litminex";
import txkgApi from "../../services/api/txkg";
import usePhaseActions from "../../hooks/usePhaseActions";
import { pubmedUrl } from "../../workflow/sourceLinks";
import {
  SCREENSUITE_UNAVAILABLE,
  SCREENSUITE_UNAVAILABLE_MESSAGE,
} from "../../services/api/screensuite";
import PhaseError from "../workflow/PhaseError";
import ChatInputBar from "../workflow/ChatInputBar";
import PipelinePhase from "../workflow/PipelinePhase";
import { useCurrentUser } from "../../context/CurrentUserContext";
import './WorkflowStyles.css';

// Design tokens matching Figma
const FONT = "'Geist', sans-serif";
const TEAL = "#00BCD4";
const GRAY_BG = "#F8FAFC";
const BORDER = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#808794";

// Workflow steps - NON-CLICKABLE as per requirements
const WORKFLOW_STEPS = [
  { id: 1, number: "01", label: "TxKG", key: "txkg" },
  { id: 2, number: "02", label: "LitMineX", key: "litminex" },
  { id: 3, number: "03", label: "CurateX", key: "curatex" },
  { id: 4, number: "04", label: "ScreenSuite", key: "screensuite" },
  { id: 5, number: "05", label: "NovSearch", key: "novsearch" },
];

const CompleteWorkflow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const query = location.state?.query || "Find protein targets associated with Type 2 Diabetes for drug repurposing";
  
  // ---------------------------------------------------------------------------
  // Session state.
  //
  // The supervisor decides which module runs first, so there is no hard-coded
  // starting phase here any more. Every module keeps its own phase, job and
  // data in the session store, which is what lets the user click back to an
  // earlier step without losing anything.
  //
  // `workflowPhase` / `activeStep` / `chatMessages` keep their original names
  // and meanings so the render code below — and all five phase components —
  // continue to work unchanged.
  // ---------------------------------------------------------------------------
  const session = useWorkflowSession();

  const workflowPhase = session.activePhase ?? "txkg-loading";
  const activeStep = session.activeIndex;

  /**
   * Setting a phase can also mean switching module: the phase string already
   * says which module owns it, so a child calling
   * setWorkflowPhase("litminex-loading") activates LitMineX. That is why the
   * phase components did not need changing.
   */
  const { setPhase, activateModule, goToIndex, activeKey } = session;

  const setWorkflowPhase = useCallback(
    (phase) => {
      const owner = moduleForPhase(phase);
      if (!owner) return;

      if (owner.key === activeKey) {
        setPhase(phase);
      } else {
        activateModule(owner.key, { phase });
      }
    },
    [activeKey, setPhase, activateModule]
  );

  /**
   * Navigation only — it cannot reach a module that has never been activated.
   * Children call setActiveStep(n) immediately before setWorkflowPhase(...);
   * in that pairing this is a no-op and the phase call does the activation,
   * which is the correct order of events.
   */
  const setActiveStep = useCallback((index) => goToIndex(index), [goToIndex]);

  const [insightTab, setInsightTab] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState("txkg");
  // Empty until TxKG returns. The three accessions that used to seed this
  // (P37231/P27487/P08172) came from the Figma mock and appear in no real
  // result, so the "3 selected" badge was always wrong. An effect below
  // pre-ticks the top three actual targets instead.
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [litMinexResults, setLitMinexResults] = useState([]);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [branchOpen, setBranchOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchCreated, setBranchCreated] = useState(false);
  const [branchName, setBranchName] = useState("JAK2-alternative-targets");
  const [branchDescription, setBranchDescription] = useState("Saving therapeutic target prediction results for Type 2 Diabetes disease pathway analysis.");
  const [viewMode, setViewMode] = useState("chat"); // 'chat' | 'artifacts'
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Share Research Session modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("can view");
  // Review point 6: the access list was three invented researchers. The owner
  // row is the signed-in user; anyone actually invited is appended to it.
  const [sharePeople, setSharePeople] = useState([]);

  useEffect(() => {
    setSharePeople((people) => {
      const invited = people.filter((person) => person.role !== "Owner");
      return [
        {
          initials: currentUser.initials || "—",
          name: currentUser.displayName,
          email: currentUser.email || "",
          role: "Owner",
          color: "#00BCD4",
        },
        ...invited,
      ];
    });
  }, [currentUser.initials, currentUser.displayName, currentUser.email]);

  /**
   * The target product profile.
   *
   * Empty until GET /agents/curatex/{jobId}/profile returns. It used to be a
   * hardcoded Type 2 Diabetes / JAK2 profile, which meant the criteria the
   * researcher edited — and therefore the weights sent to the compound
   * scorer — had nothing to do with the target actually under study.
   */
  const [profileData, setProfileData] = useState({});
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [curateXResults, setCurateXResults] = useState([]);
  const [showCompoundDetail, setShowCompoundDetail] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState(null);
  /**
   * Pagination, one page per table.
   *
   * These were a single `currentPage`, which meant paging the article list to
   * page 3 also asked CurateX for page 3 of its compounds — a different table
   * with a different length.
   */
  const [litminexPage, setLitminexPage] = useState(1);
  const [curatexPage, setCuratexPage] = useState(1);
  /**
   * The conversation is owned by the session store and is append-only, so
   * moving between steps never drops a message. What is rendered is the slice
   * up to and including the step being viewed.
   */
  const chatMessages = session.visibleConversation;

  // The composer's draft lives inside ChatInputBar now. Held here, every polled
  // job status re-rendered this component and disturbed what was being typed.

  // ---------------------------------------------------------------------------
  // Supervisor
  //
  // Requirement: whatever module the supervisor returns is the module that gets
  // activated. The old code started at "txkg-loading" unconditionally; now the
  // starting module comes from the API response. See useWorkflowSession.
  // ---------------------------------------------------------------------------
  const startedRef = useRef(false);

  /**
   * module/projectId come from the composer when the researcher pinned one.
   * Left null, dispatch.infer_module() decides: explicit module → @mention →
   * keywords → TxKG. Sending null is meaningfully different from sending a
   * guess, so neither is defaulted here.
   *
   * Shared with the retry on the session-error screen, so a retry sends exactly
   * what the first attempt did.
   */
  const startSession = useCallback(
    () =>
      session.startSession({
        query,
        module: location.state?.module ?? null,
        projectId: location.state?.projectId ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, location.state, session.startSession]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    startSession();
    // Intentionally mount-only: a session is created once per workflow entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Job polling.
  //
  // This replaced a chain of setTimeouts that faked every agent run, together
  // with the hardcoded article, compound, target, docking and patent fixtures
  // they set. Nothing on these screens is invented any more: a phase either
  // shows what the backend returned or says why it could not.
  // ---------------------------------------------------------------------------
  const activeJobId = session.activeJobId;
  const job = useJob(activeJobId, { enabled: Boolean(activeJobId) });

  /**
   * CurateX runs TWO jobs. The first builds the target profile; the second
   * scores compounds against the criteria the researcher edited. Only the first
   * belongs to the session step, so the second needs its own id and poll.
   */
  const compoundsJobId = session.steps.curatex?.data?.compoundsJobId ?? null;
  const compoundsJob = useJob(compoundsJobId, {
    enabled: Boolean(compoundsJobId),
    // The compounds come from /agents/curatex/{jobId}/results, which is
    // paginated; the generic job result would be a second copy of the same
    // data with no page controls.
    fetchResult: false,
  });

  /**
   * When the active module's job finishes, move that module from its
   * "-loading" phase to its results phase and keep the payload.
   *
   * `resultsPhase` carries CurateX's exception — its first job resolves to the
   * editable profile screen, not to results — so there is no special case here.
   */
  useEffect(() => {
    if (!job.isDone) return;

    const owner = moduleForPhase(workflowPhase);
    if (!owner) return;
    if (!workflowPhase.endsWith("-loading")) return;

    if (job.result) {
      session.setStepData({ jobResult: job.result }, owner.key);
    }

    setWorkflowPhase(owner.resultsPhase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.isDone, job.result]);

  /**
   * A failed job moves its module to its own "-error" phase, carrying the
   * backend's reason. Previously there was no path out of "-loading" at all on
   * failure, so a crashed agent left the spinner turning.
   */
  useEffect(() => {
    if (!job.isFailed) return;
    const owner = moduleForPhase(workflowPhase);
    if (!owner) return;
    session.setStepError(job.error, owner.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.isFailed, job.error]);

  /** The compounds job drives the second half of CurateX. */
  useEffect(() => {
    if (compoundsJob.isDone) {
      setWorkflowPhase("curatex-results");
      return;
    }
    if (compoundsJob.isFailed) {
      session.setStepError(compoundsJob.error, "curatex");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compoundsJob.isDone, compoundsJob.isFailed, compoundsJob.error]);

  /**
   * TxKG results, normalised from whatever the job stored.
   *
   * Reads from the step store rather than from `job.result` directly, so the
   * data survives navigating away to another step and back — which is the whole
   * point of keeping per-step state.
   */
  const txkgResult = useMemo(
    () => normalizeTxkgResult(session.steps.txkg?.data?.jobResult),
    [session.steps.txkg]
  );

  // ---------------------------------------------------------------------------
  // Per-module results.
  //
  // Each phase reads its own endpoint, which is the pattern the API documents:
  // "on completed → call that module's results endpoint". The paginated article
  // and compound tables and the tabbed insights have no equivalent in the
  // generic job result.
  //
  // TxKG is the exception above — its normaliser reads the generic result and
  // was written against a verified response.
  //
  // These hooks are called unconditionally and gated with `enabled`, so the
  // hook order never changes between renders.
  // ---------------------------------------------------------------------------
  const litminexStep = session.steps.litminex;
  const litminex = usePhaseResults("litminex", litminexStep?.jobId, {
    enabled: litminexStep?.phase === "litminex-results",
    page: litminexPage,
  });

  const curatexStep = session.steps.curatex;
  const curatexProfile = usePhaseResults("curatex-profile", curatexStep?.jobId, {
    enabled: curatexStep?.phase === "curatex-profile",
  });

  const curatexResults = usePhaseResults("curatex-results", compoundsJobId, {
    enabled: Boolean(compoundsJobId) && compoundsJob.isDone,
    page: curatexPage,
    pageSize: 10,
  });

  const screensuiteStep = session.steps.screensuite;
  const screensuite = usePhaseResults("screensuite", screensuiteStep?.jobId, {
    enabled: screensuiteStep?.phase === "screensuite-results",
  });

  const novsearchStep = session.steps.novsearch;
  const novsearch = usePhaseResults("novsearch", novsearchStep?.jobId, {
    enabled: novsearchStep?.phase === "novelty-results",
  });

  const pipelineStep = session.steps.pipeline;
  const pipeline = usePhaseResults("pipeline", pipelineStep?.jobId, {
    enabled: pipelineStep?.phase === "pipeline-results",
  });

  /**
   * Branch / Rerun / Export for whichever step is on screen.
   *
   * All three were dead buttons in every phase. Export needs a completed job,
   * so it is keyed on the active step's jobId — or CurateX's compounds job,
   * whose results are what the CurateX table actually shows.
   */
  const exportableJobId =
    session.activeKey === "curatex" && compoundsJobId ? compoundsJobId : activeJobId;

  const actions = usePhaseActions({
    session,
    jobId: exportableJobId,
    moduleLabel: session.activeModule?.label,
  });

  /**
   * Item 23: which articles the researcher has ticked.
   *
   * The checkboxes were `checked={idx === 0} readOnly`, so the first row was
   * always ticked and none could be changed.
   */
  const [selectedArticles, setSelectedArticles] = useState([]);

  const handleToggleArticle = useCallback((articleId) => {
    setSelectedArticles((prev) =>
      prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId]
    );
  }, []);

  /**
   * Item 18: the knowledge graph, which is its own job.
   *
   * POST /agents/subgraph/generate returns a jobId that has to be polled
   * separately from the TxKG query, then read from /agents/subgraph/{id} and
   * /stats. Nothing built it before — the picture on screen was a static SVG.
   */
  const [graphJobId, setGraphJobId] = useState(null);
  const [graphState, setGraphState] = useState({ graph: null, stats: null, error: null });
  const graphJob = useJob(graphJobId, { enabled: Boolean(graphJobId), fetchResult: false });

  const handleGenerateSubgraph = useCallback(async () => {
    if (!txkgResult.hasData) return;

    setGraphState({ graph: null, stats: null, error: null });
    try {
      const response = await txkgApi.generateSubgraph({
        disease: txkgResult.disease,
        targetIds: txkgResult.targets.slice(0, 10).map((t) => t.id),
        maxNodes: 100,
      });
      const jobId = response?.jobId ?? response?.job_id ?? null;
      if (!jobId) throw new Error("The graph job did not return a job id.");
      setGraphJobId(jobId);
    } catch (err) {
      setGraphState({
        graph: null,
        stats: null,
        error: err?.userMessage || err?.message || "The knowledge graph could not be built.",
      });
    }
  }, [txkgResult]);

  // Once the graph job finishes, read its nodes/edges and its counts.
  useEffect(() => {
    if (!graphJob.isDone || !graphJobId) return;

    let mounted = true;
    Promise.all([
      txkgApi.getSubgraph(graphJobId),
      txkgApi.getSubgraphStats(graphJobId).catch(() => null),
    ])
      .then(([graph, stats]) => {
        if (mounted) setGraphState({ graph, stats, error: null });
      })
      .catch((err) => {
        if (mounted) {
          setGraphState({
            graph: null,
            stats: null,
            error: err?.userMessage || err?.message || "The graph could not be read.",
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [graphJob.isDone, graphJobId]);

  useEffect(() => {
    if (graphJob.isFailed) {
      setGraphState({ graph: null, stats: null, error: graphJob.error });
    }
  }, [graphJob.isFailed, graphJob.error]);

  /** One node's neighbours, appended to the graph on click. */
  const handleExploreNode = useCallback(
    async (nodeId) => {
      if (!graphJobId) return;
      try {
        const extra = await txkgApi.exploreNode(graphJobId, nodeId);
        setGraphState((prev) => {
          if (!prev.graph) return prev;
          const seen = new Set(prev.graph.nodes.map((n) => n.id));
          return {
            ...prev,
            graph: {
              ...prev.graph,
              nodes: [...prev.graph.nodes, ...(extra?.nodes ?? []).filter((n) => !seen.has(n.id))],
              edges: [...(prev.graph.edges ?? []), ...(extra?.edges ?? [])],
            },
          };
        });
      } catch {
        // A failed expansion leaves the existing graph alone; the node simply
        // does not open. Worth no banner of its own.
      }
    },
    [graphJobId]
  );

  const subgraph = useMemo(
    () => ({
      graph: graphState.graph,
      stats: graphState.stats,
      error: graphState.error,
      loading: graphJob.isPolling || (Boolean(graphJobId) && !graphState.graph && !graphState.error),
      onNodeClick: graphJobId ? handleExploreNode : undefined,
    }),
    [graphState, graphJob.isPolling, graphJobId, handleExploreNode]
  );

  /**
   * The profile form is seeded from the API's criteria the first time they
   * arrive, then left alone so the researcher's edits are not overwritten by a
   * re-fetch.
   */
  const profileSeededRef = useRef(false);
  useEffect(() => {
    if (profileSeededRef.current) return;
    if (!curatexProfile.data?.hasData) return;
    profileSeededRef.current = true;
    setProfileData(curatexProfile.data.profileData);
  }, [curatexProfile.data]);

  /**
   * Default target selection.
   *
   * This used to be three hardcoded accessions (P37231, P27487, P08172) that
   * belonged to the Figma mock and will not appear in any real result, so the
   * "3 selected" badge was always a lie. The top three actual targets are
   * pre-ticked instead, once there are any.
   */
  const seededTargetsRef = useRef(false);
  useEffect(() => {
    if (seededTargetsRef.current) return;
    if (!txkgResult.hasData || !txkgResult.targets.length) return;
    seededTargetsRef.current = true;
    setSelectedTargets(txkgResult.targets.slice(0, 3).map((t) => t.id));
  }, [txkgResult]);

  // Keep the LitMineX / CurateX table props fed from the API responses. The
  // setters stay so the phase components' signatures do not change.
  useEffect(() => {
    if (litminex.data?.articles) setLitMinexResults(litminex.data.articles);
  }, [litminex.data]);

  useEffect(() => {
    if (curatexResults.data?.compounds) setCurateXResults(curatexResults.data.compounds);
  }, [curatexResults.data]);

  // Stepper connector — 54×18px with 3 grey dots (Figma connector-1/connector-2 spec)
  const StepConnector = () => (
    <Box sx={{ width: "54px", height: "18px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: "4px", py: "2px", pl: "28px" }}>
      {[0,1,2].map(i => (
        <Box key={i} sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#CBD5E1" }} />
      ))}
    </Box>
  );

  // Stepper — Figma: 180px fixed, #F5F8FA, border #E2E8F0, pt 30px
  // Active row: 180 Fill × 42px | dash 20×0 border 1.5px #00BCD4 | badge pill radius:11 padding:3/8 #00BCD4 | label Inter Bold 15px #00BCD4
  const WorkflowStepper = () => (
    <Box sx={{
      width: "180px", flexShrink: 0,
      bgcolor: "#F5F8FA",
      border: "1px solid #E2E8F0", borderTop: "none",
      pt: "30px",
      display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {WORKFLOW_STEPS.map((step, index) => {
        // Visited-ness comes from the session, not from index arithmetic: the
        // supervisor can activate modules out of pipeline order, so "earlier
        // than the active step" no longer means "already done".
        const railStep = session.rail.find((r) => r.key === step.key);
        const isActive = Boolean(railStep?.isActive);
        // Item 27: a tick means the step actually completed. This was
        // `visited && !isActive`, so a module that had merely been activated —
        // or whose run failed — showed a completed tick the moment the user
        // looked at another step.
        const isCompleted = Boolean(railStep?.isCompleted) && !isActive;
        const isFailed = Boolean(railStep?.isFailed) && !isActive;
        const canNavigate = Boolean(railStep?.isNavigable);

        // Requirement: the user can move between steps from this panel. Only
        // steps that have actually run are reachable — clicking one restores
        // that step's own view, and nothing it holds is discarded.
        const goToStep = canNavigate
          ? () => session.goToModule(step.key)
          : undefined;

        return (
          <React.Fragment key={step.id}>
            {isCompleted || isFailed ? (
              /* Completed: dark dash + circle with checkmark — clickable.
                 Failed: the same row in red with a "!", so a crashed step is
                 not indistinguishable from a finished one. */
              <Box
                onClick={goToStep}
                role={canNavigate ? "button" : undefined}
                tabIndex={canNavigate ? 0 : undefined}
                aria-label={canNavigate ? `Go back to ${step.label}` : undefined}
                onKeyDown={
                  canNavigate
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToStep();
                        }
                      }
                    : undefined
                }
                sx={{
                  display: "flex", alignItems: "center", height: "42px", width: "180px",
                  cursor: canNavigate ? "pointer" : "default",
                  borderRadius: "0 6px 6px 0",
                  transition: "background-color .12s ease",
                  "&:hover": canNavigate ? { bgcolor: "rgba(26,46,68,0.06)" } : undefined,
                  "&:focus-visible": canNavigate
                    ? { outline: "2px solid #00BCD4", outlineOffset: "-2px" }
                    : undefined,
                }}
              >
                <Box sx={{ width: "20px", height: 0, borderTop: `1.5px solid ${isFailed ? "#DC2626" : "#1A2E44"}`, flexShrink: 0 }} />
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: isFailed ? "#DC2626" : "#1A2E44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
                    {isFailed ? "!" : "✓"}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "15px", fontWeight: 700, color: isFailed ? "#DC2626" : "#1A2E44", ml: "10px", lineHeight: 1 }}>
                  {step.label}
                </Typography>
              </Box>
            ) : isActive ? (
              /* Active: left accent border + dash + numbered pill badge + label */
              <Box sx={{ display: "flex", alignItems: "center", height: "42px", width: "180px", bgcolor: "rgba(0,188,212,0.07)", borderRadius: "0 6px 6px 0", borderLeft: "3px solid #00BCD4" }}>
                <Box sx={{ width: "17px", height: 0, borderTop: "1.5px solid #00BCD4", flexShrink: 0 }} />
                <Box sx={{ borderRadius: "11px", px: "8px", py: "3px", bgcolor: "#00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "11px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
                    {String(step.id).padStart(2, "0")}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "15px", fontWeight: 700, color: "#00BCD4", ml: "10px", lineHeight: 1 }}>
                  {step.label}
                </Typography>
              </Box>
            ) : (
              /* Inactive: Inter Medium 14px #94A3B8, pl 28px to align with label start */
              <Box sx={{ display: "flex", alignItems: "center", height: "42px", pl: "28px" }}>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "14px", fontWeight: 500, color: "#94A3B8", lineHeight: 1 }}>
                  {String(step.id).padStart(2, "0")} {step.label}
                </Typography>
              </Box>
            )}
            {index < WORKFLOW_STEPS.length - 1 && <StepConnector />}
          </React.Fragment>
        );
      })}
    </Box>
  );

  // TopNavBar — top-nav row (breadcrumb + saved) + app-toolbar row (44px, tab-group, result summary, branch dropdown)
  const TopNavBar = ({ viewMode, setViewMode, setShowShareDialog }) => {
    const isLoading = workflowPhase.endsWith("-loading");
    const TOTAL_TARGETS = 10;
    const getTabInfo = () => {
      switch (workflowPhase) {
        case 'txkg-loading':    return { badge: 1, title: "Target identification query", count: "/ 1",   dotColor: "#FFC107", statusText: "Searching databases" };
        case 'txkg-results':   return { badge: 1, title: "Target identification",       count: `/ ${TOTAL_TARGETS}`, dotColor: "#00BCD4", statusText: `${TOTAL_TARGETS} targets found` };
        case 'target-selection': return { badge: 1, title: "Target selection",          count: `/ ${TOTAL_TARGETS}`, dotColor: "#00BCD4", statusText: `${selectedTargets.length} selected \u2022 ${TOTAL_TARGETS - selectedTargets.length} available` };
        case 'litminex-loading': return { badge: 2, title: "Literature mining",         count: "/ ...", dotColor: "#FFC107", statusText: "Searching databases" };
        case 'litminex-results': return { badge: 2, title: "Literature mining",         count: "/ 124", dotColor: "#00BCD4", statusText: "124 articles found" };
        case 'curatex-loading':  return { badge: 3, title: "Compound screening",        count: "/ ...", dotColor: "#FFC107", statusText: "Analyzing..." };
        case 'curatex-profile':  return { badge: 3, title: "Target profile",            count: "",      dotColor: "#00BCD4", statusText: "Profile ready" };
        case 'curatex-submitted':return { badge: 3, title: "Compound screening",        count: "/ ...", dotColor: "#FFC107", statusText: "Scoring compounds..." };
        case 'curatex-results':  return { badge: 3, title: "Compound screening",        count: "/ 124", dotColor: "#00BCD4", statusText: "6 matches found" };
        case 'screensuite-loading': return { badge: 4, title: "Docking initialization", count: "/ 2", dotColor: "#FFC107", statusText: "Pipeline starting" };
        case 'screensuite-results': return { badge: 4, title: "Docking results", count: "/ 2", dotColor: "#00BCD4", statusText: "Docking complete" };
        default:
          if (workflowPhase.startsWith('screensuite')) return { badge: 4, title: "Docking initialization", count: "/ 2", dotColor: "#FFC107", statusText: "Pipeline starting" };
          if (workflowPhase.startsWith('novelty'))     return { badge: 5, title: "Novelty search",   count: "", dotColor: "#FFC107", statusText: "Processing..." };
          return { badge: activeStep + 1, title: WORKFLOW_STEPS[activeStep]?.label || "", count: "", dotColor: "#00BCD4", statusText: "" };
      }
    };
    const tabInfo = getTabInfo();
    const BRANCHES = [
      { id: "main", label: "Main", sub: "Main research path" },
      { id: "alt-jak2", label: "Alt · JAK2 + TPOR (MPL)", sub: "Forked at Target identification" },
    ];
    /**
     * The last breadcrumb is just the module's name.
     *
     * It read "TxKG Query" for the TxKG phases; the trailing "Query" is dropped
     * so the crumb matches the step name in the rail.
     */
    const lastCrumb = moduleForPhase(workflowPhase)?.label
      || WORKFLOW_STEPS[activeStep]?.label
      || "";
    return (
      <Box sx={{ bgcolor: "#FFFFFF", flexShrink: 0, position: "relative" }}>
        {/* Row 1: breadcrumb + All changes saved — hug height, 32px L/R padding, bottom border */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: "32px", py: "10px",
          borderBottom: "1px solid #E2E8F0"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* The disease came from a hardcoded "Type 2 Diabetes", so a
                thrombocytosis session still read as diabetes. It now comes from
                the TxKG result, and falls back to the project name rather than
                naming a disease the session is not about. */}
            {[
              location.state?.projectName || "New Project",
              txkgResult.disease || null,
              lastCrumb,
            ].filter(Boolean).map((crumb, i, arr) => (
              <React.Fragment key={i}>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "13px", fontWeight: i === arr.length-1 ? 600 : 400, color: i === arr.length-1 ? "#0F172A" : "#94A3B8" }}>
                  {crumb}
                </Typography>
                {i < arr.length-1 && <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "13px", color: "#94A3B8", mx: "2px" }}>/</Typography>}
              </React.Fragment>
            ))}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22C55E" }} />
            <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "12px", color: "#94A3B8" }}>All changes saved</Typography>
          </Box>
        </Box>

        {/* app-toolbar with proper structure */}
        <div className="app-toolbar">
          <div className="tabs-row">
            {/* tabs-left */}
            <div className="tabs-left">
              {/* pill-tabs */}
              <div className="pill-tabs">
                {/* tab-chat */}
                  <div className="tab-chat" onClick={() => setViewMode("chat")} style={{ cursor: "pointer" }}>
                    <div
                      className="chat-pill"
                      style={
                        viewMode === "chat"
                          ? { background: "#0F172A", color: "#FFFFFF", padding: "6px 10px", borderRadius: "8px" }
                          : { background: "transparent", color: TEXT_DARK, padding: "6px 10px", borderRadius: "8px" }
                      }
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="1" width="10" height="7" rx="1.5" stroke={viewMode === "chat" ? "#FFFFFF" : "#FFFFFF"} strokeWidth="1.2"/>
                        <path d="M3 11L6 8H10" stroke={viewMode === "chat" ? "#FFFFFF" : "#FFFFFF"} strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      <span className="label">Chat</span>
                    </div>
                  </div>
                
                {/* tab-artifacts */}
                <div
                  className="tab-artifacts"
                  onClick={() => setViewMode("artifacts")}
                  style={
                        viewMode === "artifacts"
                          ? { background: "#0F172A", color: "#FFFFFF", padding: "6px 10px", borderRadius: "8px" }
                          : { background: "transparent", color: TEXT_DARK, padding: "6px 10px", borderRadius: "8px" }
                      }
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="2" width="10" height="10" rx="1.5" stroke={viewMode === "artifacts" ? "#FFFFFF" : "#64748B"} strokeWidth="1.2"/>
                    <line x1="4" y1="5" x2="10" y2="5" stroke={viewMode === "artifacts" ? "#FFFFFF" : "#64748B"} strokeWidth="1"/>
                    <line x1="4" y1="7.5" x2="10" y2="7.5" stroke={viewMode === "artifacts" ? "#FFFFFF" : "#64748B"} strokeWidth="1"/>
                    <line x1="4" y1="10" x2="8" y2="10" stroke={viewMode === "artifacts" ? "#FFFFFF" : "#64748B"} strokeWidth="1"/>
                  </svg>
                  <span className="label">Artifacts</span>
                  <div className="artifact-badge" style={ viewMode === "artifacts" ? { background: "rgba(255,255,255,0.12)", color: "#FFFFFF", borderRadius: 10, padding: "2px 6px" } : {} }>
                    <span className="count">2</span>
                  </div>
                </div>
                
                {/* tab-lineage */}
                <div
                  className="tab-lineage"
                  onClick={() => setViewMode('lineage')}
                  style={
                        viewMode === "lineage"
                          ? { background: "#0F172A", color: "#FFFFFF", padding: "6px 10px", borderRadius: "8px" }
                          : { background: "transparent", color: TEXT_DARK, padding: "6px 10px", borderRadius: "8px" }
                      }
                >
                  <span className="label">Lineage</span>
                  <div className="artifact-badge" style={ viewMode === 'lineage' ? { background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', borderRadius: 10, padding: '2px 6px' } : {} }>
                    <span className="count">2</span>
                  </div>
                </div>
              </div>

              {/* tab-drug */}
              <div className="tab-drug">
                <div className="num-badge">
                  <span className="number">{tabInfo.badge}</span>
                </div>
                <span className="title">{tabInfo.title}</span>
                {tabInfo.count && <span className="count">{tabInfo.count}</span>}
                <div className="status-badges">
                  <div className="accepted-badge">
                    <span className="status-dot" style={{ background: tabInfo.dotColor }}></span>
                    <span className="status-text">{tabInfo.statusText}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* branch-group */}
            <div className="branch-group">
              <div className="branch-label">
                <span className="text">BRANCH</span>
              </div>
              
              {/* branch-selector */}
              <div 
                className="branch-selector"
                onClick={() => setBranchOpen(o => !o)}
                style={{ cursor: "pointer" }}
              >
                <svg className="icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="3" cy="3" r="1.5" stroke="#64748B" strokeWidth="1.2" />
                  <circle cx="9" cy="3" r="1.5" stroke="#64748B" strokeWidth="1.2" />
                  <circle cx="3" cy="9" r="1.5" stroke="#64748B" strokeWidth="1.2" />
                  <path d="M3 4.5V7.5M3 4.5C5 4.5 7.5 4 7.5 3" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="name">Main</span>
                <svg className="chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* branch-dropdown */}
              {branchOpen && (
                <div 
                  className="branch-dropdown"
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    zIndex: 1400
                  }}
                >
                  <div className="dropdown-header">
                    <span className="title">HYPOTHESIS BRANCHES</span>
                    <span className="subtitle">Switch, rename, or delete a research path</span>
                  </div>

                  <div className="dropdown-separator"></div>

                  {BRANCHES.map(branch => (
                    <div
                      key={branch.id}
                      className="branch-item"
                      onClick={() => { setSelectedBranch(branch.id); setBranchOpen(false); }}
                      style={{ cursor: "pointer" }}
                    >
                      {selectedBranch === branch.id ? (
                        <div className="radio-selected">
                          <div className="selection-ring">
                            <div className="inner-circle"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="radio-unselected"></div>
                      )}
                      
                      <div className="text-group">
                        <span className={`branch-name ${selectedBranch === branch.id ? 'selected' : ''}`}>
                          {branch.label}
                        </span>
                        <span className="branch-description">{branch.sub}</span>
                      </div>

                      <div className="icon-edit">
                        <svg className="pen-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="#8C99A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      {branch.id !== "main" && (
                        <div className="btn-delete-param">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4H13M5 4V2.5H11V4M4 4L5 14H11L12 4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* share-btn */}
            <button className="share-btn" onClick={() => setShowShareDialog(true)} style={{ cursor: "pointer" }}>
              <svg className="icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="11" cy="3" r="2" stroke="#475569" strokeWidth="1.5"/>
                <circle cx="3" cy="7" r="2" stroke="#475569" strokeWidth="1.5"/>
                <circle cx="11" cy="11" r="2" stroke="#475569" strokeWidth="1.5"/>
                <line x1="5" y1="6.5" x2="9" y2="4" stroke="#475569" strokeWidth="1.5"/>
                <line x1="5" y1="7.5" x2="9" y2="10" stroke="#475569" strokeWidth="1.5"/>
              </svg>
              <span className="label">Share</span>
            </button>
          </div>
        </div>
      </Box>
    );
  };


  // Phase rendering is handled by TXKGPhase, LiteminexPhase, CuratexPhase components

  // Share Research Session Dialog — Figma-aligned 520 × 393px
  const ShareResearchDialog = () => {
    const handleSendInvite = () => {
      const email = shareEmail.trim();
      if (!email) return;

      const namePart = email.split("@")[0].replace(/[._-]+/g, " ");
      const name = namePart
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "New member";
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase();

      setSharePeople(current => [
        ...current,
        {
          initials,
          name,
          email,
          role: sharePermission === "can edit" ? "Editor" : "Viewer",
          color: "#64748B",
        },
      ]);
      setShareEmail("");
    };

    const handleCopyLink = async () => {
      const link = window.location.href;
      try {
        await navigator.clipboard.writeText(link);
      } catch (error) {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    };

    return (
      <Dialog
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "520px",
            height: "393px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 32px)",
            m: 0,
            p: "24px",
            boxSizing: "border-box",
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            boxShadow: "0px 10px 24px -8px rgba(0, 0, 0, 0.0784314)",
            overflow: "hidden",
          },
        }}
        sx={{
          "& .MuiDialog-container": {
            p: "16px",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "16px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              width: "100%",
              height: "32px",
              flex: "0 0 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                lineHeight: "19px",
                fontWeight: 600,
                color: "#1E293B",
              }}
            >
              Share Research Session
            </Typography>

            <IconButton
              aria-label="Close share dialog"
              onClick={() => setShowShareModal(false)}
              sx={{
                width: "32px",
                height: "32px",
                p: 0,
                bgcolor: "#F1F5F9",
                borderRadius: "8px",
                "&:hover": { bgcolor: "#E2E8F0" },
              }}
            >
              <CloseOutlined sx={{ fontSize: "16px", color: "#64748B" }} />
            </IconButton>
          </Box>

          {/* Invite row */}
          <Box
            sx={{
              width: "100%",
              height: "40px",
              flex: "0 0 40px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Box
              component="input"
              value={shareEmail}
              onChange={(event) => setShareEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSendInvite();
              }}
              placeholder="Add people by name or email..."
              sx={{
                boxSizing: "border-box",
                minWidth: 0,
                flex: 1,
                width: "308px",
                height: "40px",
                px: "12px",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                outline: "none",
                bgcolor: "#FFFFFF",
                color: "#1E293B",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: "16px",
                "&::placeholder": {
                  color: "#94A3B8",
                  opacity: 1,
                },
                "&:focus": {
                  borderColor: "#00BCD4",
                  boxShadow: "0 0 0 2px rgba(0,188,212,0.10)",
                },
              }}
            />

            <Button
              onClick={handleSendInvite}
              disabled={!shareEmail.trim()}
              sx={{
                flex: "0 0 65px",
                width: "65px",
                minWidth: "65px",
                height: "40px",
                p: "0 16px",
                borderRadius: "8px",
                bgcolor: "#00BCD4",
                color: "#FFFFFF",
                textTransform: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 600,
                "&:hover": { bgcolor: "#00ABC1" },
                "&.Mui-disabled": {
                  bgcolor: "#9EDFE8",
                  color: "#FFFFFF",
                },
              }}
            >
              Send
            </Button>

            {/* Permission selector */}
            <Box sx={{ position: "relative", flex: "0 0 75px", width: "75px" }}>
              <Box
                component="button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSharePermission(current => current === "can view" ? "can edit" : "can view");
                }}
                sx={{
                  width: "75px",
                  height: "16px",
                  p: 0,
                  border: 0,
                  bgcolor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "#64748B",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: "16px",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{sharePermission}</span>
                <ExpandMoreOutlined sx={{ fontSize: "14px", color: "#64748B" }} />
              </Box>
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={{ width: "100%", height: "1px", flex: "0 0 1px", bgcolor: "#E2E8F0" }} />

          {/* People with access */}
          <Box
            sx={{
              width: "100%",
              height: "151px",
              flex: "0 0 151px",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: "12px",
              overflow: "hidden",
            }}
          >
            <Typography
              sx={{
                height: "16px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 600,
                color: "#1E293B",
              }}
            >
              People with access
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                overflowY: "auto",
                pr: "2px",
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "#CBD5E1", borderRadius: "4px" },
              }}
            >
              {sharePeople.map((person, index) => (
                <Box
                  key={`${person.email}-${index}`}
                  sx={{
                    width: "100%",
                    minHeight: "33px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Box
                    sx={{
                      width: "32px",
                      height: "32px",
                      flex: "0 0 32px",
                      borderRadius: "50%",
                      bgcolor: person.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        lineHeight: "15px",
                        fontWeight: 700,
                        color: "#FFFFFF",
                      }}
                    >
                      {person.initials}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <Typography
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        lineHeight: "16px",
                        fontWeight: 500,
                        color: "#1E293B",
                      }}
                    >
                      {person.name}
                    </Typography>
                    <Typography
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        lineHeight: "15px",
                        fontWeight: 400,
                        color: "#64748B",
                      }}
                    >
                      {person.email}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flexShrink: 0,
                      minWidth: person.role === "Owner" ? "58px" : person.role === "Editor" ? "54px" : "60px",
                      height: "23px",
                      px: "10px",
                      borderRadius: "999px",
                      bgcolor: "#F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        lineHeight: "15px",
                        fontWeight: 500,
                        color: "#64748B",
                      }}
                    >
                      {person.role}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={{ width: "100%", height: "1px", flex: "0 0 1px", bgcolor: "#E2E8F0" }} />

          {/* Footer */}
          <Box
            sx={{
              width: "100%",
              height: "40px",
              flex: "0 0 40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Button
              onClick={handleCopyLink}
              startIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6.25 9.75L9.75 6.25M4.75 11.25L3.25 12.75C2.42157 13.5784 1.07843 13.5784 0.25 12.75C-0.578427 11.9216 -0.578427 10.5784 0.25 9.75L3.75 6.25C4.57843 5.42157 5.92157 5.42157 6.75 6.25"
                    transform="translate(1 0)"
                    stroke="#00BCD4"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.25 4.75L10.75 3.25C11.5784 2.42157 12.9216 2.42157 13.75 3.25C14.5784 4.07843 14.5784 5.42157 13.75 6.25L10.25 9.75C9.42157 10.5784 8.07843 10.5784 7.25 9.75"
                    transform="translate(-1 0)"
                    stroke="#00BCD4"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              }
              sx={{
                minWidth: "82px",
                height: "16px",
                p: 0,
                color: "#00BCD4",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 500,
                textTransform: "none",
                justifyContent: "flex-start",
                "& .MuiButton-startIcon": { m: 0, mr: "8px" },
                "&:hover": { bgcolor: "transparent", color: "#00ABC1" },
              }}
            >
              Copy link
            </Button>

            <Button
              onClick={() => setShowShareModal(false)}
              sx={{
                flex: "0 0 65px",
                width: "65px",
                minWidth: "65px",
                height: "40px",
                p: "0 16px",
                borderRadius: "8px",
                bgcolor: "#00BCD4",
                color: "#FFFFFF",
                textTransform: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 600,
                "&:hover": { bgcolor: "#00ABC1" },
              }}
            >
              Done
            </Button>
          </Box>
        </Box>
      </Dialog>
    );
  };

  const BranchDialog = () => (
    <Dialog
      open={showBranchDialog}
      onClose={() => { setShowBranchDialog(false); setBranchCreated(false); }}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "640px",
          height: "524px",
          maxWidth: "calc(100vw - 32px)",
          borderRadius: "16px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.03)",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: "24px", py: "24px", borderBottom: "1px solid #E3E8F0" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Box sx={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: TEAL, borderRadius: "8px", color: "#FFFFFF", fontSize: "20px" }}>⑂</Box>
          <Box>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "19px", fontWeight: 600, color: "#262E38" }}>
              {branchCreated ? "Branch Created" : "Branch Research"}
            </Typography>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", lineHeight: "15px", color: "#737D8C" }}>
              {branchCreated ? "Your new branch has been created successfully" : "Create a new branch from current results"}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={() => { setShowBranchDialog(false); setBranchCreated(false); }} sx={{ color: "#737D8C" }}>×</IconButton>
      </DialogTitle>

      {branchCreated ? (
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", px: "24px", py: "32px" }}>
          <Box sx={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#E0F7F5", borderRadius: "50%", color: TEAL, fontSize: "32px", fontWeight: 700 }}>✓</Box>
          <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", lineHeight: "22px", fontWeight: 600, color: "#1A2E44" }}>Branch created successfully!</Typography>
          <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", lineHeight: "17px", fontWeight: 600, color: TEAL }}>{branchName}</Typography>
          <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", lineHeight: "16px", color: "#94A3B8" }}>Branched from Main (Step 3: TxKG Results)</Typography>
        </DialogContent>
      ) : (
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "16px", px: "24px", py: "24px" }}>
          <Box>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#737D8C", mb: "6px" }}>Branch Name</Typography>
            <TextField value={branchName} onChange={(event) => setBranchName(event.target.value)} fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#737D8C", mb: "6px" }}>Branch From</Typography>
            <TextField value="Main (Step 3: TxKG Results)" fullWidth size="small" disabled sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#737D8C", mb: "6px" }}>Description</Typography>
            <TextField value={branchDescription} onChange={(event) => setBranchDescription(event.target.value)} fullWidth multiline rows={3} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
          </Box>
        </DialogContent>
      )}

      <DialogActions sx={{ justifyContent: "flex-end", gap: "12px", px: "24px", py: "24px", bgcolor: "#FAFAFC", borderTop: "1px solid #E3E8F0" }}>
        <Button onClick={() => { setShowBranchDialog(false); setBranchCreated(false); }} sx={{ minWidth: branchCreated ? "72px" : "81px", height: "35px", px: "16px", border: "1px solid #E3E8F0", borderRadius: "8px", color: "#262E38", fontFamily: "'Inter', sans-serif", fontSize: "14px", textTransform: "none" }}>
          {branchCreated ? "Close" : "Cancel"}
        </Button>
        <Button onClick={() => branchCreated ? setShowBranchDialog(false) : setBranchCreated(true)} sx={{ height: "35px", px: "16px", bgcolor: TEAL, borderRadius: "8px", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", fontSize: "14px", textTransform: "none", "&:hover": { bgcolor: "#00A9BF" } }}>
          {branchCreated ? "Go to Branch" : "Create & Branch"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  /**
   * Article Detail Side Panel.
   *
   * Items 21 and 22. The abstract was a fixed paragraph about Metformin and
   * JAK2, the authors defaulted to "Chen, S. et al.", "View on PubMed Central"
   * was a Typography with no href, and both buttons had no onClick. All four
   * now come from GET /articles/{id} and its sibling endpoints.
   */
  const ArticleDetailPanel = () => {
    if (!showArticleDetail || !selectedArticle) return null;

    // The list row is shown immediately; the full record fills in behind it.
    const article = articleDetail || selectedArticle;

    const keywords = Array.isArray(article.keywords)
      ? article.keywords
      : typeof article.keywords === "string"
      ? article.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : article.keywordList || [];

    // The API's pmcLink when it has one; otherwise the PubMed record derived
    // from the article id, which is a real destination rather than a dead label.
    const externalUrl = article.pmcLink || pubmedUrl(article.id);

    return (
      <Box sx={{
        position: "fixed",
        right: 0,
        top: 0,
        width: "380px",
        height: "100vh",
        bgcolor: "#FFFFFF",
        borderLeft: `1px solid ${BORDER}`,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <Box sx={{ flex: 1, overflowY: "auto", p: "28px 28px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton size="small" onClick={() => setShowArticleDetail(false)} sx={{ color: "#6B7280" }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Typography sx={{ fontFamily: FONT, fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: "28px", mt: "-8px" }}>
            Article Detail
          </Typography>

          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              ARTICLE TITLE
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: "22px" }}>
              {article.title}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: "40px" }}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Authors</Typography>
              {/* Was hardcoded "Chen, S. et al." whenever the row had none. */}
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>
                {article.authors || article.author || (articleBusy === "detail" ? "Loading…" : "Not listed")}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Year</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>{article.year || "—"}</Typography>
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              ABSTRACT
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              {article.abstract
                || (articleBusy === "detail" ? "Loading the abstract…" : "No abstract was returned for this article.")}
            </Typography>
          </Box>

          {keywords.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
                KEYWORDS
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {keywords.map((kw, i) => (
                  <Box key={i} sx={{ px: "10px", py: "5px", bgcolor: "#F3F4F6", borderRadius: "4px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 500, color: "#374151" }}>{kw}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              FULL TEXT
            </Typography>
            {/* Item 21: a real anchor. This was a Typography with a pointer
                cursor and no href, so it looked like a link and did nothing. */}
            {externalUrl ? (
              <Typography
                component="a"
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                ↗ {article.pmcLink ? "View on PubMed Central" : "View on PubMed"}
              </Typography>
            ) : (
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
                No full-text link was returned for this article.
              </Typography>
            )}
          </Box>

          {/* Item 22: article chat. */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              ASK ABOUT THIS PAPER
            </Typography>

            {articleChat.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", mb: "10px" }}>
                {articleChat.map((msg, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: "10px 12px",
                      borderRadius: "8px",
                      bgcolor: msg.role === "user" ? "#F0FDFC" : "#F8FAFC",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: msg.isError ? "#DC2626" : "#374151", lineHeight: 1.6 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            <TextField
              placeholder="e.g. How does it modulate JAK2 signaling?"
              fullWidth
              size="small"
              multiline
              maxRows={3}
              disabled={articleBusy === "chat"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const value = e.target.value;
                  e.target.value = "";
                  handleAskArticle(value);
                }
              }}
              sx={{ "& .MuiOutlinedInput-root": { fontFamily: FONT, fontSize: "13px", borderRadius: "8px" } }}
            />
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, mt: "4px" }}>
              {articleBusy === "chat" ? "Asking…" : "Press Enter to ask"}
            </Typography>
          </Box>

          {articleNotice && (
            <Typography
              role="status"
              sx={{ fontFamily: FONT, fontSize: "12px", color: articleNotice === "Article saved." ? "#059669" : "#DC2626" }}
            >
              {articleNotice}
            </Typography>
          )}

          {/* Item 22: both buttons had no onClick at all. */}
          <Button
            fullWidth
            onClick={handleSaveArticle}
            disabled={articleBusy === "save"}
            sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, p: "12px 24px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" }, "&.Mui-disabled": { bgcolor: "#E2E8F0", color: "#94A3B8" } }}
          >
            {articleBusy === "save" ? "Saving…" : "Save Article"}
          </Button>
        </Box>
      </Box>
    );
  };

  // Compound Detail Dialog (Figma Image 15)
  const CompoundDetailDialog = () => (
    <Dialog 
      open={showCompoundDetail} 
      onClose={() => setShowCompoundDetail(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${BORDER}` }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK }}>
          Metformin - Compound Detail
        </Typography>
        <IconButton size="small" onClick={() => setShowCompoundDetail(false)}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "24px" }}>
        {selectedCompound && (
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK, mb: "16px" }}>
              Metformin - Compound Detail
            </Typography>

            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", mb: "8px" }}>
              SUMMARY OF MECHANISM, CLINICAL USE, AND IP STATUS
            </Typography>

            <Box sx={{ mb: "20px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, mb: "4px" }}>
                Mechanism of Action
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, lineHeight: 1.6, mb: "12px" }}>
                Metformin activates AMP-activated protein kinase (AMPK), reducing hepatic glucose production and improving insulin sensitivity. In the context of JAK2 inhibition, recent studies suggest Metformin may modulate JAK-STAT signaling indirectly through AMPK activation.
              </Typography>

              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, mb: "4px" }}>
                Current Uses
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, lineHeight: 1.6, mb: "12px" }}>
                First-line therapy for Type 2 Diabetes. Also used off-label for PCOS, weight management, and under investigation for anti-aging and oncology applications.
              </Typography>

              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, mb: "4px" }}>
                Patent Status
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, lineHeight: 1.6, mb: "12px" }}>
                Original patents expired. Generic formulations widely available. Novel formulations and combination therapies may carry active IP - 3 relevant patents identified by NovSearch.
              </Typography>

              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, mb: "4px" }}>
                Match Score
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, lineHeight: 1.6 }}>
                94% - Strong alignment on 5 of 6 target profile properties.
              </Typography>
            </Box>

            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", mb: "8px" }}>
              SOURCE: PUBMED, DRUGBANK, USPTO VIA NOVSEARCH
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: "24px", py: "16px" }}>
        <Button 
          variant="outlined"
          onClick={() => setShowCompoundDetail(false)}
          sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER }}
        >
          Back to Results
        </Button>
        <Button 
          variant="contained"
          sx={{ 
            bgcolor: TEAL,
            color: "#FFFFFF",
            textTransform: "none",
            fontFamily: FONT,
            fontSize: "13px",
            fontWeight: 600,
            "&:hover": { bgcolor: "#089B98" }
          }}
        >
          Select for Screening
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ---------------------------------------------------------------------------
  // Hand-offs.
  //
  // Moving to the next module used to be two local calls —
  // setActiveStep(1); setWorkflowPhase("litminex-loading") — which changed the
  // screen and nothing else. The next agent was never started, and the targets
  // the researcher had ticked were never sent anywhere.
  //
  // Each hand-off now posts to /sessions/{id}/steps and adopts the jobId that
  // comes back.
  // ---------------------------------------------------------------------------

  /**
   * TxKG → LitMineX, carrying the selected targets.
   *
   * The accession-to-gene-name translation is the important part: the table is
   * keyed on UniProt accessions, and PubMed text never contains one, so sending
   * the ticked ids verbatim would return nothing for every target.
   */
  const handleContinueToLitMineX = useCallback(() => {
    const { targetIds, unresolved } = toGeneNames(selectedTargets, txkgResult.targets);

    if (!targetIds.length) {
      session.setStepError(
        "Select at least one target before continuing to LitMineX.",
        "txkg"
      );
      return;
    }

    if (unresolved.length) {
      // Sent anyway — dropping a target the user explicitly ticked would be
      // worse — but say so, because these are the ones likely to come back
      // empty.
      session.appendMessages(
        [
          {
            role: "agent",
            isError: true,
            text:
              `No gene symbol was available for ${unresolved.join(", ")}, so the ` +
              "accession was sent instead. Literature results for those targets may be empty.",
          },
        ],
        "txkg"
      );
    }

    session.handOff("litminex", buildSelections("litminex", { targetIds }));
  }, [selectedTargets, txkgResult.targets, session]);

  /**
   * CurateX "Submit Profile" → POST /agents/curatex/compounds.
   *
   * This is a direct agent call rather than a session step: the compound
   * scoring is CurateX's second job, and it has to carry the weights the
   * researcher just edited. It used to set six hardcoded compound rows.
   */
  const handleSubmitProfile = useCallback(async (editedWeights) => {
    const target =
      curatexProfile.data?.target ||
      toGeneNames(selectedTargets, txkgResult.targets).targetIds[0] ||
      null;

    if (!target) {
      session.setStepError(
        "There is no target to score compounds against. Go back to TxKG and select one.",
        "curatex"
      );
      return;
    }

    setWorkflowPhase("curatex-submitted");

    try {
      const response = await curatexApi.scoreCompounds({
        target,
        disease: txkgResult.disease ?? null,
        // The researcher's edits, translated from the form's field names back
        // to the criterion names the scorer keys on.
        weights: toApiWeights(editedWeights, curatexProfile.data),
        numResults: 20,
      });

      const jobId = response?.jobId ?? response?.job_id ?? null;
      if (!jobId) {
        throw new Error("The compound scoring job did not return a job id.");
      }

      // Stored on the step rather than in local state so it survives
      // navigating away to another module and back.
      session.setStepData({ compoundsJobId: jobId }, "curatex");
    } catch (err) {
      session.setStepError(
        err?.userMessage || err?.message || "Compound scoring could not be started.",
        "curatex"
      );
    }
  }, [curatexProfile.data, selectedTargets, txkgResult, session, setWorkflowPhase]);

  /** CurateX → ScreenSuite, carrying the chosen candidates. */
  const handleContinueToScreenSuite = useCallback(() => {
    const target = curatexResults.data?.target || curatexProfile.data?.target || null;
    const compounds = selectedCompound
      ? [selectedCompound.name]
      : (curatexResults.data?.compounds ?? []).slice(0, 5).map((c) => c.name);

    session.handOff("screensuite", buildSelections("screensuite", { target, compounds }));
  }, [curatexResults.data, curatexProfile.data, selectedCompound, session]);

  /**
   * Retry a failed step.
   *
   * A rerun is the real retry: re-polling a job the backend has already marked
   * failed returns "failed" again. Where there is no step id to rerun — a
   * direct agent call, or a session the server has lost — re-polling is the
   * only option left.
   */
  const retryActiveStep = useCallback(() => {
    if (session.activeStepId) {
      session.rerunActiveStep({});
    } else {
      job.retry();
    }
  }, [session, job]);

  /**
   * LitMineX → CurateX, carrying a gene symbol.
   *
   * This is the control the testing team found missing. Without it the only
   * route onwards was typing "@curatex create drug profile for JAK2", and the
   * backend took the whole sentence as the target — hence
   * "RunnerError: No reviewed human UniProt entry matched 'Create drug profile
   * for JAK2'. Use the gene symbol". A structured `selections` payload cannot
   * produce that error.
   */
  const handleContinueToCurateX = useCallback(() => {
    // Whatever went into LitMineX is already symbol-form; fall back to
    // re-deriving from the TxKG table if the step carries nothing.
    const fromStep = session.steps.litminex?.data?.selections?.targetIds;
    const targetIds = Array.isArray(fromStep) && fromStep.length
      ? fromStep
      : toGeneNames(selectedTargets, txkgResult.targets).targetIds;

    if (!targetIds.length) {
      session.setStepError(
        "There is no target to build a drug profile for. Go back to TxKG and select one.",
        "litminex"
      );
      return;
    }

    session.handOff("curatex", buildSelections("curatex", { targetIds }));
  }, [session, selectedTargets, txkgResult.targets]);

  /** The article the detail panel is showing, enriched from /articles/{id}. */
  const [articleDetail, setArticleDetail] = useState(null);
  const [articleBusy, setArticleBusy] = useState(null);
  const [articleNotice, setArticleNotice] = useState(null);
  const [articleChat, setArticleChat] = useState([]);

  /**
   * Item 21/22: open the detail panel with the FULL article.
   *
   * The list endpoint returns no abstract, authors or PMC link, so the panel
   * used to show a fixed Metformin abstract and a dead "View on PubMed
   * Central" label. GET /articles/{id} supplies the real thing.
   */
  useEffect(() => {
    if (!showArticleDetail || !selectedArticle?.id) {
      setArticleDetail(null);
      setArticleChat([]);
      setArticleNotice(null);
      return undefined;
    }

    let mounted = true;
    setArticleBusy("detail");
    setArticleNotice(null);

    Promise.all([
      litminexApi.getArticle(selectedArticle.id),
      litminexApi.getArticleChatHistory(selectedArticle.id).catch(() => []),
    ])
      .then(([detail, history]) => {
        if (!mounted) return;
        setArticleDetail(detail);
        setArticleChat(Array.isArray(history) ? history : []);
        setArticleBusy(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setArticleNotice(err?.userMessage || err?.message || "The article could not be loaded.");
        setArticleBusy(null);
      });

    return () => {
      mounted = false;
    };
  }, [showArticleDetail, selectedArticle?.id]);

  /** Item 22: bookmark the article. */
  const handleSaveArticle = useCallback(async () => {
    if (!selectedArticle?.id) return;
    setArticleBusy("save");
    setArticleNotice(null);
    try {
      await litminexApi.saveArticle(selectedArticle.id, location.state?.projectId ?? null);
      setArticleNotice("Article saved.");
    } catch (err) {
      setArticleNotice(err?.userMessage || err?.message || "The article could not be saved.");
    } finally {
      setArticleBusy(null);
    }
  }, [selectedArticle, location.state]);

  /** Item 22: ask a question about this article. */
  const handleAskArticle = useCallback(
    async (question) => {
      if (!selectedArticle?.id || !question.trim()) return;

      setArticleChat((prev) => [...prev, { role: "user", content: question.trim() }]);
      setArticleBusy("chat");
      setArticleNotice(null);

      try {
        const reply = await litminexApi.askArticle(selectedArticle.id, question.trim());
        setArticleChat((prev) => [
          ...prev,
          { role: reply?.role || "agent", content: reply?.content || "", citations: reply?.citations ?? [] },
        ]);
      } catch (err) {
        setArticleChat((prev) => [
          ...prev,
          {
            role: "agent",
            isError: true,
            content: err?.userMessage || err?.message || "The question could not be answered.",
          },
        ]);
      } finally {
        setArticleBusy(null);
      }
    },
    [selectedArticle]
  );

  /** Which module the error screen belongs to, and what to say about it. */
  const activeErrorInfo = useMemo(() => {
    const owner = moduleForPhase(workflowPhase);
    if (!owner) return null;

    const label = owner.label;

    // Docking cannot succeed on this deployment, so its failure is a known
    // limitation rather than a fault and is presented as one.
    if (owner.key === "screensuite" && SCREENSUITE_UNAVAILABLE) {
      return {
        title: `${label} cannot run on this deployment`,
        message: SCREENSUITE_UNAVAILABLE_MESSAGE,
        detail: session.activeError || null,
        expected: true,
      };
    }

    return {
      title: `${label} could not finish`,
      message: session.activeError || "The agent run failed without a reason.",
      detail: null,
      expected: false,
    };
  }, [workflowPhase, session.activeError]);

  // Render Content Based on Phase
  const renderContent = () => {
    if (viewMode === "lineage") {
      return (
        <Box sx={{ flex: 1, p: "24px" }}>
          <LineagePage />
        </Box>
      );
    }
    if (viewMode === "artifacts") {
      return (
        <Box sx={{ flex: 1, p: "24px" }}>
          <ArtifactsPage />
        </Box>
      );
    }

    /**
     * The session itself failed — no module ever started, so there is no phase
     * screen to fall back to.
     */
    if (session.status === "error" && !session.activeKey) {
      return (
        <PhaseError
          title="The research session could not be started"
          message={session.error}
          detail="The supervisor decides which agent runs, so nothing can proceed until this call succeeds."
          onRetry={startSession}
        />
      );
    }

    /**
     * A failed step. Checked before the phase branches below, because an
     * "-error" phase matches none of their lists — previously a failure had
     * nowhere to render and the loading screen simply stayed put.
     */
    if (isErrorPhase(workflowPhase) && activeErrorInfo) {
      const previous = session.activationOrder[session.activationOrder.indexOf(session.activeKey) - 1];
      return (
        <PhaseError
          title={activeErrorInfo.title}
          message={activeErrorInfo.message}
          detail={activeErrorInfo.detail}
          onRetry={activeErrorInfo.expected ? undefined : retryActiveStep}
          onBack={previous ? () => session.goToModule(previous) : undefined}
          backLabel={previous ? `Back to ${MODULE_BY_KEY[previous]?.label ?? "previous step"}` : undefined}
          expected={activeErrorInfo.expected}
        />
      );
    }

    /** The whole-pipeline run — all five agents as one job. */
    if (workflowPhase.startsWith("pipeline")) {
      return (
        <PipelinePhase
          workflowPhase={workflowPhase}
          pipeline={pipeline.data}
          progressMessage={job.progressMessage}
          query={query}
        />
      );
    }

    if (["txkg-loading", "txkg-results", "target-selection"].includes(workflowPhase)) {
      return (
        <TXKGPhase
          workflowPhase={workflowPhase}
          query={query}
          txkg={txkgResult}
          progressMessage={job.progressMessage}
          expandedAccordion={expandedAccordion}
          setExpandedAccordion={setExpandedAccordion}
          insightTab={insightTab}
          setInsightTab={setInsightTab}
          selectedTargets={selectedTargets}
          setSelectedTargets={setSelectedTargets}
          setWorkflowPhase={setWorkflowPhase}
          setActiveStep={setActiveStep}
          setShowBranchDialog={setShowBranchDialog}
          // Posts the step and starts the next agent, instead of just
          // switching which screen is shown.
          onContinue={handleContinueToLitMineX}
          continuePending={session.pending}
          jobId={session.steps.txkg?.jobId ?? null}
          actions={actions}
          subgraph={subgraph}
          onGenerateSubgraph={handleGenerateSubgraph}
        />
      );
    }
    if (["litminex-loading", "litminex-results"].includes(workflowPhase)) {
      return (
        <LiteminexPhase
          workflowPhase={workflowPhase}
          chatMessages={chatMessages}
          litMinexResults={litMinexResults}
          setSelectedArticle={setSelectedArticle}
          setShowArticleDetail={setShowArticleDetail}
          progressMessage={job.progressMessage}
          loading={litminex.loading}
          error={litminex.error}
          onRetry={litminex.reload}
          insights={litminex.data?.insights ?? null}
          total={litminex.data?.total ?? 0}
          page={litminex.data?.page ?? 1}
          totalPages={litminex.data?.totalPages ?? 1}
          onPageChange={setLitminexPage}
        />
      );
    }
    if ([
      "curatex-loading",
      "curatex-profile",
      "curatex-submitted",
      "curatex-results",
      "curatex-data-source",
      "curatex-compound-exploration",
      "curatex-compound-detail",
      "curatex-candidate-selection",
    ].includes(workflowPhase)) {
      return (
        <CuratexPhase
          workflowPhase={workflowPhase}
          setWorkflowPhase={setWorkflowPhase}
          chatMessages={chatMessages}
          profileData={profileData}
          setProfileData={setProfileData}
          profileEditMode={profileEditMode}
          setProfileEditMode={setProfileEditMode}
          curateXResults={curateXResults}
          setCurateXResults={setCurateXResults}
          selectedCompound={selectedCompound}
          setSelectedCompound={setSelectedCompound}
          setShowCompoundDetail={setShowCompoundDetail}
          setActiveStep={setActiveStep}
          progressMessage={job.progressMessage || compoundsJob.progressMessage}
          profile={curatexProfile.data}
          profileLoading={curatexProfile.loading}
          profileError={curatexProfile.error}
          onRetryProfile={curatexProfile.reload}
          resultsLoading={curatexResults.loading}
          resultsError={curatexResults.error}
          onRetryResults={curatexResults.reload}
          // Scores compounds against the edited weights.
          onSubmitProfile={handleSubmitProfile}
          // Posts the ScreenSuite step.
          onContinue={handleContinueToScreenSuite}
          continuePending={session.pending}
          page={curatexResults.data?.page ?? 1}
          totalPages={curatexResults.data?.totalPages ?? 1}
          total={curatexResults.data?.total ?? 0}
          onPageChange={setCuratexPage}
        />
      );
    }
    if (workflowPhase.startsWith("screensuite")) {
      return (
        <ScreeningSuitePhase
          workflowPhase={workflowPhase}
          progressMessage={job.progressMessage}
          hits={screensuite.data?.hits ?? []}
          loading={screensuite.loading}
          error={screensuite.error}
          onRetry={screensuite.reload}
          unavailable={SCREENSUITE_UNAVAILABLE}
          unavailableMessage={SCREENSUITE_UNAVAILABLE_MESSAGE}
        />
      );
    }
    if (workflowPhase.startsWith("novelty")) {
      return (
        <NoveltySearchPhase
          workflowPhase={workflowPhase}
          progressMessage={job.progressMessage}
          report={novsearch.data}
          loading={novsearch.loading}
          error={novsearch.error}
          onRetry={novsearch.reload}
        />
      );
    }

    /**
     * A phase with no screen. Reachable when the supervisor names a module this
     * build has no UI for, which is worth saying plainly rather than showing a
     * bare phase string.
     */
    return (
      <PhaseError
        title="No screen for this step"
        message={`The workflow reached "${workflowPhase}", which this build has no view for.`}
        detail="This usually means the backend added a module the UI has not caught up with."
        expected
      />
    );
  };

  /**
   * The chat bar — POST /sessions/{id}/messages, and nothing else.
   *
   * This replaced a block of keyword matching that decided routing locally:
   * "patent" or "novelty" jumped to NovSearch, "target candidate profile"
   * jumped to CurateX, "metformin" and "limitation" returned two paragraphs of
   * hardcoded prose about a paper the session may never have retrieved.
   *
   * All of it is gone. The backend answers from the step's stored result, and
   * only an explicit @Module starts a new agent run — at which point the
   * response carries a jobId and useWorkflowSession activates whichever module
   * the response names. A UI that guesses the module puts the researcher on a
   * screen the backend knows nothing about.
   */
  const handleChatSubmit = useCallback(
    (text) => {
      session.sendMessage(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.sendMessage]
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: GRAY_BG, overflow: "hidden" }} onClick={() => branchOpen && setBranchOpen(false)}>
      <SideBar />

      {/* Right of sidebar: top nav + (stepper + content) */}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <TopNavBar viewMode={viewMode} setViewMode={setViewMode} setShowShareDialog={setShowShareDialog} />

        {/* content-with-stepper: horizontal, fill remaining height */}
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <WorkflowStepper />

          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <Box sx={{ flex: 1, overflow: "auto" }}>
              {renderContent()}
            </Box>
            {viewMode === "chat" && !workflowPhase.startsWith("novelty") && (
              /* ChatInputBar is imported rather than declared here on purpose —
                 see the note in its own file. Declared inline, it was rebuilt
                 on every parent render, and the parent re-renders roughly once
                 a second while a job is polling, which remounted the field and
                 threw away the caret mid-sentence. */
              <ChatInputBar
                onSend={handleChatSubmit}
                pending={session.pending}
                hint={
                  session.pending
                    ? "Asking the agent…"
                    : "Mention a module with @ to start a new run"
                }
              />
            )}
          </Box>
        </Box>
      </Box>

      <ArticleDetailPanel />
      <CompoundDetailDialog />
      <BranchDialog />
      <ShareModal open={showShareDialog} onClose={() => setShowShareDialog(false)} />
    </Box>
  );
};

export default CompleteWorkflow;