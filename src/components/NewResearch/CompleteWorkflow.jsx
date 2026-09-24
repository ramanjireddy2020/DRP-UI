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
import { moduleForPhase, isErrorPhase, isLoadingPhase, MODULE_BY_KEY } from "../../workflow/moduleMap";
import { normalizeTxkgResult, normalizeMetapath } from "../../workflow/txkgResult";
import { getArtifacts } from "../../services/api/sessions";
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
import ConversationTimeline from "../workflow/ConversationTimeline";
import ModuleResultCard from "../workflow/ModuleResultCard";
import ProteinTargetPickerDialog from "../workflow/ProteinTargetPickerDialog";
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

/**
 * Poll ONE module's job, regardless of which module is on screen.
 *
 * Only the on-screen module used to be polled, so clicking back to TxKG in the
 * rail stopped a LitMineX run mid-flight and left its card spinning. Each
 * module now has its own poller, keyed on its own step.
 *
 * - A job is polled while its step is loading, and — for TxKG only, which
 *   renders the generic /agents/jobs/{id}/result — once more when a completed
 *   step has no stored result (a resumed session). The other modules read their
 *   own results endpoints, so they never fetch /result here.
 * - A completion is handled once per job id, so re-polling an old job (e.g.
 *   while a branch waits for its new job id) cannot flip the step to results.
 */
const useModuleJob = (
  moduleKey,
  step,
  { fetchResult = false, setPhase, setStepData, setStepError, onCompleted }
) => {
  const phase = step?.phase || "";
  const jobId = step?.jobId ?? null;
  const storedResult = step?.data?.jobResult ?? null;
  const needsResult = fetchResult && !storedResult;

  const job = useJob(jobId, {
    enabled: Boolean(jobId) && (isLoadingPhase(phase) || needsResult),
    fetchResult,
  });

  const handledRef = useRef(null);
  const failedRef = useRef(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    if (!job.isDone || !job.jobId || job.jobId !== jobId) return;

    if (fetchResult && job.result && storedResult !== job.result) {
      setStepData({ jobResult: job.result }, moduleKey);
    }

    if (handledRef.current === job.jobId) return;
    handledRef.current = job.jobId;

    if (isLoadingPhase(phase)) {
      setPhase(MODULE_BY_KEY[moduleKey].resultsPhase, moduleKey);
      onCompletedRef.current?.(moduleKey, job.jobId);
    }
  }, [job.isDone, job.jobId, job.result, jobId, phase, storedResult, fetchResult, moduleKey, setPhase, setStepData]);

  /**
   * A failed job moves its module to its own "-error" phase, carrying the
   * backend's reason, instead of leaving the spinner turning.
   */
  useEffect(() => {
    if (!job.isFailed || !job.jobId || job.jobId !== jobId) return;
    if (failedRef.current === job.jobId) return;
    failedRef.current = job.jobId;
    setStepError(job.error, moduleKey);
  }, [job.isFailed, job.error, job.jobId, jobId, moduleKey, setStepError]);

  return job;
};

