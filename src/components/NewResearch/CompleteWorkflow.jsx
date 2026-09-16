import React, { useState, useEffect, useCallback, useRef } from "react";
import ArtifactsPage from "./ArtifactsPage";
import LineagePage from "./LineagePage";
import ShareModal from "../ShareModal/ShareModal";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, Button, Tabs, Tab, Checkbox,
  TextField, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import {
  ExpandMoreOutlined,
  VisibilityOutlined,
  DeleteOutlineOutlined,
  AddOutlined,
  CloseOutlined
} from "@mui/icons-material";
import SideBar from "../SideBar/SideBar";
import TXKGPhase from "../workflow/TXKG/TXKGPhase";
import LiteminexPhase from "../workflow/Liteminex/LiteminexPhase";
import CuratexPhase from "../workflow/Curatex/CuratexPhase";
import ScreeningSuitePhase from "../workflow/ScreeningSuite/ScreeningSuitePhase";
import NoveltySearchPhase from "../workflow/NoveltySearch/NoveltySearchPhase";
import useWorkflowSession from "../../hooks/useWorkflowSession";
import useJob from "../../hooks/useJob";
import { moduleForPhase } from "../../workflow/moduleMap";
import './WorkflowStyles.css';

// Design tokens matching Figma
const FONT = "'Geist', sans-serif";
const TEAL = "#00BCD4";
const USER_MSG_BG = "#F0FDFC";
const GRAY_BG = "#F8FAFC";
const BORDER = "#E2E8F0";
const BORDER_LIGHT = "#E5EBF0";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#808794";
const INSIGHTS_HEADER = "#1A1F26";
const ACTIVE_TAB = "#00BCD4";

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
  const [selectedTargets, setSelectedTargets] = useState(["P37231", "P27487", "P08172"]);
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
  const [sharePeople, setSharePeople] = useState([
    { initials: "PS", name: "Dr. Priya Sharma", email: "priya@inovapath.com", role: "Owner", color: "#00BCD4" },
    { initials: "RM", name: "Dr. Rahul Menon", email: "rahul.m@inovapath.com", role: "Editor", color: "#00C2B5" },
    { initials: "SC", name: "Sarah Chen", email: "sarah.c@inovapath.com", role: "Viewer", color: "#8C4DBF" },
  ]);

  const [profileData, setProfileData] = useState({
    indication: "Type 2 Diabetes",
    moa: "JAK2 Inhibition",
    route: "Oral",
    molecularWeight: "< 500 Da",
    bioavailability: "> 60%",
    halfLife: "8-12 hours",
    logP: "1.5-3.5",
    solubility: "> 10 mg/mL",
    plasmaProteinBinding: "< 90%"
  });
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [curateXResults, setCurateXResults] = useState([]);
  const [showCompoundDetail, setShowCompoundDetail] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  /**
   * The conversation is owned by the session store and is append-only, so
   * moving between steps never drops a message. What is rendered is the slice
   * up to and including the step being viewed.
   */
  const chatMessages = session.visibleConversation;
  const appendMessages = session.appendMessages;

  const [chatInputValue, setChatInputValue] = useState("");
  
  // ---------------------------------------------------------------------------
  // Supervisor
  //
  // Requirement: whatever module the supervisor returns is the module that gets
  // activated. The old code started at "txkg-loading" unconditionally; now the
  // starting module comes from the API response. See useWorkflowSession.
  // ---------------------------------------------------------------------------
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    session.startSession({ query }).then((started) => {
      if (!started) return;
      // Nothing to do on success — startSession has already activated the
      // module the supervisor named.
    });
    // Intentionally mount-only: a session is created once per workflow entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Job polling — replaces the setTimeout chain that used to fake progress.
  // ---------------------------------------------------------------------------
  const activeJobId = session.activeJobId;
  const job = useJob(activeJobId, { enabled: Boolean(activeJobId) });

  /**
   * When the active module's job finishes, move that module from its
   * "-loading" phase to its "-results" phase and keep the payload.
   */
  useEffect(() => {
    if (!job.isDone) return;

    const owner = moduleForPhase(workflowPhase);
    if (!owner) return;
    if (!workflowPhase.endsWith("-loading")) return;

    if (job.result) {
      session.setStepData({ jobResult: job.result }, owner.key);
    }

    // CurateX is the exception: its loading state resolves to the editable
    // profile screen, not straight to results.
    setWorkflowPhase(
      owner.key === "curatex" ? "curatex-profile" : owner.resultsPhase
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.isDone, job.result]);

  // ---------------------------------------------------------------------------
  // Fallback progression.
  //
  // Not every phase has a real job behind it yet — the per-agent result
  // endpoints are a later integration phase, and a supervisor response without
  // a job_id leaves nothing to poll. Where there is no job, the original timing
  // is preserved so the workflow still walks end to end. Each of these blocks
  // disappears as its agent phase is integrated.
  // ---------------------------------------------------------------------------
  const hasLiveJob = Boolean(activeJobId);

  useEffect(() => {
    if (hasLiveJob) return undefined;

    if (workflowPhase === "txkg-loading") {
      const timer = setTimeout(() => setWorkflowPhase("txkg-results"), 2500);
      return () => clearTimeout(timer);
    }
    if (workflowPhase === "litminex-loading") {
      const timer = setTimeout(() => {
        setWorkflowPhase("litminex-results");
        // Mock literature results from Figma
        setLitMinexResults([
          { id: 1, title: "Metformin repurposing for JAK2-mediated insulin resistance: Implications for Type 2 Diabetes treatment", year: 2024, confidence: "100%", keywords: "metformin, JAK2, insulin", author: "Chen, S. et al." },
          { id: 2, title: "SGLT2 inhibitor mechanisms in pancreatic beta-cell function", year: 2023, confidence: "97%", keywords: "SGLT2, beta-cell", author: "Williams, P. et al." },
          { id: 3, title: "GLP-1 receptor agonist effects on hepatic glucose metabolism", year: 2024, confidence: "94%", keywords: "GLP-1, hepatic glucose", author: "Martinez, R. et al." },
          { id: 4, title: "PI3K/Akt pathway modulation in Type 2 Diabetes pathophysiology", year: 2022, confidence: "91%", keywords: "PI3K, Akt, diabetes", author: "Thompson, K. et al." },
          { id: 5, title: "AMPK activation and glucose transport regulation in skeletal muscle", year: 2023, confidence: "88%", keywords: "AMPK, glucose transport", author: "Davis, M. et al." },
          { id: 6, title: "PPAR-gamma agonists for improving insulin sensitivity in T2D patients", year: 2024, confidence: "85%", keywords: "PPAR-gamma, insulin", author: "Anderson, L. et al." },
          { id: 7, title: "Genome-wide association studies for novel T2D loci identification", year: 2022, confidence: "82%", keywords: "GWAS, T2D loci", author: "Johnson, T. et al." },
          { id: 8, title: "DPP-4 inhibitor efficacy in glycemic control and cardiovascular outcomes", year: 2023, confidence: "79%", keywords: "DPP-4, glycemic control", author: "Lee, H. et al." },
        ]);
      }, 2500);
      return () => clearTimeout(timer);
    }
    if (workflowPhase === "curatex-loading") {
      const timer = setTimeout(() => setWorkflowPhase("curatex-profile"), 2000);
      return () => clearTimeout(timer);
    }
    if (workflowPhase === "screensuite-loading") {
      const timer = setTimeout(() => {
        setWorkflowPhase("screensuite-results");
      }, 8000);
      return () => clearTimeout(timer);
    }
    if (workflowPhase === "screensuite-results") {
      return undefined;
    }
    if (workflowPhase === "curatex-submitted") {
      const timer = setTimeout(() => {
        setWorkflowPhase("curatex-results");
        // Mock compound results from Figma
        setCurateXResults([
          { rank: 1, name: "Metformin", matchedProps: "MW, Bioavail, Route, Half-life, LogP", mismatchedProps: "Solubility", score: "93.5" },
          { rank: 2, name: "Pioglitazone", matchedProps: "MW, Route, Half-life, LogP, Solubility", mismatchedProps: "Bioavail", score: "89.2" },
          { rank: 3, name: "Canagliflozin", matchedProps: "MW, Route, Bioavail, LogP", mismatchedProps: "Half-life, Solubility", score: "85.7" },
          { rank: 4, name: "Empagliflozin", matchedProps: "MW, Route, Bioavail, Half-life", mismatchedProps: "LogP, Solubility", score: "82.4" },
          { rank: 5, name: "Liragluide", matchedProps: "MW, Bioavail, Half-life", mismatchedProps: "Route, LogP, Solubility", score: "78.1" },
          { rank: 6, name: "Sitagliptin", matchedProps: "MW, Route, LogP, Solubility", mismatchedProps: "Bioavail, Half-life, Solubility", score: "74.6" },
        ]);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowPhase, hasLiveJob]);

  // Mock targets data from Figma
  const mockTargets = [
    { id: "P37231", name: "PPARG receptor", fullName: "Peroxisome proliferator-activated receptor gamma", score: "92.00" },
    { id: "P27487", name: "DPP4", fullName: "Dipeptidyl peptidase-4", score: "87.00" },
    { id: "P43220", name: "GLP1R", fullName: "Glucagon-like peptide-1 receptor", score: "79.00" },
    { id: "P08172", name: "JAK2", fullName: "Janus kinase 2", score: "33.00" },
    { id: "P31629", name: "SGLT2", fullName: "Sodium-glucose co-transporter 2", score: "71.00" },
    { id: "P35558", name: "INSR", fullName: "Insulin receptor", score: "65.00" },
    { id: "P42345", name: "Interleukin-5 receptor", score: "33.00" },
    { id: "P20963", name: "Cytokine receptor common subunit beta", score: "23.00" },
    { id: "Q13013", name: "Granulocyte colony-stimulating factor receptor", score: "22.00" },
    { id: "P09619", name: "Cathrin-associated mediating protein 22", score: "21.00" },
  ];

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
        const isCompleted = Boolean(railStep?.visited) && !isActive;
        const canNavigate = Boolean(railStep?.isNavigable);

        // Requirement: the user can move between steps from this panel. Only
        // steps that have actually run are reachable — clicking one restores
        // that step's own view, and nothing it holds is discarded.
        const goToStep = canNavigate
          ? () => session.goToModule(step.key)
          : undefined;

        return (
          <React.Fragment key={step.id}>
            {isCompleted ? (
              /* Completed: dark dash + circle with checkmark — clickable */
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
                <Box sx={{ width: "20px", height: 0, borderTop: "1.5px solid #1A2E44", flexShrink: 0 }} />
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "#1A2E44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>✓</Typography>
                </Box>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "15px", fontWeight: 700, color: "#1A2E44", ml: "10px", lineHeight: 1 }}>
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
    const lastCrumb = (() => {
      if (["txkg-loading", "txkg-results", "target-selection"].includes(workflowPhase)) return "TxKG Query";
      if (["litminex-loading", "litminex-results"].includes(workflowPhase)) return "LitMineX";
      if (workflowPhase.startsWith("curatex")) return "CurateX";
      if (workflowPhase.startsWith("screensuite")) return "ScreenSuite";
      if (workflowPhase.startsWith("novelty")) return "NovSearch";
      return `${WORKFLOW_STEPS[activeStep]?.label || ""} Results`;
    })();
    return (
      <Box sx={{ bgcolor: "#FFFFFF", flexShrink: 0, position: "relative" }}>
        {/* Row 1: breadcrumb + All changes saved — hug height, 32px L/R padding, bottom border */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: "32px", py: "10px",
          borderBottom: "1px solid #E2E8F0"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {["New Project", "Type 2 Diabetes", lastCrumb].map((crumb, i, arr) => (
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

  // Compound Detail Dialog (Figma Image 15)

  // TXKG Phase - Results
  const renderTxKGResults = () => (
    <Box sx={{ p: "24px 40px 40px 40px", bgcolor: GRAY_BG }}>
      {/* User message row */}
      <div className="user-message-row">
        <div className="user-message-bubble">
          <div className="user-bubble-header">
            <span className="user-name">DR. PRIYA (YOU)</span>
          </div>
          <div className="user-message-text">{query}</div>
        </div>
      </div>

      {/* TXKG Accordion */}
      <Box sx={{ p: "4px 0" }}>
      <Accordion 
        expanded={expandedAccordion === "txkg"}
        onChange={() => setExpandedAccordion(expandedAccordion === "txkg" ? "" : "txkg")}
        sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
          sx={{
            minHeight: "48px",
            p: "8px 16px",
            "&.Mui-expanded": { minHeight: "48px" },
            "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
            </Box>
            <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase" }}>
              TXKG
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: "16px", bgcolor: "#FFFFFF" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
            I found 10 protein targets strongly associated with Type 2 Diabetes pathways. Here are the top candidates ranked by therapeutic relevance:
          </Typography>

          <Box sx={{ display: "flex", gap: "12px" }}>
            {/* Target Table */}
            <Box sx={{ flex: "0 0 52%", minWidth: 0 }}>
              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                {/* Table Header */}
                <Box sx={{ display: "flex", bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER_LIGHT}`, gap: "8px" }}>
                  <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    UNIPROT ID
                  </Typography>
                  <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    TARGET
                  </Typography>
                  <Typography sx={{ flex: "0 0 80px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", textAlign: "right", letterSpacing: "0.5px" }}>
                    SCORE
                  </Typography>
                </Box>
                {/* Table Body */}
                {mockTargets.map((target, i) => (
                  <Box 
                    key={target.id} 
                    sx={{ 
                      display: "flex", 
                      p: "12px 16px", 
                      borderBottom: i < mockTargets.length - 1 ? `1px solid ${BORDER}` : "none",
                      bgcolor: i === 0 ? "rgba(0,188,212,0.08)" : "transparent",
                      "&:hover": { bgcolor: i === 0 ? "rgba(0,188,212,0.12)" : "#F8FAFC" }
                    }}
                  >
                    <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL }}>
                      {target.id}
                    </Typography>
                    <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                      {target.name}
                    </Typography>
                    <Typography sx={{ flex: "0 0 80px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textAlign: "right" }}>
                      {target.score}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Insights Panel */}
            <Box sx={{ flex: 1, minWidth: 0, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
              <Box sx={{ bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER_LIGHT}`, gap: "8px" }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: INSIGHTS_HEADER, lineHeight: "100%" }}>
                  Insights
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 400, color: TEXT_MUTED, lineHeight: "100%", mt: "4px" }}>
                  AI-powered target recommendations and Q&A
                </Typography>
              </Box>

              <Box sx={{ borderBottom: `1px solid ${BORDER}`, p: "4px" }}>
                <Tabs 
                  value={insightTab} 
                  onChange={(e, val) => setInsightTab(val)}
                  TabIndicatorProps={{ style: { display: "none" } }}
                  sx={{ 
                    minHeight: "32px",
                    "& .MuiTab-root": { 
                      minHeight: "23px",
                      p: "4px 10px",
                      textTransform: "none", 
                      fontFamily: FONT, 
                      fontSize: "10px",
                      fontWeight: 600,
                      lineHeight: "100%",
                      color: TEXT_MUTED,
                      "&.Mui-selected": { 
                        color: ACTIVE_TAB,
                      }
                    }
                  }}
                >
                  <Tab label="Interpretation" />
                  <Tab label="Recommendations" />
                  <Tab label="Sources" />
                </Tabs>
              </Box>

              <Box sx={{ p: "16px", overflowY: "auto", maxHeight: "340px" }}>
                {insightTab === 0 && (
                  <Typography sx={{ 
                    fontFamily: FONT, 
                    fontSize: "12px", 
                    fontWeight: 400, 
                    color: "#404552", 
                    lineHeight: 1.6
                  }}>
                    The predicted therapeutic targets for Type 2 Diabetes suggest a potential mechanism of action involving the modulation of insulin signaling pathways, particularly those regulated by JAK2 and DPP4.
                    <br /><br />
                    The involvement of JAK2, which is a key downstream effector of cytokine receptor signaling, implies that inhibiting this pathway may help mitigate elevated blood glucose and insulin resistance. The identification of GLP1R and SGLT2 as potential targets also hints at roles for incretin-related pathways in the pathogenesis of Type 2 Diabetes.
                    <br /><br />
                    These findings highlight the complexity of Type 2 Diabetes and the need for further investigation into the interplay between metabolic and immune signaling pathways.
                  </Typography>
                )}
                {insightTab === 1 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: "#1A1F26", lineHeight: "100%" }}>Recommendations</Typography>
                    {[
                      { target: "JAK2", status: "High", desc: "Best entry point for insulin signaling inhibition; may reduce glucose regulation." },
                      { target: "DPP4", status: "High", desc: "Well-validated target with existing gliptin class drugs; strong repurposing potential." },
                      { target: "GLP1R", status: "Medium", desc: "Incretin pathway modulation for glucose-dependent insulin secretion enhancement." },
                      { target: "SGLT2", status: "Medium", desc: "Renal glucose reabsorption target; proven clinical efficacy across multiple cytokine pathways." }
                    ].map((rec, i) => (
                      <Box key={i} sx={{ 
                        display: "flex", 
                        flexDirection: "column",
                        gap: "4px",
                        p: "10px 12px",
                        bgcolor: "#FAFCFF",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "8px",
                        width: "100%"
                      }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#1A1A26", lineHeight: "100%" }}>
                            {rec.target}
                          </Typography>
                          <Chip 
                            label={rec.status} 
                            size="small"
                            sx={{ 
                              bgcolor: rec.status === "High" ? "rgba(20,158,133,0.12)" : "rgba(217,140,26,0.12)", 
                              color: rec.status === "High" ? "#00BCD4" : "#D98C1A",
                              fontFamily: FONT,
                              fontSize: "10px",
                              fontWeight: 600,
                              height: "17px",
                              borderRadius: "4px",
                              "& .MuiChip-label": { px: "8px", py: "2px", lineHeight: "100%" }
                            }} 
                          />
                        </Box>
                        <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: "#4D5461", lineHeight: "100%" }}>
                          {rec.desc}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {insightTab === 2 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", pt: "12px" }}>
                    <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "14px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>References</Typography>
                    {[
                      { title: "JAK2 inhibition in Type 2 Diabetes: A systematic review", journal: "Nature Reviews Drug Discovery, 2023", doi: "DOI: 10.1038/nrd.2023.142" },
                      { title: "DPP4 inhibitors and cardiovascular outcomes in diabetic patients", journal: "The Lancet Diabetes & Endocrinology, 2022", doi: "DOI: 10.1016/S2213-8587(22)00156-2" },
                      { title: "GLP-1 receptor agonists: mechanisms and therapeutic potential", journal: "Cell Metabolism, 2023", doi: "DOI: 10.1016/j.cmet.2023.04.008" },
                      { title: "SGLT2 inhibitors in the management of Type 2 Diabetes", journal: "New England Journal of Medicine, 2022", doi: "DOI: 10.1056/NEJMra2203096" },
                      { title: "Insulin signaling pathways as drug targets for T2D", journal: "Pharmacological Reviews, 2023", doi: "DOI: 10.1124/pharmrev.122.000560" }
                    ].map((source, i) => (
                      <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "12px", fontWeight: 600, color: "#262E38", lineHeight: "100%" }}>
                          [{i + 1}] {source.title}
                        </Typography>
                        <Typography sx={{ fontFamily: "'Geist'", fontSize: "11px", fontWeight: 400, color: "#667080", lineHeight: "100%" }}>
                          {source.journal}
                        </Typography>
                        <Typography sx={{ fontFamily: "'Geist'", fontSize: "11px", fontWeight: 400, color: "#00BCD4", lineHeight: "100%", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>
                          {source.doi}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: "12px", mt: "16px" }}>
            <Button onClick={() => setShowBranchDialog(true)} variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>
              Branch
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>
              Rerun
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER, p: "6px 16px" }}>
              Export
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
      </Box>

      {/* SUB-GRAPH Accordion - accordion style matching TXKG */}
      <Box sx={{ p: "4px 0" }}>
        <Accordion
          expanded={expandedAccordion === "subgraph"}
          onChange={() => setExpandedAccordion(expandedAccordion === "subgraph" ? "" : "subgraph")}
          sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
            sx={{
              minHeight: "48px",
              p: "8px 16px",
              "&.Mui-expanded": { minHeight: "48px" },
              "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
              </Box>
              <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase" }}>
                SUBGRAPH
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "16px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
              Here is the generated knowledge graph for Type 2 Diabetes. This map illustrates the validated and predicted relationships between JAK2, drug molecules, associated pathways, and overlapping diseases based on TxKG relations:
            </Typography>
            <Box sx={{ borderRadius: "12px", overflow: "hidden", lineHeight: 0 }}>
              <svg viewBox="0 0 840 360" width="100%" style={{maxWidth: 840}} xmlns="http://www.w3.org/2000/svg">
                <rect width="840" height="360" fill="#0F172A" rx="12" />
                {Array.from({ length: 15 }, (_, c) => Array.from({ length: 13 }, (_, r) => (
                  <circle key={`d-${c}-${r}`} cx={c * 60} cy={r * 30} r="1" fill="white" opacity="0.07" />
                )))}
                {[[400,165,240,75],[400,165,500,60],[400,165,620,125],[400,165,140,175],[400,165,440,105],[400,165,220,265],[400,165,340,280],[400,165,110,255],[400,165,610,245],[400,165,500,275],[400,165,700,155],[400,165,680,295],[240,75,110,255],[240,75,610,245],[440,105,500,275],[140,175,220,265]].map(([x1,y1,x2,y2],i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(102,115,140,0.4)" strokeWidth="1.2" />
                ))}
                <circle cx="400" cy="165" r="26" fill="#1F2433" /><text x="400" y="200" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Type 2 Diabetes</text>
                <circle cx="240" cy="75" r="17" fill="#F28C33" /><text x="240" y="102" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">JAK2</text>
                <circle cx="500" cy="60" r="15" fill="#F28C33" /><text x="500" y="86" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">DPP4</text>
                <circle cx="620" cy="125" r="14" fill="#F28C33" /><text x="620" y="150" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">GLP1R</text>
                <circle cx="140" cy="175" r="14" fill="#F28C33" /><text x="140" y="200" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">SGLT2</text>
                <circle cx="440" cy="105" r="12" fill="#F28C33" /><text x="440" y="128" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">INSR</text>
                <circle cx="220" cy="265" r="15" fill="#8C4DBF" /><text x="220" y="291" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Metformin</text>
                <circle cx="340" cy="280" r="14" fill="#8C4DBF" /><text x="340" y="305" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Imatinib</text>
                <circle cx="110" cy="255" r="12" fill="#8C4DBF" /><text x="110" y="278" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Ruxolitinib</text>
                <circle cx="610" cy="245" r="15" fill="#149E99" /><text x="610" y="271" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">JAK-STAT</text>
                <circle cx="500" cy="275" r="13" fill="#149E99" /><text x="500" y="299" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Insulin Sig.</text>
                <circle cx="700" cy="155" r="11" fill="#F25966" /><text x="700" y="177" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Obesity</text>
                <circle cx="680" cy="295" r="12" fill="#F25966" /><text x="680" y="320" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="500">Type 2 Diabetes</text>
                <circle cx="24" cy="341" r="4" fill="#1F2433" /><text x="32" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Disease Hub</text>
                <circle cx="100" cy="341" r="4" fill="#F28C33" /><text x="108" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Protein</text>
                <circle cx="154" cy="341" r="4" fill="#149E99" /><text x="162" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Pathway</text>
                <circle cx="216" cy="341" r="4" fill="#8C4DBF" /><text x="224" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Compound</text>
                <circle cx="286" cy="341" r="4" fill="#F25966" /><text x="294" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Comorbidity</text>
              </svg>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: "16px", bgcolor: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: "8px", mt: "12px" }}>
              {[{label:"RELATIONSHIPS FOUND",value:"52",unit:"relations"},{label:"DRUG CANDIDATES",value:"15",unit:"candidates"},{label:"PATHWAY CONNECTIONS",value:"10",unit:"connections"}].map((stat,i,arr) => (
                <React.Fragment key={i}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{stat.label}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "20px", fontWeight: 700, color: "#0F172A", lineHeight: "26px" }}>
                      {stat.value} <Typography component="span" sx={{ fontSize: "14px", fontWeight: 400 }}>{stat.unit}</Typography>
                    </Typography>
                  </Box>
                  {i < arr.length - 1 && <Box sx={{ width: "1px", height: "40px", bgcolor: BORDER }} />}
                </React.Fragment>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
              {["Branch","Rerun","Export"].map(label => (
                <Button key={label} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: "#1E293B", bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", p: "10px 16px" }}>{label}</Button>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* METAPATH Accordion - accordion style matching TXKG */}
      <Box sx={{ p: "4px 0" }}>
        <Accordion
          expanded={expandedAccordion === "metapath"}
          onChange={() => setExpandedAccordion(expandedAccordion === "metapath" ? "" : "metapath")}
          sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined sx={{ color: "#94A3B8", width: 20, height: 20 }} />}
            sx={{
              minHeight: "48px",
              p: "8px 16px",
              "&.Mui-expanded": { minHeight: "48px" },
              "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
              </Box>
              <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase" }}>
                METAPATH ANALYSIS
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "16px" }}>
            <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827", mb: "16px" }}>TxKG — Meta-Path Analysis</Typography>

              {/* Stats Row */}
              <Box sx={{ 
                display: "flex",
                alignItems: "center",
                p: "12px 16px",
                gap: "32px",
                bgcolor: "#F9FAFB",
                border: `1px solid ${BORDER}`,
                borderRadius: "8px"
              }}>
                {[
                  { value: "12", label: "Paths" },
                  { value: "8", label: "Targets" },
                  { value: "5", label: "Pathways" },
                  { value: "1.5", label: "Avg/Target" },
                  { value: "24", label: "Nodes" },
                  { value: "38", label: "Edges" },
                  { value: "4", label: "Clusters" }
                ].map((stat, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Typography sx={{ 
                      fontFamily: "'Geist', sans-serif", 
                      fontSize: "16px", 
                      fontWeight: 700, 
                      color: "#111827",
                      lineHeight: "19px"
                    }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ 
                      fontFamily: "'Geist', sans-serif", 
                      fontSize: "11px", 
                      fontWeight: 400,
                      color: "#6B7280",
                      lineHeight: "13px"
                    }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Content Columns */}
              <Box sx={{ display: "flex", gap: "16px", mt: "16px" }}>
                {/* Target Prediction Scores */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Typography sx={{ 
                    fontFamily: "'Geist', sans-serif", 
                    fontSize: "13px", 
                    fontWeight: 600, 
                    color: "#111827",
                    lineHeight: "16px"
                  }}>
                    Target Prediction Scores
                  </Typography>
                  
                  {[
                    { name: "PPARG", desc: "Peroxisome proliferator-activated receptor gamma", score: "92" },
                    { name: "DPP4", desc: "Dipeptidyl peptidase-4", score: "87" },
                    { name: "GLP1R", desc: "Glucagon-like peptide-1 receptor", score: "79" },
                    { name: "SGLT2", desc: "Sodium-glucose co-transporter 2", score: "71" },
                    { name: "INSR", desc: "Insulin receptor", score: "65" }
                  ].map((target, i) => (
                    <Box key={i} sx={{ 
                      display: "flex", 
                      alignItems: "center",
                      p: "8px 10px",
                      gap: "8px",
                      borderBottom: `1px solid ${BORDER}`
                    }}>
                      <Typography sx={{ 
                        fontFamily: "'Geist', sans-serif", 
                        fontSize: "13px", 
                        fontWeight: 600, 
                        color: "#111827",
                        lineHeight: "16px"
                      }}>
                        {target.name}
                      </Typography>
                      <Typography sx={{ 
                        flex: 1,
                        fontFamily: "'Geist', sans-serif", 
                        fontSize: "11px", 
                        fontWeight: 400,
                        color: "#6B7280",
                        lineHeight: "13px"
                      }}>
                        {target.desc}
                      </Typography>
                      <Box sx={{ 
                        display: "flex",
                        alignItems: "center",
                        p: "3px 8px",
                        bgcolor: "#D1FAE5",
                        borderRadius: "8px"
                      }}>
                        <Typography sx={{ 
                          fontFamily: "'Geist', sans-serif", 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#059669",
                          lineHeight: "13px"
                        }}>
                          {target.score}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                {/* Meta-Path Traversals */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Typography sx={{ 
                    fontFamily: "'Geist', sans-serif", 
                    fontSize: "13px", 
                    fontWeight: 600, 
                    color: "#111827",
                    lineHeight: "16px"
                  }}>
                    Meta-Path Traversals
                  </Typography>
                  
                  {/* PPARG with expanded paths */}
                  <Box sx={{ 
                    display: "flex",
                    flexDirection: "column",
                    p: "10px 12px",
                    gap: "6px",
                    bgcolor: "#F9FAFB",
                    borderRadius: "8px"
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ 
                        fontFamily: "'Geist', sans-serif", 
                        fontSize: "13px", 
                        fontWeight: 600, 
                        color: "#111827",
                        lineHeight: "16px"
                      }}>
                        PPARG
                      </Typography>
                      <Box sx={{ 
                        display: "flex",
                        alignItems: "center",
                        p: "3px 8px",
                        bgcolor: "#00BCD4",
                        borderRadius: "8px"
                      }}>
                        <Typography sx={{ 
                          fontFamily: "'Geist', sans-serif", 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#FFFFFF",
                          lineHeight: "13px"
                        }}>
                          92
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>• T2D → PPARG</Typography>
                    <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>• T2D → Insulin resistance → PPARG</Typography>
                    <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "13px" }}>• T2D → Thiazolidinediones → PPARG</Typography>
                  </Box>

                  {/* Other targets */}
                  {[
                    { name: "DPP4", path: "T2D → GLP-1 → DPP4", score: "87" },
                    { name: "GLP1R", path: "T2D → Incretin → GLP1R", score: "79" },
                    { name: "SGLT2", path: "T2D → Glucose → SGLT2", score: "71" },
                    { name: "INSR", path: "T2D → Insulin sig. → INSR", score: "65" }
                  ].map((item, i) => (
                    <Box key={i} sx={{ 
                      display: "flex", 
                      alignItems: "center",
                      p: "6px 12px",
                      gap: "8px",
                      borderBottom: `1px solid ${BORDER}`
                    }}>
                      <Typography sx={{ 
                        fontFamily: "'Geist', sans-serif", 
                        fontSize: "12px", 
                        fontWeight: 500, 
                        color: "#111827",
                        lineHeight: "15px"
                      }}>
                        {item.name}
                      </Typography>
                      <Typography sx={{ 
                        flex: 1,
                        fontFamily: "'Geist', sans-serif", 
                        fontSize: "11px", 
                        fontWeight: 400,
                        color: "#6B7280",
                        lineHeight: "13px"
                      }}>
                        {item.path}
                      </Typography>
                      <Box sx={{ 
                        display: "flex",
                        alignItems: "center",
                        p: "3px 8px",
                        bgcolor: "#D1FAE5",
                        borderRadius: "8px"
                      }}>
                        <Typography sx={{ 
                          fontFamily: "'Geist', sans-serif", 
                          fontSize: "11px", 
                          fontWeight: 600, 
                          color: "#059669",
                          lineHeight: "13px"
                        }}>
                          {item.score}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: "10px", pt: "4px" }}>
                <Button sx={{ 
                  textTransform: "none", 
                  fontFamily: "'Geist', sans-serif", 
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1E293B", 
                  bgcolor: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  p: "10px 16px",
                  "&:hover": { bgcolor: "#F8FAFC" }
                }}>
                  Branch
                </Button>
                <Button sx={{ 
                  textTransform: "none", 
                  fontFamily: "'Geist', sans-serif", 
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1E293B", 
                  bgcolor: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  p: "10px 16px",
                  "&:hover": { bgcolor: "#F8FAFC" }
                }}>
                  Rerun
                </Button>
                <Button sx={{ 
                  textTransform: "none", 
                  fontFamily: "'Geist', sans-serif", 
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#333840", 
                  bgcolor: "#FFFFFF",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  p: "10px 16px",
                  "&:hover": { bgcolor: "#F8FAFC" }
                }}>
                  Export
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

      {/* Ready for Literature Mining */}
      <Box sx={{ border: "1.5px dashed rgba(0,188,212,0.6)", borderRadius: "12px", mt: "8px", bgcolor: "rgba(0,188,212,0.02)" }}>
      <div className="agent-message-row-bridge">
        <div className="agent-icon"></div>
        
        <div className="bridge-content">
          <h3 className="bridge-header">READY FOR LITERATURE MINING</h3>
          
          <p className="bridge-message">
            TxKG analysis is complete. Would you like to proceed to LitMinex with the recommended targets, or select specific targets from the identified list?
          </p>

          <div className="option-cards">
            {/* Card Recommended */}
            <div className="option-card">
              <h4 className="option-card-title">Proceed with Recommended Targets</h4>
              <p className="option-card-description">
                Run LitMinex on all 10 identified targets ranked by therapeutic relevance
              </p>
              <button 
                className="option-card-button primary"
                onClick={() => {
                  setActiveStep(1);
                  setWorkflowPhase("litminex-loading");
                }}
              >
                <span className="option-card-button-label">Use recommended targets</span>
              </button>
            </div>

            {/* Card Custom */}
            <div className="option-card">
              <h4 className="option-card-title">Select Custom Targets</h4>
              <p className="option-card-description">
                Choose specific targets from the list or enter your own for literature mining
              </p>
              <button 
                className="option-card-button secondary"
                onClick={() => setWorkflowPhase("target-selection")}
              >
                <span className="option-card-button-label">Select Targets</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </Box>
    </Box>
  );

  // Target Selection (Figma Image 4) - shows collapsed accordions + selection panel
  const renderTargetSelection = () => (
    <Box sx={{ p: "24px 40px 0 40px", bgcolor: GRAY_BG }}>
      {/* User Query Box - wider to match TxKG results */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
        <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "12px" }}>DR. PRIYA (YOU)</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px" }}>{query}</Typography>
        </Box>
      </Box>

      {/* TXKG Accordion - same real content as txkg-results */}
      <Box sx={{ p: "4px 0" }}>
        <Accordion
          expanded={expandedAccordion === "txkg"}
          onChange={() => setExpandedAccordion(expandedAccordion === "txkg" ? "" : "txkg")}
          sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
            sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
              </Box>
              <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase", letterSpacing: "0.05em" }}>TXKG</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "16px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
              I found 10 protein targets strongly associated with Type 2 Diabetes pathways. Here are the top candidates ranked by therapeutic relevance:
            </Typography>
            {/* Same two-column layout as txkg-results */}
            <Box sx={{ display: "flex", gap: "12px" }}>
              <Box sx={{ flex: "0 0 52%", minWidth: 0 }}>
                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                  <Box sx={{ display: "flex", bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                    {["UNIPROT ID","TARGET","SCORE"].map((h,i) => <Typography key={i} sx={{ flex: i===1?1:"0 0 100px", fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", textAlign: i===2?"right":"left" }}>{h}</Typography>)}
                  </Box>
                  {mockTargets.map((t,i) => (
                    <Box key={t.id} sx={{ display: "flex", p: "10px 12px", borderBottom: i<mockTargets.length-1?`1px solid ${BORDER}`:"none" }}>
                      <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEAL }}>{t.id}</Typography>
                      <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>{t.name}</Typography>
                      <Typography sx={{ flex: "0 0 100px", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textAlign: "right" }}>{t.score}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {/* Insights panel */}
              <Box sx={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
                <Box sx={{ bgcolor: GRAY_BG, p: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: INSIGHTS_HEADER }}>Insights</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "10px", color: TEXT_MUTED, mt: "2px" }}>AI-powered target recommendations and Q&A</Typography>
                </Box>
                <Box sx={{ borderBottom: `1px solid ${BORDER}`, px: "4px" }}>
                  <Tabs value={insightTab} onChange={(_,v) => setInsightTab(v)} TabIndicatorProps={{ style: { display: "none" } }}
                    sx={{ minHeight: "32px", "& .MuiTab-root": { minHeight: "28px", p: "4px 10px", textTransform: "none", fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: TEXT_MUTED, "&.Mui-selected": { color: ACTIVE_TAB } } }}>
                    <Tab label="Interpretation" /><Tab label="Recommendations" /><Tab label="Sources" />
                  </Tabs>
                </Box>
                <Box sx={{ p: "12px", maxHeight: "320px", overflowY: "auto" }}>
                  {insightTab === 0 && <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#404552", lineHeight: "160%" }}>The predicted therapeutic targets for Type 2 Diabetes suggest a potential mechanism of action involving the modulation of insulin signaling pathways, particularly those regulated by JAK2 and DPP4.</Typography>}
                  {insightTab === 1 && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[{target:"JAK2",status:"High",desc:"Best entry point for insulin signaling inhibition."},{target:"DPP4",status:"High",desc:"Well-validated with existing gliptin class drugs."},{target:"GLP1R",status:"Medium",desc:"Incretin pathway modulation for glucose-dependent insulin secretion."}].map((r,i) => (
                        <Box key={i} sx={{ p: "8px 10px", bgcolor: "#FAFCFF", border: `1px solid ${BORDER}`, borderRadius: "6px" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#1A1A26" }}>{r.target}</Typography>
                            <Chip label={r.status} size="small" sx={{ height: "16px", bgcolor: r.status==="High"?"rgba(20,158,133,0.12)":"rgba(217,140,26,0.12)", color: r.status==="High"?"#00BCD4":"#D98C1A", fontFamily: FONT, fontSize: "10px", fontWeight: 600, "& .MuiChip-label": { px: "6px" } }} />
                          </Box>
                          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#4D5461", mt: "2px" }}>{r.desc}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {insightTab === 2 && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[{title:"JAK2 inhibition in Type 2 Diabetes",j:"Nature Reviews Drug Discovery, 2023",doi:"DOI: 10.1038/nrd.2023.142"},{title:"DPP4 inhibitors and cardiovascular outcomes",j:"The Lancet, 2022",doi:"DOI: 10.1016/S2213-8587(22)00156-2"}].map((s,i) => (
                        <Box key={i}>
                          <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "11px", fontWeight: 600, color: "#262E38" }}>[{i+1}] {s.title}</Typography>
                          <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "11px", color: "#667080" }}>{s.j}</Typography>
                          <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "11px", color: "#00BCD4", cursor: "pointer" }}>{s.doi}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
              {["Branch","Rerun","Export"].map(l => <Button key={l} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px", py: "6px" }}>{l}</Button>)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* SUB-GRAPH Accordion - same real content */}
      <Box sx={{ p: "4px 0" }}>
        <Accordion
          expanded={expandedAccordion === "subgraph"}
          onChange={() => setExpandedAccordion(expandedAccordion === "subgraph" ? "" : "subgraph")}
          sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
            sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
              </Box>
              <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase", letterSpacing: "0.05em" }}>SUBGRAPH</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "16px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px", mb: "12px" }}>
              Here is the generated knowledge graph for Type 2 Diabetes:
            </Typography>
            <Box sx={{ borderRadius: "12px", overflow: "hidden", lineHeight: 0 }}>
              <svg viewBox="0 0 840 360" width="100%" style={{maxWidth:840}} xmlns="http://www.w3.org/2000/svg">
                <rect width="840" height="360" fill="#0F172A" rx="12" />
                {[[400,165,240,75],[400,165,500,60],[400,165,620,125],[400,165,140,175],[400,165,440,105],[400,165,220,265],[400,165,340,280],[400,165,110,255],[400,165,610,245],[400,165,500,275],[400,165,700,155],[400,165,680,295],[240,75,110,255],[240,75,610,245],[440,105,500,275],[140,175,220,265]].map(([x1,y1,x2,y2],i)=>(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(102,115,140,0.4)" strokeWidth="1.2"/>))}
                <circle cx="400" cy="165" r="26" fill="#1F2433"/><text x="400" y="200" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">Type 2 Diabetes</text>
                <circle cx="240" cy="75" r="17" fill="#F28C33"/><text x="240" y="102" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">JAK2</text>
                <circle cx="500" cy="60" r="15" fill="#F28C33"/><text x="500" y="86" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">DPP4</text>
                <circle cx="620" cy="125" r="14" fill="#F28C33"/><text x="620" y="150" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">GLP1R</text>
                <circle cx="140" cy="175" r="14" fill="#F28C33"/><text x="140" y="200" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">SGLT2</text>
                <circle cx="220" cy="265" r="15" fill="#8C4DBF"/><text x="220" y="291" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">Metformin</text>
                <circle cx="610" cy="245" r="15" fill="#149E99"/><text x="610" y="271" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">JAK-STAT</text>
                <circle cx="700" cy="155" r="11" fill="#F25966"/><text x="700" y="177" textAnchor="middle" fill="#D1D9E6" fontSize="9" fontFamily="Geist,sans-serif">Obesity</text>
                <circle cx="24" cy="341" r="4" fill="#1F2433"/><text x="32" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Disease Hub</text>
                <circle cx="100" cy="341" r="4" fill="#F28C33"/><text x="108" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Protein</text>
                <circle cx="154" cy="341" r="4" fill="#149E99"/><text x="162" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Pathway</text>
                <circle cx="216" cy="341" r="4" fill="#8C4DBF"/><text x="224" y="345" fill="#B3BAC7" fontSize="9" fontFamily="Geist,sans-serif" fontWeight="600">Compound</text>
              </svg>
            </Box>
            {/* Stats card - Relationships Found / Drug Candidates / Pathway Connections */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: "16px", bgcolor: GRAY_BG, border: `1px solid ${BORDER}`, borderRadius: "8px", mt: "12px" }}>
              {[
                { label: "RELATIONSHIPS FOUND", value: "52", unit: "relations" },
                { label: "DRUG CANDIDATES", value: "15", unit: "candidates" },
                { label: "PATHWAY CONNECTIONS", value: "10", unit: "connections" }
              ].map((stat, i, arr) => (
                <React.Fragment key={i}>
                  <Box>
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{stat.label}</Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: "20px", fontWeight: 700, color: TEXT_DARK }}>
                      {stat.value} <Typography component="span" sx={{ fontSize: "13px", fontWeight: 400 }}>{stat.unit}</Typography>
                    </Typography>
                  </Box>
                  {i < arr.length - 1 && <Box sx={{ width: "1px", height: "40px", bgcolor: BORDER }} />}
                </React.Fragment>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
              {["Branch","Rerun","Export"].map(l => <Button key={l} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px", py: "6px" }}>{l}</Button>)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* METAPATH Accordion - same real content */}
      <Box sx={{ p: "4px 0" }}>
        <Accordion
          expanded={expandedAccordion === "metapath"}
          onChange={() => setExpandedAccordion(expandedAccordion === "metapath" ? "" : "metapath")}
          sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px !important", "&:before": { display: "none" }, boxShadow: "none", bgcolor: "#FFFFFF" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreOutlined sx={{ color: "#6B7280" }} />}
            sx={{ minHeight: "48px", p: "8px 16px", "&.Mui-expanded": { minHeight: "48px" }, "& .MuiAccordionSummary-content": { margin: 0, alignItems: "center" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
              </Box>
              <Typography sx={{ flex: 1, fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 700, color: "#00BCD4", textTransform: "uppercase", letterSpacing: "0.05em" }}>METAPATH ANALYSIS</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: "16px" }}>
            <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827", mb: "12px" }}>TxKG — Meta-Path Analysis</Typography>
            {/* Stats row: 12 Paths, 8 Targets, 5 Pathways, 1.5 Avg/Target, 24 Nodes, 38 Edges, 4 Clusters */}
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "24px", p: "12px 16px", bgcolor: "#F9FAFB", border: `1px solid ${BORDER}`, borderRadius: "8px", mb: "16px" }}>
              {[{v:"12",l:"Paths"},{v:"8",l:"Targets"},{v:"5",l:"Pathways"},{v:"1.5",l:"Avg/Target"},{v:"24",l:"Nodes"},{v:"38",l:"Edges"},{v:"4",l:"Clusters"}].map((s,i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827" }}>{s.v}</Typography>
                  <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "11px", color: "#6B7280" }}>{s.l}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: "16px" }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontFamily: "'Geist',sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827", mb: "8px" }}>Target Prediction Scores</Typography>
                {[{name:"PPARG",desc:"Peroxisome proliferator-activated receptor gamma",score:"92"},{name:"DPP4",desc:"Dipeptidyl peptidase-4",score:"87"},{name:"GLP1R",desc:"Glucagon-like peptide-1 receptor",score:"79"},{name:"SGLT2",desc:"Sodium-glucose co-transporter 2",score:"71"},{name:"INSR",desc:"Insulin receptor",score:"65"}].map((t,i) => (
                  <Box key={i} sx={{ display:"flex", alignItems:"center", p:"8px 10px", gap:"8px", borderBottom:`1px solid ${BORDER}` }}>
                    <Typography sx={{ fontFamily:"'Geist',sans-serif", fontSize:"13px", fontWeight:600, color:"#111827", minWidth:48 }}>{t.name}</Typography>
                    <Typography sx={{ flex:1, fontFamily:"'Geist',sans-serif", fontSize:"11px", color:"#6B7280" }}>{t.desc}</Typography>
                    <Box sx={{ p:"3px 8px", bgcolor:"#D1FAE5", borderRadius:"8px" }}><Typography sx={{ fontFamily:"'Geist',sans-serif", fontSize:"11px", fontWeight:600, color:"#059669" }}>{t.score}</Typography></Box>
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontFamily:"'Geist',sans-serif", fontSize:"13px", fontWeight:600, color:"#111827", mb:"8px" }}>Meta-Path Traversals</Typography>
                {[{n:"PPARG",p:"T2D → PPARG / T2D → Insulin resistance → PPARG",s:"92",teal:true},{n:"DPP4",p:"T2D → GLP-1 → DPP4",s:"87"},{n:"GLP1R",p:"T2D → Incretin → GLP1R",s:"79"},{n:"SGLT2",p:"T2D → Glucose → SGLT2",s:"71"},{n:"INSR",p:"T2D → Insulin sig. → INSR",s:"65"}].map((item,i) => (
                  <Box key={i} sx={{ display:"flex", alignItems:"center", p:"6px 10px", gap:"8px", borderBottom:`1px solid ${BORDER}` }}>
                    <Typography sx={{ fontFamily:"'Geist',sans-serif", fontSize:"12px", fontWeight:500, color:"#111827", minWidth:44 }}>{item.n}</Typography>
                    <Typography sx={{ flex:1, fontFamily:"'Geist',sans-serif", fontSize:"11px", color:"#6B7280" }}>{item.p}</Typography>
                    <Box sx={{ p:"3px 8px", bgcolor:item.teal?"#00BCD4":"#D1FAE5", borderRadius:"8px" }}><Typography sx={{ fontFamily:"'Geist',sans-serif", fontSize:"11px", fontWeight:600, color:item.teal?"#FFFFFF":"#059669" }}>{item.s}</Typography></Box>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: "12px", mt: "12px" }}>
              {["Branch","Export"].map(l => <Button key={l} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px", py: "6px" }}>{l}</Button>)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Target Selection Panel */}
      <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "20px", mb: "8px" }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK, mb: "4px" }}>
          Select Targets for LitMinex
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "16px" }}>
          Choose from the identified targets or add your own
        </Typography>

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
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: selectedTargets.includes(target.id) ? 600 : 400, color: TEXT_DARK }}>
                {target.name}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: selectedTargets.includes(target.id) ? TEAL : TEXT_MUTED, fontWeight: selectedTargets.includes(target.id) ? 600 : 400 }}>
              {target.score}
            </Typography>
          </Box>
        ))}

        {/* Add Custom Target */}
        <Box sx={{ mt: "12px", mb: "16px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "8px" }}>Add custom target</Typography>
          <TextField
            placeholder="Add custom target (e.g. EGFR, VEGFR2...)"
            fullWidth
            size="small"
            sx={{ "& .MuiOutlinedInput-root": { fontFamily: FONT, fontSize: "13px", borderRadius: "8px" } }}
            InputProps={{ endAdornment: (
              <IconButton size="small" sx={{ bgcolor: TEAL, borderRadius: "6px", p: "6px", "&:hover": { bgcolor: "#089B98" } }}>
                <AddOutlined sx={{ fontSize: 16, color: "#FFFFFF" }} />
              </IconButton>
            )}}
          />
        </Box>

        {/* Footer actions */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
            {selectedTargets.length} targets selected
          </Typography>
          <Box sx={{ display: "flex", gap: "12px" }}>
            <Button onClick={() => setWorkflowPhase("txkg-results")} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
              Cancel
            </Button>
            <Button
              disabled={selectedTargets.length === 0}
              onClick={() => { setActiveStep(1); setWorkflowPhase("litminex-loading"); }}
              sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600, px: "20px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" }, "&.Mui-disabled": { bgcolor: "#E2E8F0" } }}
            >
              Proceed to LitMinex
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderLitMinexLoading = () => (
    <Box sx={{ p: "24px 16px 16px 16px", bgcolor: GRAY_BG }}>
      {/* User Query Box */}
      <Box sx={{ 
        bgcolor: USER_MSG_BG, 
        border: `1px solid ${BORDER}`, 
        borderRadius: "12px", 
        p: "16px", 
        mb: "8px",
        maxWidth: "680px",
        width: "100%",
        gap: "12px",
        marginLeft: "auto"
      }}>
        <Typography sx={{ 
          fontFamily: FONT, 
          fontSize: "11px", 
          fontWeight: 700, 
          color: TEAL, 
          textTransform: "uppercase", 
          letterSpacing: "0.5px", 
          mb: "12px" 
        }}>
          DR. PRIYA (YOU)
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 400, color: TEXT_DARK, lineHeight: "22px" }}>
          Mine literature for Type 2 Diabetes drug targets with confidence scoring
        </Typography>
      </Box>

      {/* Loading Agent Card */}
      <Box sx={{ 
        bgcolor: "#FFFFFF", 
        border: `1px solid ${BORDER}`, 
        borderRadius: "12px", 
        p: "16px",
        width: "100%"
      }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ 
              fontFamily: FONT, 
              fontSize: "13px", 
              fontWeight: 700, 
              color: TEXT_DARK, 
              mb: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              INOVAPATH LITMINEX AGENT
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: TEAL,
                  animation: "dot-pulse 1.4s ease-in-out infinite",
                  "@keyframes dot-pulse": {
                    "0%, 80%, 100%": { opacity: 0.3 },
                    "40%": { opacity: 1 }
                  }
                }} />
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: TEAL,
                  animation: "dot-pulse 1.4s ease-in-out 0.2s infinite",
                  "@keyframes dot-pulse": {
                    "0%, 80%, 100%": { opacity: 0.3 },
                    "40%": { opacity: 1 }
                  }
                }} />
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: TEAL,
                  animation: "dot-pulse 1.4s ease-in-out 0.4s infinite",
                  "@keyframes dot-pulse": {
                    "0%, 80%, 100%": { opacity: 0.3 },
                    "40%": { opacity: 1 }
                  }
                }} />
              </Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                Scanning PubMed and clinical databases for target literature...
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // Agent avatar: Figma spec — 30×30px, radius 8px, bg #F0FDF9, border 1px #00BCD4, sparkle 14×14
  const AgentHeader = ({ label }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: "12px", mb: "16px" }}>
      <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "#F0FDF9", border: "1px solid #00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4"/></svg>
      </Box>
      <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
    </Box>
  );

  const renderLitMinexResults = () => {
    const confidenceColor = (conf) => {
      const n = parseInt(conf);
      if (n >= 95) return { bg: "#D1FAE5", text: "#059669" };
      if (n >= 85) return { bg: "#FEF9C3", text: "#854D0E" };
      if (n >= 75) return { bg: "#FEF3C7", text: "#B45309" };
      return { bg: "#FEE2E2", text: "#B91C1C" };
    };
    return (
    <Box sx={{ p: "24px 40px 40px 40px", bgcolor: GRAY_BG }}>
      {(() => {
        const conversation = [
          { role: "user", text: "Mine literature for Type 2 Diabetes drug targets with confidence scoring" },
          ...chatMessages
        ];

        return conversation.map((msg, i) => (
          msg.role === "user" ? (
            <Box key={`${msg.role}-${i}`} sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
              <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", mb: "8px" }}>DR. PRIYA (YOU)</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>{msg.text}</Typography>
              </Box>
            </Box>
          ) : (
            <Box key={`${msg.role}-${i}`} sx={{ p: "8px 0" }}>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "20px" }}>
                <AgentHeader label="INOVAPATH LITMINEX AGENT" />
                {msg.articleCard && (
                  <Box sx={{ display: "flex", alignItems: "center", bgcolor: GRAY_BG, border: `1px solid ${BORDER}`, borderRadius: "8px", p: "12px 16px", mb: "12px", gap: "12px" }}>
                    <Typography sx={{ fontSize: "20px", lineHeight: 1 }}>📄</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.articleCard.title}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>{msg.articleCard.author}&nbsp;&nbsp;{msg.articleCard.year}</Typography>
                    </Box>
                    <IconButton size="small" sx={{ p: "2px" }}><CloseOutlined sx={{ fontSize: 14, color: TEXT_MUTED }} /></IconButton>
                  </Box>
                )}
                <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, lineHeight: "22px" }}>{msg.text}</Typography>
              </Box>
            </Box>
          )
        ));
      })()}

      {/* Agent message row: padding 8px top/bottom, Fill 1120px */}
      <Box sx={{ p: "8px 0" }}>
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "20px" }}>
          <AgentHeader label="INOVAPATH LITMINEX AGENT" />
          <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, mb: "16px" }}>
            Literature mining complete. Found 124 articles across PubMed and clinical databases. Results ranked by confidence score with keyword extraction.
          </Typography>

          {/* content-columns: horizontal, Fill 1088px, gap 16px */}
          <Box sx={{ display: "flex", gap: "16px" }}>
            {/* left-col: Fixed 700px, gap 12px */}
            <Box sx={{ width: "700px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              <Box sx={{ borderLeft: `3px solid ${TEAL}`, pl: "12px" }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK, mb: "8px" }}>Results - 124 articles found</Typography>
                {/* Table header */}
                <Box sx={{ display: "grid", gridTemplateColumns: "28px 32px 1fr 60px 120px 140px 36px", gap: "8px", px: "8px", py: "8px", borderBottom: `1px solid ${BORDER}` }}>
                  <Box />
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>#</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Title</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Year</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Confidence Score</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Found Keywords</Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>Preview</Typography>
                </Box>
                {litMinexResults.map((article, idx) => {
                  const cc = confidenceColor(article.confidence);
                  return (
                    <Box key={article.id} sx={{ display: "grid", gridTemplateColumns: "28px 32px 1fr 60px 120px 140px 36px", gap: "8px", px: "8px", py: "10px", borderBottom: `1px solid ${BORDER}`, bgcolor: idx === 0 ? "#F0FDFC" : "#FFFFFF", alignItems: "center" }}>
                      <Checkbox size="small" checked={idx === 0} sx={{ p: 0, color: BORDER, "&.Mui-checked": { color: TEAL } }} />
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>{idx + 1}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</Typography>
                      <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>{article.year}</Typography>
                      <Box sx={{ bgcolor: cc.bg, borderRadius: "6px", p: "3px 8px", textAlign: "center" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: cc.text }}>{article.confidence}</Typography>
                      </Box>
                      <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.keywords}</Typography>
                      <IconButton size="small" onClick={() => { setSelectedArticle(article); setShowArticleDetail(true); }}>
                        <VisibilityOutlined sx={{ fontSize: 16, color: TEAL }} />
                      </IconButton>
                    </Box>
                  );
                })}
                {/* Pagination */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: "12px", px: "8px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {["‹", "1", "2", "3", "...", "12", "›"].map((p, i) => (
                      <Box key={i} sx={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", bgcolor: p === "1" ? TEAL : "transparent", border: p === "1" ? "none" : `1px solid ${BORDER}`, cursor: "pointer" }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: p === "1" ? "#FFFFFF" : TEXT_MUTED }}>{p}</Typography>
                      </Box>
                    ))}
                    <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, ml: "8px" }}>Showing 1-10 of 47 articles</Typography>
                  </Box>
                </Box>
              </Box>
              {/* Branch / Rerun / Export */}
              <Box sx={{ display: "flex", gap: "12px" }}>
                {["Branch", "Rerun", "Export"].map(label => (
                  <Button key={label} sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px", py: "8px" }}>{label}</Button>
                ))}
              </Box>
            </Box>

            {/* ai-insights: Fill 372px, Fixed 605px, border #E2E8F0, padding 16px, gap 16px */}
            <Box sx={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: "8px", p: "16px", display: "flex", flexDirection: "column", gap: "16px", height: "605px", overflowY: "auto" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>Insights</Typography>
              {litMinexResults[0] && (
                /* novelty-card: bg #F9FAFB, border #00BCD4 at 40%, padding 12px, gap 8px */
                <Box sx={{ bgcolor: "#F9FAFB", border: "1px solid rgba(0,194,181,0.4)", borderRadius: "8px", p: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", fontWeight: 600, color: "#00BCD4", lineHeight: "100%" }}>Article Relevance</Typography>
                  <Typography sx={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 400, color: "#6B7280", lineHeight: "100%" }}>
                    This article demonstrates strong evidence for Metformin-JAK2 interaction with direct insulin signaling pathway involvement and therapeutic potential.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
  };

  // Article Detail Side Panel (Figma exact design)
  const ArticleDetailPanel = () => {
    if (!showArticleDetail || !selectedArticle) return null;
    const keywords = selectedArticle.keywords
      ? selectedArticle.keywords.split(', ').map(k => k.trim())
      : [];

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
          {/* Close */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton size="small" onClick={() => setShowArticleDetail(false)} sx={{ color: "#6B7280" }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Typography sx={{ fontFamily: FONT, fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: "28px", mt: "-8px" }}>
            Article Detail
          </Typography>

          {/* Article Title */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              ARTICLE TITLE
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: "22px" }}>
              {selectedArticle.title}
            </Typography>
          </Box>

          {/* Authors + Year */}
          <Box sx={{ display: "flex", gap: "40px" }}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Authors</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>{selectedArticle.author || "Chen, S. et al."}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Year</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>{selectedArticle.year}</Typography>
            </Box>
          </Box>

          {/* Abstract */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              ABSTRACT
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              This study investigates the repurposing potential of Metformin for JAK2-mediated insulin resistance pathways. Our findings suggest that Metformin can modulate JAK2 signaling to improve glucose uptake and reduce hyperglycemia in Type 2 Diabetes patients.
            </Typography>
          </Box>

          {/* Keywords */}
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

          {/* PMC Link */}
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              PMC LINK
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEAL, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>
              ↗ View on PubMed Central
            </Typography>
          </Box>

          {/* Buttons */}
          <Button fullWidth sx={{ bgcolor: "#FFFFFF", color: TEAL, border: `1.5px solid ${TEAL}`, textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, p: "12px 24px", borderRadius: "8px", "&:hover": { bgcolor: "#F0FDFC" } }}>
            Chat with Article
          </Button>
          <Button fullWidth sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, p: "12px 24px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" } }}>
            Save Article
          </Button>
        </Box>
      </Box>
    );
  };

  const renderCurateXLoading = () => {
    const curatexQuery = chatMessages.length > 0
      ? chatMessages.filter(m => m.role === "user").slice(-1)[0]?.text
      : "Generate a target candidate profile for JAK2.";
    return (
    <Box sx={{ p: "24px 40px 40px 40px", bgcolor: GRAY_BG }}>
      {/* User message */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
        <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", mb: "8px" }}>DR. PRIYA (YOU)</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>{curatexQuery}</Typography>
        </Box>
      </Box>

      {/* Agent loading card with progress bar and steps */}
      <Box sx={{ p: "8px 0" }}>
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "24px" }}>
          <AgentHeader label="INOVAPATH CURATEX AGENT" />
          <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_DARK, mb: "20px" }}>
            Searching for candidate compounds matching your JAK2 Target Profile...
          </Typography>

          {/* Progress bar */}
          <Box sx={{ bgcolor: "#F1F5F9", borderRadius: "4px", height: "8px", mb: "20px", overflow: "hidden" }}>
            <Box sx={{ bgcolor: TEAL, height: "100%", width: "40%", borderRadius: "4px",
              animation: "progress-fill 2s ease-in-out forwards",
              "@keyframes progress-fill": { from: { width: "10%" }, to: { width: "65%" } }
            }} />
          </Box>

          {/* Step indicators */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Analyzing target profile parameters...", done: true },
              { label: "Scanning compound databases...", done: true },
              { label: "Matching candidates against criteria...", done: false }
            ].map((step, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {step.done ? (
                  <Typography sx={{ fontSize: "14px", color: TEAL, lineHeight: 1 }}>&#10003;</Typography>
                ) : (
                  <Box sx={{ width: 14, height: 14, border: `2px solid ${TEAL}`, borderTopColor: "transparent", borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } }
                  }} />
                )}
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: step.done ? TEAL : TEXT_DARK }}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
  };

  const renderCurateXProfile = () => (
    <Box sx={{ p: "24px 40px 40px 40px", bgcolor: GRAY_BG }}>
      {/* Right-aligned user bubble */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
        <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>DR. PRIYA (YOU)</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>
            {profileEditMode ? "Please generate a Target Candidate Profile for JAK2." : "Generate a target candidate profile for JAK2."}
          </Typography>
        </Box>
      </Box>

      {/* Agent card */}
      <Box sx={{ p: "8px 0" }}>
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "24px" }}>
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, mb: "16px" }}>
            I've generated a Target Product Profile for JAK2. Review and adjust the parameters below, then submit to find matching candidates.
          </Typography>

          <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", p: "20px" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "16px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK }}>
                Target Product Profile - JAK2
              </Typography>
            </Box>
            
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, mb: "20px" }}>
              {profileEditMode 
                ? "Editing mode — modify values below, then save changes"
                : "Pre-filled parameters for repurposing candidate search"}
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "16px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Property
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Target Criterion
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Weight
              </Typography>

              {Object.entries(profileData).map(([key, value]) => (
                <React.Fragment key={key}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, textTransform: "capitalize" }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  {profileEditMode ? (
                    <TextField 
                      value={value}
                      onChange={(e) => setProfileData({ ...profileData, [key]: e.target.value })}
                      size="small"
                      fullWidth
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          fontFamily: FONT,
                          fontSize: "13px",
                          bgcolor: "#FFFFFF"
                        }
                      }}
                    />
                  ) : (
                    <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                      {value}
                    </Typography>
                  )}
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
                    {profileEditMode ? "15%" : ""}
                  </Typography>
                  {profileEditMode && (
                    <IconButton size="small" sx={{ gridColumn: "4 / 5" }}>
                      <DeleteOutlineOutlined sx={{ fontSize: 18, color: TEXT_MUTED }} />
                    </IconButton>
                  )}
                </React.Fragment>
              ))}
            </Box>

            {profileEditMode && (
              <Button
                startIcon={<AddOutlined />}
                sx={{ textTransform: "none", fontFamily: FONT, fontSize: "12px", color: TEAL, mt: "12px" }}
              >
                Add Parameter
              </Button>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: "12px", mt: "20px" }}>
            {profileEditMode ? (
              <>
                <Button 
                  variant="contained"
                  onClick={() => setProfileEditMode(false)}
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
                  Save Changes
                </Button>
                <Button 
                  variant="outlined"
                  onClick={() => setProfileEditMode(false)}
                  sx={{ 
                    textTransform: "none",
                    fontFamily: FONT,
                    fontSize: "13px",
                    color: TEXT_DARK,
                    borderColor: BORDER
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="contained"
                  onClick={() => setWorkflowPhase("curatex-submitted")}
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
                  Submit Profile
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setProfileEditMode(true)}
                  sx={{ textTransform: "none", fontFamily: FONT, fontSize: "12px", color: TEAL, borderColor: BORDER }}
                >
                  Edit Values
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderCurateXResults = () => (
    <Box sx={{ p: "24px 40px 40px 40px", bgcolor: GRAY_BG }}>
      {/* Right-aligned user bubble */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: "8px 0" }}>
        <Box sx={{ bgcolor: USER_MSG_BG, border: `1px solid ${BORDER}`, borderRadius: "12px", p: "16px", maxWidth: "680px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.5px", mb: "8px" }}>DR. PRIYA (YOU)</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: TEXT_DARK, lineHeight: "22px" }}>Submit Profile</Typography>
        </Box>
      </Box>

      {/* Agent card */}
      <Box sx={{ p: "8px 0" }}>
        <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "12px", p: "24px" }}>
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, mb: "20px" }}>
            Profile submitted. Scoring 124 compounds against your JAK2 target product profile. Here are the top candidates:
          </Typography>

          {/* Results Table */}
          <Box sx={{ bgcolor: "#FFFFFF", borderRadius: "8px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            {/* Table Header */}
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: "60px 1fr 2fr 1fr",
              gap: "16px",
              px: "16px",
              py: "12px",
              bgcolor: GRAY_BG,
              borderBottom: `1px solid ${BORDER}`
            }}>
              <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>RANK</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>COMPOUND</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>MATCHED PROPERTIES</Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase" }}>MISMATCHED</Typography>
            </Box>

            {/* Table Rows */}
            {curateXResults.map((compound, index) => (
              <Box 
                key={compound.rank}
                sx={{ 
                  display: "grid", 
                  gridTemplateColumns: "60px 1fr 2fr 1fr",
                  gap: "16px",
                  px: "16px",
                  py: "14px",
                  borderBottom: index < curateXResults.length - 1 ? `1px solid ${BORDER}` : "none",
                  bgcolor: index === 0 ? "#F0FDFC" : "#FFFFFF",
                  "&:hover": { bgcolor: "#F8FAFC", cursor: "pointer" },
                  alignItems: "center"
                }}
                onClick={() => {
                  setSelectedCompound(compound);
                  setShowCompoundDetail(true);
                }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: TEXT_DARK }}>{compound.rank}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEAL }}>{compound.name}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_DARK }}>{compound.matchedProps}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#EF4444" }}>{compound.mismatchedProps}</Typography>
              </Box>
            ))}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: "16px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
              Showing 1-6 of 124 compounds
            </Typography>
          </Box>

          {/* Recommendation */}
          <Box sx={{ mt: "20px", p: "16px", bgcolor: "#FEF3C7", borderRadius: "8px", border: "1px solid #FCD34D" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#78350F", mb: "4px" }}>
              Recommendation
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#92400E" }}>
              Metformin and Pioglitazone are the strongest candidates. Both match on molecular weight, route of administration, and half-life. Metformin scores highest due to superior bioavailability alignment. Recommend carrying both forward to screening.
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: "12px", mt: "20px" }}>
            <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER }}>
              Branch
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, borderColor: BORDER }}>
              Rerun
            </Button>
            <Button 
              variant="contained"
              onClick={() => {
                setActiveStep(3);
                setWorkflowPhase("screensuite-loading");
              }}
              sx={{ 
                bgcolor: TEAL,
                color: "#FFFFFF",
                textTransform: "none",
                fontFamily: FONT,
                fontSize: "13px",
                fontWeight: 600,
                ml: "auto",
                "&:hover": { bgcolor: "#089B98" }
              }}
            >
              Select for Screening
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

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
    if (["txkg-loading", "txkg-results", "target-selection"].includes(workflowPhase)) {
      return (
        <TXKGPhase
          workflowPhase={workflowPhase}
          query={query}
          expandedAccordion={expandedAccordion}
          setExpandedAccordion={setExpandedAccordion}
          insightTab={insightTab}
          setInsightTab={setInsightTab}
          selectedTargets={selectedTargets}
          setSelectedTargets={setSelectedTargets}
          setWorkflowPhase={setWorkflowPhase}
          setActiveStep={setActiveStep}
          setShowBranchDialog={setShowBranchDialog}
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
          setSelectedCompound={setSelectedCompound}
          setShowCompoundDetail={setShowCompoundDetail}
          setActiveStep={setActiveStep}
        />
      );
    }
    if (workflowPhase.startsWith("screensuite")) {
      return <ScreeningSuitePhase workflowPhase={workflowPhase} />;
    }
    if (workflowPhase.startsWith("novelty")) {
      return <NoveltySearchPhase workflowPhase={workflowPhase} />;
    }
    return (
      <Box sx={{ flex: 1, p: "24px" }}>
        <Typography>Phase: {workflowPhase}</Typography>
      </Box>
    );
  };

  const METFORMIN_ARTICLE_CARD = {
    title: "Metformin repurposing for JAK2-mediated insulin resistance...",
    author: "Chen, S. et al.",
    year: "2024"
  };

  const handleChatSubmit = () => {
    if (!chatInputValue.trim()) return;
    const userMsg = { role: "user", text: chatInputValue.trim() };
    const lc = chatInputValue.toLowerCase();

    // ScreenSuite hands the conversation to NovSearch when the next request
    // asks for patent or novelty analysis.
    // The module the message was typed into — recorded before any hand-off, so
    // the message stays attached to the step the user was actually on.
    const originKey = session.activeKey;

    if (
      workflowPhase.startsWith("screensuite") &&
      (lc.includes("patent") || lc.includes("novelty"))
    ) {
      // This branch used to return without recording userMsg, so the message
      // that triggered the hand-off disappeared from the thread.
      appendMessages([userMsg], originKey);
      setChatInputValue("");
      session.activateModule("novsearch", { phase: "novelty-results" });
      return;
    }

    // Navigate to CurateX when user signals they're done with LitMineX chat
    if (lc.includes("target candidate profile") || lc.includes("done with the chat") || (lc.includes("generate") && lc.includes("jak2"))) {
      appendMessages([userMsg], originKey);
      setChatInputValue("");
      setTimeout(() => {
        session.activateModule("curatex", { phase: "curatex-loading" });
      }, 400);
      return;
    }
    let agentMsg;
    if (lc.includes("metformin") || lc.includes("modulate")) {
      agentMsg = { role: "agent", articleCard: METFORMIN_ARTICLE_CARD, text: "Based on this article, Metformin activates AMPK which suppresses JAK2 phosphorylation at Tyr1007/1008, reducing downstream STAT3 activation. [1] This restores insulin receptor substrate-1 (IRS-1) signaling, improving glucose uptake. The authors demonstrate this through both in-vitro kinase assays and mouse model studies (Fig. 3, Table 2). [1]" };
    } else if (lc.includes("limitation")) {
      agentMsg = { role: "agent", text: "The authors note three main limitations: (1) the mouse model used does not fully recapitulate human JAK2 V617F mutations, (2) long-term effects of Metformin on JAK2-STAT signaling remain unstudied, and (3) dosage optimization for the dual AMPK/JAK2 pathway was not explored. [Chen et al., Discussion, p.12]" };
    } else {
      agentMsg = { role: "agent", text: "Based on the literature analysis, the JAK2 pathway shows strong therapeutic potential for Type 2 Diabetes. Multiple studies confirm AMPK-mediated modulation of JAK-STAT signaling." };
    }
    appendMessages([userMsg, agentMsg], originKey);
    setChatInputValue("");
  };

  // Persistent chat input bar
  const ChatInputBar = () => (
    <Box sx={{ 
      p: "12px 16px",
      bgcolor: GRAY_BG,
      borderTop: `1px solid ${BORDER}`,
      flexShrink: 0
    }}>
      <Box sx={{
        bgcolor: "#FFFFFF",
        border: "1.5px solid #E2E8F0",
        borderRadius: "16px",
        p: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <TextField
          value={chatInputValue}
          onChange={(e) => setChatInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
          placeholder="Type @ for modules or ask a research question..."
          fullWidth
          multiline
          maxRows={3}
          variant="standard"
          sx={{
            "& .MuiInput-root": { fontFamily: FONT, fontSize: "13px", color: TEXT_DARK },
            "& .MuiInput-root:before": { display: "none" },
            "& .MuiInput-root:after": { display: "none" }
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <IconButton size="small" sx={{ color: TEXT_MUTED }}>
            <AddOutlined sx={{ fontSize: 18 }} />
          </IconButton>
          <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <IconButton size="small" sx={{ color: TEXT_MUTED }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="1" width="6" height="9" rx="3" stroke="#94A3B8" strokeWidth="1.3"/>
                <path d="M2 8C2 11.3137 4.68629 14 8 14M8 14C11.3137 14 14 11.3137 14 8M8 14V15.5" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </IconButton>
            <IconButton size="small" onClick={handleChatSubmit} sx={{ bgcolor: TEAL, color: "#FFFFFF", width: 32, height: 32, "&:hover": { bgcolor: "#089B98" } }}>
              <Box component="span" sx={{ fontSize: "14px", lineHeight: 1 }}>↑</Box>
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
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
              <ChatInputBar />
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