const CompleteWorkflow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  /**
   * Router state (see the navigation contract):
   *   new research → { query, module, projectId, fileIds }
   *   resume       → { sessionId }
   * There is no fallback query any more. A hardcoded "Type 2 Diabetes" query
   * used to start a real backend session whenever this route was opened
   * without one.
   */
  const entryState = location.state || {};
  const entrySessionId = entryState.sessionId ?? null;
  const entryQuery = typeof entryState.query === "string" ? entryState.query.trim() : "";
  
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

  // A resumed session has no query in router state; its title is the query it
  // was started with.
  const query = entryQuery || session.title || "";

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
  // POST /sessions takes { query, module, projectId } — nothing else. The
  // composer's `fileIds` are not sent: the collection has no field for them.
  const startSession = useCallback(
    () =>
      session.startSession({
        query: entryQuery,
        module: entryState.module ?? null,
        projectId: entryState.projectId ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entryQuery, entryState.module, entryState.projectId, session.startSession]
  );

  /** Resume reopens the session; it never creates a new one. */
  const openSession = useCallback(
    () => (entrySessionId ? session.resumeSession(entrySessionId) : startSession()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entrySessionId, session.resumeSession, startSession]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (entrySessionId || entryQuery) {
      openSession();
    } else {
      // Neither a query nor a session to reopen: nothing to run.
      navigate("/dashboard/new-research", { replace: true });
    }
    // Intentionally mount-only: a session is opened once per workflow entry.
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
  const { setStepData, setStepError, refreshSession, updateSession } = session;

  /**
   * Bumped after each job completes and the session has been re-read, so the
   * artifacts list and its badge follow.
   */
  const [sessionRefreshTick, setSessionRefreshTick] = useState(0);

  /**
   * After a job completes, re-read GET /sessions/{id}: that is where the
   * agent's written explanation (messages[] with role "agent") and the step
   * summary appear. useWorkflowSession merges them without duplicating what is
   * already in the thread.
   */
  const handleJobCompleted = useCallback(async () => {
    await refreshSession();
    setSessionRefreshTick((n) => n + 1);
  }, [refreshSession]);

  const jobOptions = { setPhase, setStepData, setStepError, onCompleted: handleJobCompleted };
  const txkgJob = useModuleJob("txkg", session.steps.txkg, { ...jobOptions, fetchResult: true });
  const litminexJob = useModuleJob("litminex", session.steps.litminex, jobOptions);
  const curatexJob = useModuleJob("curatex", session.steps.curatex, jobOptions);
  const screensuiteJob = useModuleJob("screensuite", session.steps.screensuite, jobOptions);
  const novsearchJob = useModuleJob("novsearch", session.steps.novsearch, jobOptions);
  // The pipeline's stage list is read from /result by usePhaseResults below.
  const pipelineJob = useModuleJob("pipeline", session.steps.pipeline, jobOptions);

  const moduleJobs = {
    txkg: txkgJob,
    litminex: litminexJob,
    curatex: curatexJob,
    screensuite: screensuiteJob,
    novsearch: novsearchJob,
    pipeline: pipelineJob,
  };
  const activeJob = moduleJobs[session.activeKey] ?? txkgJob;

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

  /** The compounds job drives the second half of CurateX. */
  useEffect(() => {
    if (!compoundsJob.jobId || compoundsJob.jobId !== compoundsJobId) return;
    if (compoundsJob.isDone) {
      // Set on CurateX itself, so a background completion does not pull the
      // view away from whatever module is on screen.
      setPhase("curatex-results", "curatex");
      return;
    }
    if (compoundsJob.isFailed) {
      setStepError(compoundsJob.error, "curatex");
    }
  }, [compoundsJob.jobId, compoundsJobId, compoundsJob.isDone, compoundsJob.isFailed, compoundsJob.error, setPhase, setStepError]);

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
   * What the LitMineX request bubble says.
   *
   * LiteminexPhase has always accepted `requestText`, but nothing passed it,
   * so every run fell back to the generic line. The disease comes from the
   * TxKG result, so a thrombocytosis session no longer has to borrow the
   * fixture's wording.
   */
  const litminexRequestText = txkgResult.disease
    ? `Mine literature for ${txkgResult.disease} drug targets with confidence scoring`
    : undefined;

  /**
   * Branch / Rerun / Export, one set per module.
   *
   * These used to be a single object tied to the module on screen and shared
   * by every card, so Export on the LitMineX card while NovSearch was active
   * exported the NovSearch job. Each card now gets actions for its own step and
   * job. Export needs a completed job; for CurateX that is the compounds job,
   * whose results are what the CurateX table shows.
   */
  const completedJobId = (key) => {
    const step = session.steps[key];
    if (!step?.jobId || step.error) return null;
    if (isLoadingPhase(step.phase) || isErrorPhase(step.phase)) return null;
    return step.jobId;
  };

  const txkgActions = usePhaseActions({
    session,
    moduleKey: "txkg",
    jobId: completedJobId("txkg"),
    moduleLabel: MODULE_BY_KEY.txkg?.label,
  });
  const litminexActions = usePhaseActions({
    session,
    moduleKey: "litminex",
    jobId: completedJobId("litminex"),
    moduleLabel: MODULE_BY_KEY.litminex?.label,
  });
  const curatexActions = usePhaseActions({
    session,
    moduleKey: "curatex",
    jobId: compoundsJobId && compoundsJob.isDone ? compoundsJobId : completedJobId("curatex"),
    moduleLabel: MODULE_BY_KEY.curatex?.label,
  });
  const screensuiteActions = usePhaseActions({
    session,
    moduleKey: "screensuite",
    jobId: completedJobId("screensuite"),
    moduleLabel: MODULE_BY_KEY.screensuite?.label,
  });
  const novsearchActions = usePhaseActions({
    session,
    moduleKey: "novsearch",
    jobId: completedJobId("novsearch"),
    moduleLabel: MODULE_BY_KEY.novsearch?.label,
  });

  /**
   * End Task → PATCH /sessions/{id} { status: "Saved" }.
   *
   * It used to switch to a local "compiling" screen on a timer and never tell
   * the backend, so the session's status in Recent Sessions was wrong. The
   * promise rejects with the reason on failure so the caller can show it; the
   * top bar shows it too.
   */
  const [saveState, setSaveState] = useState({ status: "idle", error: null });
  const handleEndTask = useCallback(async () => {
    setSaveState({ status: "saving", error: null });
    try {
      await updateSession({ status: "Saved" });
      setSaveState({ status: "saved", error: null });
    } catch (err) {
      const message = err?.userMessage || err?.message || "The session could not be saved.";
      setSaveState({ status: "error", error: message });
      throw new Error(message);
    }
  }, [updateSession]);

  /**
   * The Artifacts tab badge: how many artifacts the session really has. It
   * was fixed at "2". Unknown (null) hides the badge.
   */
  const [artifactCount, setArtifactCount] = useState(null);
  useEffect(() => {
    if (!session.sessionId) return undefined;
    let cancelled = false;
    getArtifacts(session.sessionId)
      .then((list) => {
        if (!cancelled) setArtifactCount(Array.isArray(list) ? list.length : null);
      })
      .catch(() => {
        // The badge is a convenience; the Artifacts tab shows the error.
        if (!cancelled) setArtifactCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session.sessionId, sessionRefreshTick]);

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
  const [graphState, setGraphState] = useState({ graph: null, stats: null, error: null, notice: null });
  const graphJob = useJob(graphJobId, { enabled: Boolean(graphJobId), fetchResult: false });

  /**
   * Meta-path analysis — POST /agents/metapath/analyze over the generated
   * graph, poll the job it returns, then read the analysis, scores and
   * traversals. The stats row this feeds was fixed at 12 / 8 / 5 / 1.5 / 24 /
   * 38 / 4 for every disease.
   */
  const [metapathJobId, setMetapathJobId] = useState(null);
  const [metapathState, setMetapathState] = useState({ data: null, error: null, starting: false });
  const metapathJob = useJob(metapathJobId, { enabled: Boolean(metapathJobId), fetchResult: false });

  const handleGenerateSubgraph = useCallback(async () => {
    if (!txkgResult.hasData) return;

    setGraphState({ graph: null, stats: null, error: null, notice: null });
    // A new graph invalidates any analysis of the old one.
    setMetapathJobId(null);
    setMetapathState({ data: null, error: null, starting: false });
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
    if (!graphJob.isDone || !graphJobId || graphJob.jobId !== graphJobId) return;

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
  }, [graphJob.isDone, graphJob.jobId, graphJobId]);

  useEffect(() => {
    if (graphJob.isFailed) {
      setGraphState({ graph: null, stats: null, error: graphJob.error });
    }
  }, [graphJob.isFailed, graphJob.error]);

  /**
   * One node's neighbours, appended to the graph on click.
   *
   * New nodes and edges are de-duplicated against what is already drawn, and
   * the outcome is said out loud: a failure or an empty expansion used to be
   * silent, so a click looked like it did nothing. The node's own id is sent
   * (a UniProt accession for targets); the collection's example sends a gene
   * symbol, which is still to be confirmed with the backend.
   */
  const handleExploreNode = useCallback(
    async (nodeId) => {
      if (!graphJobId) return;
      setGraphState((prev) => ({ ...prev, notice: null }));
      try {
        const extra = await txkgApi.exploreNode(graphJobId, nodeId);
        setGraphState((prev) => {
          if (!prev.graph) return prev;
          const edgeKey = (e) => `${e?.source}|${e?.target}|${e?.label ?? ""}`;
          const seenNodes = new Set(prev.graph.nodes.map((n) => n.id));
          const seenEdges = new Set((prev.graph.edges ?? []).map(edgeKey));

          const nodes = [];
          (extra?.nodes ?? []).forEach((n) => {
            if (n?.id == null || seenNodes.has(n.id)) return;
            seenNodes.add(n.id);
            nodes.push(n);
          });
          const edges = [];
          (extra?.edges ?? []).forEach((e) => {
            if (!e) return;
            const key = edgeKey(e);
            if (seenEdges.has(key)) return;
            seenEdges.add(key);
            edges.push(e);
          });

          return {
            ...prev,
            graph: {
              ...prev.graph,
              nodes: [...prev.graph.nodes, ...nodes],
              edges: [...(prev.graph.edges ?? []), ...edges],
            },
            notice:
              nodes.length || edges.length
                ? null
                : { text: `No further neighbours were found for ${nodeId}.`, isError: false },
          };
        });
      } catch (err) {
        setGraphState((prev) => ({
          ...prev,
          notice: {
            text: err?.userMessage || err?.message || `${nodeId} could not be expanded.`,
            isError: true,
          },
        }));
      }
    },
    [graphJobId]
  );

  const handleAnalyzeMetapath = useCallback(async () => {
    if (!graphJobId) return;
    setMetapathJobId(null);
    setMetapathState({ data: null, error: null, starting: true });
    try {
      const response = await txkgApi.analyzeMetapath(graphJobId);
      const jobId = response?.jobId ?? response?.job_id ?? null;
      if (!jobId) throw new Error("The meta-path analysis did not return a job id.");
      setMetapathJobId(jobId);
      setMetapathState({ data: null, error: null, starting: false });
    } catch (err) {
      setMetapathState({
        data: null,
        error: err?.userMessage || err?.message || "The meta-path analysis could not be started.",
        starting: false,
      });
    }
  }, [graphJobId]);

  useEffect(() => {
    if (!metapathJob.isDone || !metapathJobId || metapathJob.jobId !== metapathJobId) return undefined;

    let mounted = true;
    Promise.all([
      txkgApi.getMetapath(metapathJobId),
      txkgApi.getMetapathScores(metapathJobId).catch(() => null),
      txkgApi.getMetapathTraversals(metapathJobId).catch(() => null),
    ])
      .then(([analysis, scores, traversals]) => {
        if (mounted) {
          setMetapathState({
            data: normalizeMetapath({ analysis, scores, traversals }),
            error: null,
            starting: false,
          });
        }
      })
      .catch((err) => {
        if (mounted) {
          setMetapathState({
            data: null,
            error: err?.userMessage || err?.message || "The meta-path analysis could not be read.",
            starting: false,
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [metapathJob.isDone, metapathJob.jobId, metapathJobId]);

  useEffect(() => {
    if (metapathJob.isFailed && metapathJob.jobId === metapathJobId) {
      setMetapathState({ data: null, error: metapathJob.error, starting: false });
    }
  }, [metapathJob.isFailed, metapathJob.error, metapathJob.jobId, metapathJobId]);

  const metapath = useMemo(
    () => ({
      data: metapathState.data,
      error: metapathState.error,
      loading:
        metapathState.starting ||
        (Boolean(metapathJobId) && !metapathState.data && !metapathState.error),
      // Only offered once there is a graph to analyse.
      onAnalyze: graphJobId && graphState.graph ? handleAnalyzeMetapath : undefined,
    }),
    [metapathState, metapathJobId, graphJobId, graphState.graph, handleAnalyzeMetapath]
  );

  const subgraph = useMemo(
    () => ({
      graph: graphState.graph,
      stats: graphState.stats,
      error: graphState.error,
      loading: graphJob.isPolling || (Boolean(graphJobId) && !graphState.graph && !graphState.error),
      onNodeClick: graphJobId ? handleExploreNode : undefined,
      notice: graphState.notice ?? null,
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

        // W8: the rail is a progress indicator, not a router. Every module
        // that has run is already on the page, so clicking one scrolls its
        // card into view instead of tearing down and remounting a screen.
        // `scrollToModule` still calls goToModule, so the session's own idea
        // of the active step — which drives Branch / Rerun / Export — stays
        // correct.
        const goToStep = canNavigate
          ? () => scrollToModule(step.key)
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
    /**
     * Counts come from the results each module actually returned. They were
     * fixed at 10 targets / 124 articles / 6 matches / "/ 2" for every run.
     * A count that is not known yet is left out rather than guessed.
     */
    const txkgCount = txkgResult.hasData ? txkgResult.count : null;
    const targetTotal = txkgResult.targets.length;
    const articleCount = litminex.data ? litminex.data.total ?? null : null;
    const compoundCount = curatexResults.data ? curatexResults.data.total ?? null : null;
    const hitCount = screensuite.data ? (screensuite.data.hits ?? []).length : null;
    const patentCount = novsearch.data ? novsearch.data.total ?? null : null;
    const countOf = (n) => (n == null ? "" : `/ ${n}`);
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const running = activeJob.progressMessage || null;

    const getTabInfo = () => {
      switch (workflowPhase) {
        case 'txkg-loading':    return { badge: 1, title: "Target identification query", count: "", dotColor: "#FFC107", statusText: running || "Searching databases" };
        case 'txkg-results':   return { badge: 1, title: "Target identification",       count: countOf(txkgCount), dotColor: "#00BCD4", statusText: txkgCount == null ? "No targets returned" : `${plural(txkgCount, "target")} found` };
        case 'target-selection': return { badge: 1, title: "Target selection",          count: countOf(targetTotal || null), dotColor: "#00BCD4", statusText: `${selectedTargets.length} selected \u2022 ${Math.max(targetTotal - selectedTargets.filter((id) => txkgResult.targets.some((t) => t.id === id)).length, 0)} available` };
        case 'litminex-loading': return { badge: 2, title: "Literature mining",         count: "", dotColor: "#FFC107", statusText: running || "Searching databases" };
        case 'litminex-results': return { badge: 2, title: "Literature mining",         count: countOf(articleCount), dotColor: "#00BCD4", statusText: articleCount == null ? (litminex.loading ? "Loading articles…" : "Results ready") : `${plural(articleCount, "article")} found` };
        case 'curatex-loading':  return { badge: 3, title: "Compound screening",        count: "", dotColor: "#FFC107", statusText: running || "Analyzing..." };
        case 'curatex-profile':  return { badge: 3, title: "Target profile",            count: "",      dotColor: "#00BCD4", statusText: "Profile ready" };
        case 'curatex-submitted':return { badge: 3, title: "Compound screening",        count: "", dotColor: "#FFC107", statusText: compoundsJob.progressMessage || "Scoring compounds..." };
        case 'curatex-results':  return { badge: 3, title: "Compound screening",        count: countOf(compoundCount), dotColor: "#00BCD4", statusText: compoundCount == null ? "Results ready" : `${plural(compoundCount, "compound")} scored` };
        case 'screensuite-loading': return { badge: 4, title: "Docking initialization", count: "", dotColor: "#FFC107", statusText: running || "Pipeline starting" };
        case 'screensuite-results': return { badge: 4, title: "Docking results", count: countOf(hitCount), dotColor: "#00BCD4", statusText: hitCount == null ? "Docking complete" : `${plural(hitCount, "docking hit")}` };
        case 'novelty-results':  return { badge: 5, title: "Novelty search",   count: countOf(patentCount), dotColor: "#00BCD4", statusText: patentCount == null ? "Report ready" : `${plural(patentCount, "patent")} found` };
        default:
          if (workflowPhase.startsWith('screensuite') && !isErrorPhase(workflowPhase)) return { badge: 4, title: "Docking initialization", count: "", dotColor: "#FFC107", statusText: running || "Pipeline starting" };
          if (workflowPhase.startsWith('novelty') && !isErrorPhase(workflowPhase)) return { badge: 5, title: "Novelty search",   count: "", dotColor: "#FFC107", statusText: running || "Processing..." };
          return { badge: activeStep + 1, title: WORKFLOW_STEPS[activeStep]?.label || "", count: "", dotColor: isErrorPhase(workflowPhase) ? "#DC2626" : "#00BCD4", statusText: isErrorPhase(workflowPhase) ? "Failed" : "" };
      }
    };
    const tabInfo = getTabInfo();
    // The second entry here was an invented "Alt · JAK2 + TPOR (MPL)" branch.
    // Branches are created from each card's Branch button; there is no
    // endpoint that lists them, so only the main path is shown.
    const BRANCHES = [
      { id: "main", label: "Main", sub: "Main research path" },
    ];

    /**
     * "All changes saved" was static text. It now reflects the session's real
     * state: the PATCH in flight, its failure, or a saved session.
     *
     * It used to fall back to the server's raw status otherwise, which read
     * "Session completed" at every stage of a run; testing asked for that to
     * go, so nothing is shown unless there is save feedback to give.
     */
    const saveIndicator =
      saveState.status === "saving"
        ? { color: "#FFC107", text: "Saving…" }
        : saveState.status === "error"
        ? { color: "#DC2626", text: `Not saved: ${saveState.error}` }
        : session.sessionStatus === "Saved"
        ? { color: "#22C55E", text: "Session saved" }
        : null;
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
          {saveIndicator && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }} role="status">
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: saveIndicator.color }} />
              <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "12px", color: saveState.status === "error" ? "#DC2626" : "#94A3B8" }}>
                {saveIndicator.text}
              </Typography>
            </Box>
          )}
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
                  {artifactCount != null && (
                    <div className="artifact-badge" style={ viewMode === "artifacts" ? { background: "rgba(255,255,255,0.12)", color: "#FFFFFF", borderRadius: 10, padding: "2px 6px" } : {} }>
                      <span className="count">{artifactCount}</span>
                    </div>
                  )}
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
                  {/* The badge here was a fixed "2"; nothing supplies a count. */}
                  <span className="label">Lineage</span>
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

  // The "Branch Research" dialog that used to live here was a mock: a fixed
  // "JAK2-alternative-targets" name, a Type 2 Diabetes description and a
  // "Create & Branch" button that only flipped a local flag. Branch is the
  // wired PhaseActions button on each card now.

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

    // The list row is shown immediately; the full record is MERGED over it.
    // Replacing the row with the detail meant an empty `keywords: []` from
    // GET /articles/{id} hid the keywords the row already had.
    const article = { ...selectedArticle };
    if (articleDetail && typeof articleDetail === "object") {
      Object.entries(articleDetail).forEach(([key, value]) => {
        if (value == null) return;
        if (typeof value === "string" && !value.trim()) return;
        if (Array.isArray(value) && !value.length) return;
        article[key] = value;
      });
    }

    const keywords = Array.isArray(article.keywords)
      ? article.keywords
      : typeof article.keywords === "string"
      ? article.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : article.keywordList || [];

    // The article's pmcLink; failing that, GET /articles/{id}/pmc-link; and
    // only then the PubMed record derived from the article id.
    const externalUrl = article.pmcLink || articlePmc?.url || pubmedUrl(article.id);
    const externalLabel = article.pmcLink
      ? "View on PubMed Central"
      : articlePmc?.url
      ? `View on ${articlePmc.provider || "PubMed Central"}`
      : "View on PubMed";

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
                ↗ {externalLabel}
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
                    {/* The reply's citations were stored but never shown. */}
                    {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                      <Box sx={{ mt: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Citations
                        </Typography>
                        {msg.citations.map((citation, ci) => {
                          const text =
                            typeof citation === "string"
                              ? citation
                              : citation?.title || citation?.text || citation?.source || citation?.id || citation?.pmid || "";
                          const href = typeof citation === "object" ? citation?.url || citation?.link || null : null;
                          if (!text && !href) return null;
                          return href ? (
                            <Typography key={ci} component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ fontFamily: FONT, fontSize: "11px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                              [{ci + 1}] {text || href} ↗
                            </Typography>
                          ) : (
                            <Typography key={ci} sx={{ fontFamily: FONT, fontSize: "11px", color: "#6B7280" }}>
                              [{ci + 1}] {String(text)}
                            </Typography>
                          );
                        })}
                      </Box>
                    )}
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
              role={articleNotice.isError ? "alert" : "status"}
              sx={{ fontFamily: FONT, fontSize: "12px", color: articleNotice.isError ? "#DC2626" : "#059669" }}
            >
              {articleNotice.text}
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

  /**
   * Compound Detail Dialog (Figma Image 15).
   *
   * Every compound used to open the same Metformin write-up — AMPK mechanism,
   * "First-line therapy for Type 2 Diabetes", "3 relevant patents", "94%
   * match". It now shows only what GET /agents/curatex/{jobId}/results returned
   * for the compound that was clicked; mechanism, clinical use and patent
   * status have no endpoint behind them, so they are not shown.
   */
  const CompoundDetailDialog = () => {
    const compound = selectedCompound || {};
    const target = curatexResults.data?.target || curatexProfile.data?.target || null;
    const rows = [
      ["Rank", compound.rank],
      ["Match score", compound.score != null && compound.score !== "—" ? compound.score : null],
      ["Target", target],
      ["ChEMBL ID", compound.chemblId],
      ["SMILES", compound.smiles],
    ].filter(([, value]) => value != null && value !== "");

    return (
      <Dialog
        open={showCompoundDetail}
        onClose={() => setShowCompoundDetail(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${BORDER}` }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: TEXT_DARK }}>
            {compound.name ? `${compound.name} - Compound Detail` : "Compound Detail"}
          </Typography>
          <IconButton size="small" onClick={() => setShowCompoundDetail(false)}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "24px" }}>
          {selectedCompound && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", pt: "8px" }}>
              {rows.map(([label, value]) => (
                <Box key={label}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", mb: "4px" }}>
                    {label}
                  </Typography>
                  {label === "ChEMBL ID" ? (
                    <Typography
                      component="a"
                      href={`https://www.ebi.ac.uk/chembl/compound_report_card/${encodeURIComponent(value)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontFamily: FONT, fontSize: "13px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                      {value} ↗
                    </Typography>
                  ) : (
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.6, wordBreak: "break-all" }}>
                      {String(value)}
                    </Typography>
                  )}
                </Box>
              ))}
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, lineHeight: 1.5 }}>
                Mechanism of action, clinical use and patent status are not provided by the CurateX results.
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
          {/* Had no onClick. It hands this compound to ScreenSuite. */}
          <Button
            variant="contained"
            disabled={!selectedCompound || session.pending}
            onClick={() => {
              setShowCompoundDetail(false);
              handleContinueToScreenSuite();
            }}
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
  };

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
  /**
   * @param {string[]} [ids] - targets to send. "Proceed with Recommended
   *   Targets" passes every TxKG target (the copy says "all N"); the target
   *   picker passes nothing and the ticked selection is sent.
   */
  const handleContinueToLitMineX = useCallback((ids) => {
    const chosen = Array.isArray(ids) ? ids : selectedTargets;
    if (Array.isArray(ids)) setSelectedTargets(ids);
    const { targetIds, unresolved } = toGeneNames(chosen, txkgResult.targets);

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
      activeJob.retry();
    }
  }, [session, activeJob]);

  /**
   * LitMineX → CurateX, carrying a gene symbol.
   *
   * This is the control the testing team found missing. Without it the only
   * route onwards was typing "@curatex create drug profile for JAK2", and the
   * backend took the whole sentence as the target — hence
   * "RunnerError: No reviewed human UniProt entry matched 'Create drug profile
   * for JAK2'. Use the gene symbol". A structured `selections` payload cannot
   * produce that error.
   *
   * It also used to forward the LitMineX step's targetIds without asking. When
   * LitMineX had been started on the disease, that was ["thrombocytosis"],
   * which fails the same UniProt lookup. The button now opens a picker and
   * CurateX gets the one protein target the researcher chooses.
   */
  const [curatexPickerOpen, setCuratexPickerOpen] = useState(false);

  /** A sensible default for the picker: the first carried target that isn't the disease. */
  const curatexDefaultTarget = useMemo(() => {
    const fromStep = session.steps.litminex?.data?.selections?.targetIds;
    const carried = [
      ...(Array.isArray(fromStep) ? fromStep : []),
      ...toGeneNames(selectedTargets, txkgResult.targets).targetIds,
    ];
    const disease = String(txkgResult.disease ?? "").trim().toLowerCase();
    return carried.find((id) => id && String(id).trim().toLowerCase() !== disease) ?? null;
  }, [session.steps.litminex, selectedTargets, txkgResult.targets, txkgResult.disease]);

  const handleContinueToCurateX = useCallback(() => setCuratexPickerOpen(true), []);

  const handleConfirmCurateXTarget = useCallback((symbol) => {
    setCuratexPickerOpen(false);
    session.handOff("curatex", buildSelections("curatex", { targetIds: [symbol] }));
  }, [session]);

  /** The article the detail panel is showing, enriched from /articles/{id}. */
  const [articleDetail, setArticleDetail] = useState(null);
  const [articleBusy, setArticleBusy] = useState(null);
  /** { text, isError } */
  const [articleNotice, setArticleNotice] = useState(null);
  const [articleChat, setArticleChat] = useState([]);
  /** GET /articles/{id}/pmc-link → { url, provider }, when pmcLink is missing. */
  const [articlePmc, setArticlePmc] = useState(null);

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
      setArticlePmc(null);
      return undefined;
    }

    let mounted = true;
    const articleId = selectedArticle.id;
    const rowPmcLink = selectedArticle.pmcLink;
    setArticleBusy("detail");
    setArticleNotice(null);
    setArticlePmc(null);

    // Without a pmcLink the panel fell straight back to PubMed. The pmc-link
    // endpoint is asked first; failing that, the PubMed fallback stands.
    const lookUpPmc = () =>
      litminexApi
        .getArticlePmcLink(articleId)
        .then((link) => {
          if (mounted && link?.url) setArticlePmc({ url: link.url, provider: link.provider || null });
        })
        .catch(() => {});

    Promise.all([
      litminexApi.getArticle(selectedArticle.id),
      litminexApi.getArticleChatHistory(selectedArticle.id).catch(() => []),
    ])
      .then(([detail, history]) => {
        if (!mounted) return;
        setArticleDetail(detail);
        setArticleChat(Array.isArray(history) ? history : []);
        setArticleBusy(null);
        if (!detail?.pmcLink && !rowPmcLink) lookUpPmc();
      })
      .catch((err) => {
        if (!mounted) return;
        setArticleNotice({
          text: err?.userMessage || err?.message || "The article could not be loaded.",
          isError: true,
        });
        setArticleBusy(null);
        if (!rowPmcLink) lookUpPmc();
      });

    return () => {
      mounted = false;
    };
    // The row's pmcLink is read once per opened article.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArticleDetail, selectedArticle?.id]);

  /** Item 22: bookmark the article. */
  const handleSaveArticle = useCallback(async () => {
    if (!selectedArticle?.id) return;
    setArticleBusy("save");
    setArticleNotice(null);
    try {
      // { success, message } — a 200 is not proof of a save; `success` is.
      const response = await litminexApi.saveArticle(selectedArticle.id, location.state?.projectId ?? null);
      if (response?.success === true) {
        setArticleNotice({ text: response.message || "Article saved.", isError: false });
      } else {
        setArticleNotice({
          text: response?.message || "The server did not confirm the save.",
          isError: true,
        });
      }
    } catch (err) {
      setArticleNotice({
        text: err?.userMessage || err?.message || "The article could not be saved.",
        isError: true,
      });
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

  /**
   * What to say about a module that failed.
   *
   * This took no argument before, because only the active module had a screen
   * and therefore only the active module could show an error. Every module now
   * has a card of its own, so a failure has to be describable per module.
   */
  const errorInfoFor = useCallback(
    (moduleKey) => {
      const owner = MODULE_BY_KEY[moduleKey];
      if (!owner) return null;

      const stepError = session.steps[moduleKey]?.error ?? null;

      // Docking cannot succeed on this deployment, so its failure is a known
      // limitation rather than a fault and is presented as one.
      if (owner.key === "screensuite" && SCREENSUITE_UNAVAILABLE) {
        return {
          title: `${owner.label} cannot run on this deployment`,
          message: SCREENSUITE_UNAVAILABLE_MESSAGE,
          detail: stepError,
          expected: true,
        };
      }

      return {
        title: `${owner.label} could not finish`,
        message: stepError || "The agent run failed without a reason.",
        detail: null,
        expected: false,
      };
    },
    [session.steps]
  );

  /**
   * Scroll a module's card into view.
   *
   * W8: the left rail used to swap which screen was mounted. Now every module
   * is already on the page, so "go to TxKG" means moving the viewport, not
   * tearing down and rebuilding a view. `goToModule` is still called so the
   * session's own notion of the active step stays correct.
   */
  const moduleAnchors = useRef({});

  const scrollToModule = useCallback(
    (moduleKey) => {
      session.goToModule(moduleKey);
      const node = moduleAnchors.current[moduleKey];
      if (node?.scrollIntoView) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.goToModule]
  );

  /**
   * One module's own output.
   *
   * These are the same five phase components with the same props they always
   * had. Two things changed:
   *
   *  - Each is driven by ITS OWN phase, read from `session.steps[key].phase`,
   *    rather than by the single global `workflowPhase`. That is what lets
   *    five of them be on the page at once, each showing its own state.
   *  - None of them is passed `chatMessages` any more. The conversation is
   *    rendered once, by the timeline, instead of being redrawn privately
   *    inside two of the five screens (defect B1 — the other three never drew
   *    it at all, which is why follow-up answers vanished).
   *
   * Every result hook is already keyed on its own module's jobId, so a card
   * has its data whether or not that module is the active one. Nothing about
   * the API layer changes here.
   */
  const renderModuleBody = (moduleKey) => {
    const step = session.steps[moduleKey];
    const phase = step?.phase || "";

    if (isErrorPhase(phase) || step?.error) {
      const info = errorInfoFor(moduleKey);
      if (!info) return null;

      const idx = session.activationOrder.indexOf(moduleKey);
      const previous = idx > 0 ? session.activationOrder[idx - 1] : null;
      const isActive = session.activeKey === moduleKey;

      return (
        <PhaseError
          title={info.title}
          message={info.message}
          detail={info.detail}
          /* Retry acts on the active step, so it is only offered on the card
             the session is actually on — rather than appearing live on an
             older card and quietly rerunning something else. */
          onRetry={!info.expected && isActive ? retryActiveStep : undefined}
          onBack={previous ? () => scrollToModule(previous) : undefined}
          backLabel={previous ? `Back to ${MODULE_BY_KEY[previous]?.label ?? "previous step"}` : undefined}
          expected={info.expected}
        />
      );
    }

    if (moduleKey === "pipeline") {
      return (
        <PipelinePhase
          workflowPhase={phase}
          pipeline={pipeline.data}
          progressMessage={pipelineJob.progressMessage}
          query={query}
        />
      );
    }

    if (moduleKey === "txkg") {
      // A resumed, completed TxKG step lands on its results phase before its
      // /result has been fetched; show the loading screen until it arrives
      // rather than the "no targets" state.
      const txkgJobSettled =
        txkgJob.jobId === step?.jobId && (txkgJob.isDone || txkgJob.isFailed);
      const awaitingResult =
        (phase === "txkg-results" || phase === "target-selection") &&
        Boolean(step?.jobId) &&
        !step?.data?.jobResult &&
        !txkgJobSettled;

      return (
        <TXKGPhase
          workflowPhase={awaitingResult ? "txkg-loading" : phase}
          query={query}
          txkg={txkgResult}
          progressMessage={txkgJob.progressMessage}
          expandedAccordion={expandedAccordion}
          setExpandedAccordion={setExpandedAccordion}
          insightTab={insightTab}
          setInsightTab={setInsightTab}
          selectedTargets={selectedTargets}
          setSelectedTargets={setSelectedTargets}
          setWorkflowPhase={setWorkflowPhase}
          setActiveStep={setActiveStep}
          onContinue={handleContinueToLitMineX}
          continuePending={session.pending}
          jobId={session.steps.txkg?.jobId ?? null}
          actions={txkgActions}
          subgraph={subgraph}
          onGenerateSubgraph={handleGenerateSubgraph}
          metapath={metapath}
        />
      );
    }

    if (moduleKey === "litminex") {
      return (
        <LiteminexPhase
          workflowPhase={phase}
          litMinexResults={litMinexResults}
          setSelectedArticle={setSelectedArticle}
          setShowArticleDetail={setShowArticleDetail}
          progressMessage={litminexJob.progressMessage}
          loading={litminex.loading}
          error={litminex.error}
          onRetry={litminex.reload}
          insights={litminex.data?.insights ?? null}
          total={litminex.data?.total ?? 0}
          page={litminex.data?.page ?? 1}
          totalPages={litminex.data?.totalPages ?? 1}
          onPageChange={setLitminexPage}
          requestText={litminexRequestText}
          selectedArticles={selectedArticles}
          onToggleArticle={handleToggleArticle}
          onContinue={handleContinueToCurateX}
          continuePending={session.pending}
          actions={litminexActions}
          jobId={session.steps.litminex?.jobId ?? null}
          pageSize={litminex.data?.pageSize}
        />
      );
    }

    if (moduleKey === "curatex") {
      return (
        <CuratexPhase
          workflowPhase={phase}
          setWorkflowPhase={setWorkflowPhase}
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
          progressMessage={curatexJob.progressMessage || compoundsJob.progressMessage}
          profile={curatexProfile.data}
          profileLoading={curatexProfile.loading}
          profileError={curatexProfile.error}
          onRetryProfile={curatexProfile.reload}
          resultsLoading={curatexResults.loading}
          resultsError={curatexResults.error}
          onRetryResults={curatexResults.reload}
          onSubmitProfile={handleSubmitProfile}
          onContinue={handleContinueToScreenSuite}
          continuePending={session.pending}
          page={curatexResults.data?.page ?? 1}
          totalPages={curatexResults.data?.totalPages ?? 1}
          total={curatexResults.data?.total ?? 0}
          onPageChange={setCuratexPage}
          actions={curatexActions}
          resultsTarget={curatexResults.data?.target ?? null}
        />
      );
    }

    if (moduleKey === "screensuite") {
      return (
        <ScreeningSuitePhase
          workflowPhase={phase}
          progressMessage={screensuiteJob.progressMessage}
          hits={screensuite.data?.hits ?? []}
          loading={screensuite.loading}
          error={screensuite.error}
          onRetry={screensuite.reload}
          unavailable={SCREENSUITE_UNAVAILABLE}
          unavailableMessage={SCREENSUITE_UNAVAILABLE_MESSAGE}
          actions={screensuiteActions}
          target={step?.data?.selections?.target ?? null}
          compounds={step?.data?.selections?.compounds ?? []}
        />
      );
    }

    if (moduleKey === "novsearch") {
      return (
        <NoveltySearchPhase
          workflowPhase={phase}
          progressMessage={novsearchJob.progressMessage ?? null}
          isLoading={phase === "novelty-loading"}
          report={novsearch.data}
          loading={novsearch.loading}
          error={novsearch.error}
          onRetry={novsearch.reload}
          actions={novsearchActions}
          onEndTask={handleEndTask}
        />
      );
    }

    /**
     * A module the supervisor named that this build has no view for. Worth
     * saying plainly rather than rendering an empty card.
     */
    return (
      <PhaseError
        title="No view for this step"
        message={`The workflow reached "${phase || moduleKey}", which this build has no view for.`}
        detail="This usually means the backend added a module the UI has not caught up with."
        expected
      />
    );
  };

  /**
   * The conversation, in order, with each module's card where it ran.
   *
   * Messages that belong to no module — the opening query, and anything said
   * before the supervisor picked an agent — lead the thread. After that, each
   * activated module contributes its own messages followed by its card.
   *
   * `activationOrder` is the supervisor's order, not the pipeline's, so a
   * session that ran NovSearch before CurateX reads in the order it actually
   * happened.
   */
  const timelineBlocks = useMemo(() => {
    const blocks = [];
    const conversation = session.conversation;

    const order = [];
    session.activationOrder.forEach((key) => {
      if (!order.includes(key)) order.push(key);
    });

    conversation
      .filter((m) => !m.moduleKey || !order.includes(m.moduleKey))
      .forEach((m) => blocks.push({ kind: "message", id: `msg-${m.id}`, message: m }));

    // A module's messages used to ALL go before its card. Testing found text
    // typed in the chat while on CurateX "did not show up": it was tagged to
    // CurateX and so drawn above the (tall, expanded) CurateX card, out of
    // view. Messages that led to the module still come first; anything said
    // once the card was on screen (`afterCard`) now follows it.
    const pushMessages = (list) =>
      list.forEach((m) => blocks.push({ kind: "message", id: `msg-${m.id}`, message: m }));

    order.forEach((key) => {
      const own = conversation.filter((m) => m.moduleKey === key);
      // TxKG's own card is the answer to the prompt that ran it. The agent
      // text the backend attaches ahead of it ("Here are the explanations for
      // each candidate: ...") is an unedited note that testing asked to hide,
      // so only the user's prompt (and any error) is drawn before the card.
      const lead = own.filter((m) => !m.afterCard);
      pushMessages(
        key === "txkg" ? lead.filter((m) => m.role === "user" || m.isError) : lead
      );
      blocks.push({ kind: "module", id: `mod-${key}`, moduleKey: key });
      pushMessages(own.filter((m) => m.afterCard));
    });

    return blocks;
  }, [session.conversation, session.activationOrder]);

  /** Status chip for one module's card, from the rail the session already builds. */
  const cardStatusFor = (moduleKey) => {
    const railStep = session.rail.find((r) => r.key === moduleKey);
    if (!railStep) return "idle";
    if (railStep.isFailed) return "failed";
    if (railStep.isRunning) return "running";
    if (railStep.isCompleted) return "done";
    return "idle";
  };

  // Render the workspace: one continuous conversation, not one screen per module.
  const renderContent = () => {
    if (viewMode === "lineage") {
      return (
        <Box sx={{ flex: 1, p: "24px", overflow: "auto" }}>
          <LineagePage />
        </Box>
      );
    }
    if (viewMode === "artifacts") {
      return (
        <Box sx={{ flex: 1, p: "24px", overflow: "auto" }}>
          <ArtifactsPage
            sessionId={session.sessionId}
            projectId={entryState.projectId ?? null}
            refreshKey={sessionRefreshTick}
            onLoaded={(list) => setArtifactCount(list.length)}
          />
        </Box>
      );
    }

    /**
     * The session itself failed — no module ever started, so there is no card
     * to fall back to.
     */
    if (session.status === "error" && !session.activeKey) {
      return (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <PhaseError
            title={entrySessionId ? "The research session could not be reopened" : "The research session could not be started"}
            message={session.error}
            detail={
              entrySessionId
                ? "The saved session is read from GET /sessions/{id}; nothing can be shown until it loads."
                : "The supervisor decides which agent runs, so nothing can proceed until this call succeeds."
            }
            onRetry={openSession}
          />
        </Box>
      );
    }

    return (
      <ConversationTimeline
        blocks={timelineBlocks}
        pending={session.pending}
        scrollAnchors={moduleAnchors}
        renderModule={(moduleKey) => (
          <ModuleResultCard
            moduleKey={moduleKey}
            status={cardStatusFor(moduleKey)}
            hasFailedStages={moduleKey === "pipeline" && Boolean(pipeline.data?.hasFailures)}
            isActive={session.activeKey === moduleKey}
            /* Only the module the session is on opens by itself. The subgraph
               and the docking views are heavy, and mounting all five at once
               in a long session is what would make this slow. */
            defaultExpanded={session.activeKey === moduleKey}
          >
            {renderModuleBody(moduleKey)}
          </ModuleResultCard>
        )}
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
            {/* The timeline owns its own scrolling, so this wrapper must not
                add a second scroll container around it — nested scrollers are
                what made "scroll to a module" unreliable. */}
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {renderContent()}
            </Box>

            {/* W5 / defect B2: the composer used to be hidden on every
                NovSearch phase, so the conversation dead-ended at the last
                module with no way to ask anything further. It is part of the
                workspace now, not part of a screen. */}
            {viewMode === "chat" && (
              /* ChatInputBar is imported rather than declared here on purpose —
                 see the note in its own file. Declared inline, it was rebuilt
                 on every parent render, and the parent re-renders roughly once
                 a second while a job is polling, which remounted the field and
                 threw away the caret mid-sentence. */
              <ChatInputBar
                onSend={handleChatSubmit}
                pending={session.pending}
                // Only shown while a reply is in flight. The idle hint
                // ("Mention a module with @ to start a new run") was removed
                // per testing; the placeholder already says to type @.
                hint={session.pending ? "Asking the agent…" : undefined}
              />
            )}
          </Box>
        </Box>
      </Box>

      <ProteinTargetPickerDialog
        open={curatexPickerOpen}
        targets={txkgResult.targets}
        initialSymbol={curatexDefaultTarget}
        disease={txkgResult.disease}
        pending={session.pending}
        onCancel={() => setCuratexPickerOpen(false)}
        onConfirm={handleConfirmCurateXTarget}
      />
      <ArticleDetailPanel />
      <CompoundDetailDialog />
      <ShareModal open={showShareDialog} onClose={() => setShowShareDialog(false)} />
    </Box>
  );
};

export default CompleteWorkflow;