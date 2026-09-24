import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
} from "@mui/material";
import {
  AddOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";
import AgentHeader from "../AgentHeader";
import PhaseActions from "../PhaseActions";
import { useCurrentUser } from "../../../context/CurrentUserContext";
import "./CuratexPhase.css";

/** The pageSize CompleteWorkflow requests, used only for the row caption. */
const CURATEX_PAGE_SIZE = 10;

/**
 * A weight on the API's own scale. The profile returns e.g. `weight: 1.0`,
 * which used to render as "1%" next to fake 10-20% placeholders.
 */
const formatWeight = (weight) => {
  if (weight == null || weight === "") return "—";
  const n = Number(weight);
  if (!Number.isFinite(n)) return String(weight);
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
};

/** Header/row grid for the compound table, with or without the property columns. */
const resultsGrid = (showProps) =>
  showProps
    ? "60px minmax(110px, 1fr) 72px minmax(160px, 2fr) minmax(110px, 1fr) 24px"
    : "60px minmax(160px, 1fr) 96px 24px";

/** Match status → icon and colour. "match" keeps the stylesheet's teal. */
const STATUS_ICON = {
  match: { icon: "✓", className: "is-match", title: "Matches the criterion" },
  mismatch: { icon: "✕", color: "#DC2626", title: "Outside the criterion" },
  unknown: { icon: "?", color: "#94A3B8", title: "Not returned by the API" },
};

/**
 * Page numbers with ellipses for the compound table — always the first and
 * last page plus a window around the current one, so the strip keeps a fixed
 * width however many pages the API reports.
 */
const buildPageStrip = (page, totalPages) => {
  if (!Number.isFinite(totalPages) || totalPages < 1) return [];

  const pages = new Set([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const strip = ["‹"];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) strip.push("…");
    strip.push(p);
  });
  strip.push("›");

  return strip;
};

const squash = (value) => String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "");

const humanize = (key) =>
  String(key ?? "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

/**
 * The property-by-property breakdown shown when a results row is expanded.
 *
 * This replaced a MATCH_DETAILS fixture that listed Metformin's real numbers
 * (129.16 Da, LogP -1.43, …) against a Type 2 Diabetes profile, and rendered
 * them for whichever compound happened to be expanded — so every candidate
 * appeared to have identical properties.
 *
 * It is built from two real sources instead: the target criteria from
 * GET /agents/curatex/{jobId}/profile, and the compound's own matched /
 * mismatched property lists. Where the API gives no measured value for a
 * property, the cell says so rather than borrowing one.
 */
const buildMatchDetails = (compound, profile) => {
  const criteria = Array.isArray(profile?.criteria) ? profile.criteria : [];
  if (!criteria.length) return [];

  const listOf = (value) =>
    (Array.isArray(value) ? value : String(value ?? "").split(","))
      .map((v) => squash(v))
      .filter(Boolean);

  const matched = listOf(compound?.matchedProps);
  const mismatched = listOf(compound?.mismatchedProps);

  // Per-property measured values, if the row carried any.
  const measured = compound?.properties && typeof compound.properties === "object"
    ? compound.properties
    : {};

  return criteria.map((criterion) => {
    const key = squash(criterion?.name);

    // Matched lists arrive abbreviated ("MW", "Bioavail"), so a prefix match
    // either way is more reliable than equality.
    const hit = (list) =>
      list.some((entry) => entry === key || key.startsWith(entry) || entry.startsWith(key));

    const status = hit(matched) ? "match" : hit(mismatched) ? "mismatch" : "unknown";

    const value =
      measured[criterion?.name] ??
      measured[key] ??
      (status === "unknown" ? "Not returned" : status === "match" ? "Within criterion" : "Outside criterion");

    const rowKey = Object.keys(profile?.fieldToCriterion ?? {}).find(
      (k) => profile.fieldToCriterion[k] === criterion?.name
    );

    return {
      label: (rowKey && profile?.labels?.[rowKey]) || humanize(criterion?.name),
      target: criterion?.value ?? "—",
      value,
      status,
    };
  });
};

const CuratexPhase = ({
  workflowPhase,
  setWorkflowPhase,
  chatMessages = [],
  profileData = {},
  setProfileData,
  profileEditMode,
  setProfileEditMode,
  curateXResults = [],
  setCurateXResults,
  selectedCompound,
  setSelectedCompound,
  setShowCompoundDetail,
  setActiveStep,
  /** The runner's live progress line for whichever CurateX job is in flight. */
  progressMessage,
  /**
   * GET /agents/curatex/{jobId}/profile — { target, criteria, weights,
   * ligandCount, warnings }. The target and criteria on screen come from here
   * rather than from a hardcoded JAK2 / Type 2 Diabetes profile.
   */
  profile = null,
  profileLoading = false,
  profileError = null,
  onRetryProfile,
  /** GET /agents/curatex/{jobId}/results. */
  resultsLoading = false,
  resultsError = null,
  onRetryResults,
  /**
   * "Submit Profile" → POST /agents/curatex/compounds with the edited weights.
   * It used to set six hardcoded compound rows and jump straight to results.
   */
  onSubmitProfile,
  /** "View in ScreenSuite" → POST /sessions/{id}/steps. */
  onContinue,
  continuePending = false,
  /** Server-side pagination for the compound table. */
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  /** Branch / Rerun / Export handlers from usePhaseActions. */
  actions = {},
  /** GET /agents/curatex/{jobId}/results → target, when the profile has none. */
  resultsTarget = null,
}) => {
  const { chatLabel: userLabel } = useCurrentUser();
  const activeCompound = selectedCompound || curateXResults?.[0];

  /** The API's `editable` flag. A locked profile can be reviewed and submitted, not changed. */
  const editable = profile?.editable !== false;

  // Local state — weights per property, and the "Adding new parameter"
  // sub-state inside edit mode (Figma: field-row-new with Parameter
  // name.../Enter value or range... inputs + Save Changes/Cancel).
  /**
   * Criterion weights, keyed by row, on the API's scale.
   *
   * These come only from GET /agents/curatex/{jobId}/profile and are what
   * POST /agents/curatex/compounds is scored against. They used to start from
   * a DEFAULT_WEIGHTS fixture (10-20 "%"), so rows showed numbers the backend
   * never saw.
   */
  const [weights, setWeights] = useState({});

  /** Snapshot taken on entering edit mode, so Cancel really cancels. */
  const editSnapshotRef = useRef(null);

  const weightsSeededRef = useRef(false);
  useEffect(() => {
    if (weightsSeededRef.current) return;
    if (!profile?.weights || !Object.keys(profile.weights).length) return;
    weightsSeededRef.current = true;
    setWeights(profile.weights);
  }, [profile]);
  const [isAddingParameter, setIsAddingParameter] = useState(false);
  const [newParamName, setNewParamName] = useState("");
  const [newParamValue, setNewParamValue] = useState("");
  const [newParamWeight, setNewParamWeight] = useState("");
  const [expandedRow, setExpandedRow] = useState(0);

  const closeLegacyCompoundDetail = () => {
    if (typeof setShowCompoundDetail === "function") {
      setShowCompoundDetail(false);
    }
  };

  const handleViewDataSource = (compound) => {
    setSelectedCompound?.(compound);
    closeLegacyCompoundDetail();
    setWorkflowPhase("curatex-data-source");
  };

  const handleNextFromResults = () => {
    const compound = activeCompound || curateXResults?.[0];

    if (compound) {
      setSelectedCompound?.(compound);
    }

    closeLegacyCompoundDetail();
    setWorkflowPhase("curatex-compound-exploration");
  };

  const handleBackToResults = () => {
    closeLegacyCompoundDetail();
    setWorkflowPhase("curatex-results");
  };

  const handleNextFromCompoundExploration = () => {
    setWorkflowPhase("curatex-candidate-selection");
  };

  /**
   * Hands the session to ScreenSuite.
   *
   * This used to be setActiveStep(3) + setWorkflowPhase("screensuite-loading"),
   * which showed the docking screen without ever starting a docking job or
   * telling the backend which compounds were chosen. onContinue posts the step;
   * the local fallback remains only for the case where no handler was passed.
   */
  const handleViewInScreenSuite = () => {
    if (onContinue) {
      onContinue();
      return;
    }
    setActiveStep?.(3);
    setWorkflowPhase("screensuite-loading");
  };

  /** The target under study, from the profile or results endpoint. */
  const targetName = profile?.target || resultsTarget || null;
  const targetLabel = targetName || "the selected target";

  const handleStartEdit = () => {
    editSnapshotRef.current = { profileData: { ...profileData }, weights: { ...weights } };
    setProfileEditMode?.(true);
  };

  const handleAddParameterClick = () => {
    setIsAddingParameter(true);
  };

  const handleDeleteParameter = (key) => {
    if (!profileData || !setProfileData) return;
    const next = { ...profileData };
    delete next[key];
    setProfileData(next);
    setWeights((prev) => {
      const nextWeights = { ...prev };
      delete nextWeights[key];
      return nextWeights;
    });
  };

  const handleCancelEdit = () => {
    if (editSnapshotRef.current) {
      setProfileData?.(editSnapshotRef.current.profileData);
      setWeights(editSnapshotRef.current.weights);
      editSnapshotRef.current = null;
    }
    setIsAddingParameter(false);
    setNewParamName("");
    setNewParamValue("");
    setNewParamWeight("");
    setProfileEditMode?.(false);
  };

  /**
   * An added parameter is a criterion name plus a weight — the only two things
   * POST /agents/curatex/compounds can carry. Its weight is on the API's
   * scale; a blank weight defaults to 1.0, the scale the profile itself uses.
   * (This used to default to 10 on a percent scale, about 10x too large.)
   */
  const newWeightNumber = newParamWeight.trim() === "" ? 1 : Number(newParamWeight);
  const newParamValid =
    newParamName.trim() !== "" && Number.isFinite(newWeightNumber) && newWeightNumber >= 0;

  const handleSaveChanges = () => {
    if (isAddingParameter && newParamValid) {
      const key = newParamName
        .trim()
        .replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, (c) => c.toLowerCase());

      setProfileData?.({ ...profileData, [key]: newParamValue.trim() });
      setWeights((prev) => ({
        ...prev,
        [key]: newWeightNumber,
      }));
    }
    editSnapshotRef.current = null;

    setIsAddingParameter(false);
    setNewParamName("");
    setNewParamValue("");
    setNewParamWeight("");
    setProfileEditMode?.(false);
  };

  // Friendly label from the normaliser when the criterion matched a known
  // field, otherwise the criterion's own name.
  const propertyLabel = (key) =>
    profile?.labels?.[key] ??
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();

  // ---------------------------------------------------------------------------
  // CurateX Loading
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-loading") {
    // Was a fixed "…for JAK2" string. The user's own last message is what
    // actually started this step.
    const lastUserMessage = [...(chatMessages || [])]
      .reverse()
      .find((m) => m.role === "user")?.text;
    const curatexQuery =
      lastUserMessage || `Generate a target candidate profile for ${targetLabel}`;

    return (
      <Box className="curatex-page">
        <div className="curatex-user-row">
          <div className="curatex-user-bubble">
            <Typography className="curatex-user-name">
              {userLabel}
            </Typography>

            <Typography className="curatex-user-text">
              {curatexQuery}
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card">
          <AgentHeader moduleKey="curatex" />

          <Typography className="curatex-body-text curatex-loading-description">
            {progressMessage ||
              `Searching for candidate compounds matching your ${targetLabel} target profile...`}
          </Typography>

          <div className="curatex-progress-track">
            <div className="curatex-progress-fill" />
          </div>

          <div className="curatex-loading-steps">
            {/* Step wording updated per testing feedback.

                No step is ticked while the job runs. The first two used to be
                hard-coded "done", so a blue completion tick showed before
                CurateX had done anything. The job reports one progress message
                (shown above), not per-step status, so the list only marks
                where the run starts and what follows. */}
            {[
              { label: "Scanning compound databases...", state: "active" },
              { label: "Analysing compounds...", state: "pending" },
              { label: "Creating ideal candidate profile...", state: "pending" },
            ].map((step, index) => (
              <div className="curatex-loading-step" key={index}>
                {step.state === "active" ? (
                  <span className="curatex-step-dot curatex-step-dot--active">
                    <span className="curatex-spinner" />
                  </span>
                ) : (
                  <span className="curatex-step-dot curatex-step-dot--pending" />
                )}

                <Typography className={`curatex-loading-step-text is-${step.state}`}>
                  {step.label}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // CurateX Target Product Profile (view / edit / add-parameter)
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-profile") {
    const subtitle = isAddingParameter
      ? "Adding new parameter — fill in the name and value below"
      : profileEditMode
      ? "Editing mode — adjust the weights below, then save changes."
      : editable
      ? "Review the criteria and weights, then submit to find matching candidates."
      : "This profile is locked by the backend and cannot be edited. Submit it to find matching candidates.";

    const showInputs = editable && (profileEditMode || isAddingParameter);
    const rows = Object.entries(profileData ?? {});

    return (
      <Box className="curatex-page">
        <div className="curatex-user-row">
          <div className="curatex-user-bubble">
            <Typography className="curatex-user-name">
              {userLabel}
            </Typography>

            <Typography className="curatex-user-text">
              {/* The target comes from the profile endpoint; these strings were
                  hardcoded to JAK2. */}
              {profileEditMode || isAddingParameter
                ? `Please generate a Target Candidate Profile for ${targetLabel}.`
                : `Generate a target candidate profile for ${targetLabel}.`}
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card">
          <AgentHeader moduleKey="curatex" />

          <Typography className="curatex-body-text curatex-profile-intro">
            {profileError
              ? profileError
              : profileLoading
              ? "Building the target product profile…"
              : `I've generated a Target Product Profile for ${targetLabel}. Review and adjust the parameters below, then submit to find matching candidates.`}
          </Typography>

          {profileError && onRetryProfile && (
            <Button onClick={onRetryProfile} className="curatex-secondary-button">
              Try again
            </Button>
          )}

          {/* The backend's own caveats about the profile it built — previously
              there was nowhere for these to appear. */}
          {profile?.warnings?.length > 0 && (
            <Box sx={{ mb: "12px" }}>
              {profile.warnings.map((warning, i) => (
                <Typography
                  key={i}
                  className="curatex-body-text"
                  sx={{ fontSize: "12px", color: "#B45309" }}
                >
                  {warning}
                </Typography>
              ))}
            </Box>
          )}

          <div className="curatex-profile-card">
            <Typography className="curatex-profile-title">
              Target Product Profile - {targetLabel}
            </Typography>

            <Typography className="curatex-profile-subtitle">
              {profile?.ligandCount != null
                ? `${subtitle} ${profile.ligandCount} known ligand${profile.ligandCount === 1 ? "" : "s"} available.`
                : subtitle}
            </Typography>

            <div className="curatex-profile-grid curatex-profile-grid-header">
              {["Property", "Target Criterion", "Weight"].map((header) => (
                <Typography
                  key={header}
                  className={`curatex-table-header-text ${
                    showInputs ? "is-edit" : ""
                  }`}
                >
                  {header}
                </Typography>
              ))}
              <span />
            </div>

            <div className="curatex-profile-grid">
              {/* One row per criterion the API returned — no fixed list, so
                  no blank placeholder rows and no hidden criteria. */}
              {rows.map(([key, value]) => (
                <React.Fragment key={key}>
                  <Typography className="curatex-profile-property">
                    {propertyLabel(key)}
                  </Typography>

                  {/* Criterion values are read-only: POST
                      /agents/curatex/compounds has no field for them, so an
                      edited value would silently have no effect. */}
                  <Typography className="curatex-profile-value">
                    {value === "" || value == null ? "—" : String(value)}
                  </Typography>

                  <div className="curatex-weight-field">
                    {showInputs ? (
                      <TextField
                        value={weights[key] ?? ""}
                        onChange={(event) =>
                          setWeights((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        placeholder="—"
                        size="small"
                        variant="standard"
                        type="number"
                        inputProps={{ step: 0.1, min: 0, "aria-label": `Weight for ${propertyLabel(key)}` }}
                        className="curatex-new-weight-input"
                        InputProps={{ disableUnderline: true }}
                      />
                    ) : (
                      <Typography className="curatex-profile-weight">
                        {formatWeight(weights[key])}
                      </Typography>
                    )}
                  </div>

                  {editable ? (
                    <IconButton
                      size="small"
                      className="curatex-profile-delete"
                      aria-label={`Remove ${propertyLabel(key)}`}
                      onClick={() => handleDeleteParameter(key)}
                    >
                      <DeleteOutlineOutlined className="curatex-trash-icon" />
                    </IconButton>
                  ) : (
                    <span />
                  )}
                </React.Fragment>
              ))}

              {isAddingParameter && (
                <>
                  <TextField
                    value={newParamName}
                    onChange={(e) => setNewParamName(e.target.value)}
                    placeholder="Parameter name..."
                    size="small"
                    fullWidth
                    className="curatex-profile-input curatex-new-param-input"
                  />

                  <TextField
                    value={newParamValue}
                    onChange={(e) => setNewParamValue(e.target.value)}
                    placeholder="Value (for reference, not sent)"
                    size="small"
                    fullWidth
                    className="curatex-profile-input curatex-new-param-input"
                  />

                  <div className="curatex-weight-field curatex-weight-field--new">
                    <TextField
                      value={newParamWeight}
                      onChange={(e) => setNewParamWeight(e.target.value)}
                      placeholder="1.0"
                      size="small"
                      variant="standard"
                      type="number"
                      inputProps={{ step: 0.1, min: 0, "aria-label": "Weight for the new parameter" }}
                      className="curatex-new-weight-input"
                      InputProps={{ disableUnderline: true }}
                    />
                  </div>

                  <IconButton
                    size="small"
                    className="curatex-profile-delete"
                    aria-label="Discard the new parameter"
                    onClick={() => {
                      setIsAddingParameter(false);
                      setNewParamName("");
                      setNewParamValue("");
                      setNewParamWeight("");
                    }}
                  >
                    <DeleteOutlineOutlined className="curatex-trash-icon" />
                  </IconButton>
                </>
              )}
            </div>

            {!profileLoading && !profileError && rows.length === 0 && (
              <Typography className="curatex-body-text" sx={{ fontSize: "12px", color: "#64748B", mt: "8px" }}>
                The profile returned no criteria.
              </Typography>
            )}

            {/* Said once, plainly: only weights reach the scorer. */}
            {rows.length > 0 && (
              <Typography className="curatex-body-text" sx={{ fontSize: "11px", color: "#94A3B8", mt: "8px" }}>
                Weights are on the API's own scale. Only weights are sent when scoring — the
                API has no field for criterion values, so values are shown as returned.
              </Typography>
            )}

            {showInputs && profileEditMode && !isAddingParameter && (
              <Button
                startIcon={<AddOutlined />}
                onClick={handleAddParameterClick}
                className="curatex-add-parameter"
              >
                Add Parameter
              </Button>
            )}
          </div>

          <div className="curatex-action-row">
            {showInputs ? (
              <>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={isAddingParameter && !newParamValid}
                  className="curatex-primary-button"
                >
                  Save Changes
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  className="curatex-secondary-button"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {/* Starts the real compound-scoring job with the edited
                    weights. This button used to inject six fixed compounds
                    (Metformin, Pioglitazone, …) and jump to the results
                    screen, so the scores shown had nothing to do with the
                    criteria above them. */}
                <Button
                  variant="contained"
                  disabled={!profile?.hasData}
                  onClick={() => {
                    if (onSubmitProfile) {
                      // The LOCAL weights, not the profile's — a deleted or
                      // added parameter only exists here, and passing the
                      // API's original copy would score against criteria the
                      // researcher had already changed.
                      onSubmitProfile(weights);
                      return;
                    }
                    setWorkflowPhase("curatex-submitted");
                  }}
                  className="curatex-primary-button"
                >
                  Submit Profile
                </Button>

                {editable && (
                  <Button
                    variant="outlined"
                    onClick={handleStartEdit}
                    disabled={!profile?.hasData}
                    className="curatex-secondary-button curatex-edit-button"
                  >
                    Edit Weights
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // CurateX Submitted / Scoring
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-submitted") {
    return (
      <Box className="curatex-page curatex-submitted-page">
        <div className="curatex-agent-card curatex-submitted-card">
          <AgentHeader moduleKey="curatex" />
          <Typography className="curatex-body-text curatex-results-intro">
            Profile submitted. Scoring compounds against your {targetLabel} target product
            profile...
          </Typography>
          <div className="curatex-progress-track">
            <div className="curatex-progress-fill" />
          </div>
          <Typography className="curatex-loading-step-text is-active">
            {progressMessage || "Matching candidates against target criteria..."}
          </Typography>
        </div>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // CurateX Results
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-results") {
    // MATCHED / MISMATCHED only appear when the API actually sent that detail;
    // its example rows carry just name and score, which left both columns
    // permanently blank.
    const showProps = curateXResults.some(
      (c) => String(c?.matchedProps ?? "").trim() || String(c?.mismatchedProps ?? "").trim()
    );
    const gridStyle = { gridTemplateColumns: resultsGrid(showProps) };

    // The strongest candidate on this page, straight from the scores.
    const scored = curateXResults.filter((c) => Number.isFinite(c?.rawScore));
    const best = scored.length
      ? scored.reduce((a, b) => (b.rawScore > a.rawScore ? b : a))
      : null;

    return (
      <Box className="curatex-page">
        <div className="curatex-user-row">
          <div className="curatex-user-bubble">
            <Typography className="curatex-user-name">
              {userLabel}
            </Typography>

            <Typography className="curatex-user-text">
              Submit Profile
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card curatex-results-card">
          <AgentHeader moduleKey="curatex" />

          <Typography className="curatex-body-text curatex-results-intro">
            {/* Was "Scoring 124 compounds against your JAK2 target product
                profile" on every run, whatever the target or the count. */}
            {resultsError
              ? resultsError
              : resultsLoading
              ? "Loading scored candidates…"
              : curateXResults.length
              ? `Scored ${total || curateXResults.length} candidate${(total || curateXResults.length) === 1 ? "" : "s"} against your ${targetLabel} target product profile. Here are the top candidates:`
              : `No candidates were returned for your ${targetLabel} target product profile.`}
          </Typography>

          {resultsError && onRetryResults && (
            <Button onClick={onRetryResults} className="curatex-secondary-button">
              Try again
            </Button>
          )}

          <div className="curatex-results-table">
            <div className="curatex-results-header" style={gridStyle}>
              <Typography className="curatex-results-header-cell">
                RANK
              </Typography>
              <Typography className="curatex-results-header-cell">
                COMPOUND
              </Typography>
              <Typography className="curatex-results-header-cell">
                SCORE
              </Typography>
              {showProps && (
                <Typography className="curatex-results-header-cell">
                  MATCHED PROPERTIES
                </Typography>
              )}
              {showProps && (
                <Typography className="curatex-results-header-cell">
                  MISMATCHED
                </Typography>
              )}
              <span />
            </div>

            {curateXResults.map((compound, index) => {
              const isExpanded = expandedRow === index;

              return (
                <React.Fragment key={compound.rank ?? compound.name ?? index}>
                  <div
                    className={`curatex-result-row ${
                      isExpanded ? "is-expanded" : ""
                    }`}
                    style={gridStyle}
                    onClick={() => {
                      setSelectedCompound?.(compound);
                      setExpandedRow(isExpanded ? -1 : index);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedCompound?.(compound);
                        setExpandedRow(isExpanded ? -1 : index);
                      }
                    }}
                  >
                    <Typography className="curatex-rank">
                      {compound.rank}
                    </Typography>

                    <Typography className="curatex-compound-name">
                      {compound.name}
                    </Typography>

                    {/* The normalised score (0-1 API scores shown x100) —
                        the only data field besides the name, and it was not
                        shown at all. */}
                    <Typography
                      className="curatex-compound-name"
                      title={compound.rawScore != null ? `API score: ${compound.rawScore}` : undefined}
                    >
                      {compound.score}
                    </Typography>

                    {showProps && (
                      <Typography className="curatex-matched-properties">
                        {compound.matchedProps}
                      </Typography>
                    )}

                    {showProps && (
                      <Typography className="curatex-mismatched-properties">
                        {compound.mismatchedProps}
                      </Typography>
                    )}

                    <Typography className="curatex-row-chevron">
                      {isExpanded ? "⌃" : "›"}
                    </Typography>
                  </div>

                  {isExpanded && (
                    <div className="curatex-match-details">
                      <div className="curatex-match-details-heading">
                        <Typography className="curatex-match-details-title">
                          Match Details — {compound.name}
                          {targetName ? ` vs ${targetName} Target Profile` : ""}
                        </Typography>

                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewDataSource(compound);
                          }}
                          className="curatex-view-source-button"
                        >
                          View Data Source ↗
                        </Button>
                      </div>

                      <div className="curatex-match-detail-list">
                        {buildMatchDetails(compound, profile).length === 0 && (
                          <Typography className="curatex-match-detail-label">
                            The profile has no criteria to compare against.
                          </Typography>
                        )}
                        {buildMatchDetails(compound, profile).map((detail) => (
                          <div className="curatex-match-detail-row" key={detail.label}>
                            <Typography className="curatex-match-detail-label">
                              {detail.label}
                            </Typography>
                            <Typography className="curatex-match-detail-target">
                              {detail.target}
                            </Typography>
                            <Typography className="curatex-match-detail-arrow">
                              →
                            </Typography>
                            <Typography className="curatex-match-detail-value">
                              {detail.value}
                            </Typography>
                            {/* match / mismatch / unknown. This checked for
                                "partial", which buildMatchDetails never
                                produces, so every row showed a tick. */}
                            <Typography
                              className={`curatex-match-detail-status ${
                                STATUS_ICON[detail.status]?.className ?? ""
                              }`}
                              title={STATUS_ICON[detail.status]?.title}
                              style={
                                STATUS_ICON[detail.status]?.color
                                  ? { color: STATUS_ICON[detail.status].color }
                                  : undefined
                              }
                            >
                              {STATUS_ICON[detail.status]?.icon ?? "?"}
                            </Typography>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Real pagination. This was seven fixed buttons with page 1 always
              styled active and a "Showing 1-6 of 124 compounds" caption, none
              of which reflected the run or did anything when clicked. */}
          <div className="curatex-pagination">
            {buildPageStrip(page, totalPages).map((p, i) => {
              const isCurrent = p === page;
              const isGap = p === "…";
              const isArrow = p === "‹" || p === "›";
              const targetPage = p === "‹" ? page - 1 : p === "›" ? page + 1 : p;
              const isDisabled =
                isGap ||
                (p === "‹" && page <= 1) ||
                (p === "›" && page >= totalPages);

              return (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  disabled={isDisabled}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={
                    isArrow
                      ? p === "‹"
                        ? "Previous page"
                        : "Next page"
                      : isGap
                      ? undefined
                      : `Page ${p}`
                  }
                  onClick={isDisabled ? undefined : () => onPageChange?.(targetPage)}
                  className={`curatex-page-button${isCurrent ? " active" : ""}${
                    isDisabled ? " disabled" : ""
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <Typography className="curatex-pagination-text">
              {curateXResults.length
                ? (() => {
                    const firstRank = Number(curateXResults[0]?.rank);
                    const start = Number.isFinite(firstRank)
                      ? firstRank
                      : (page - 1) * CURATEX_PAGE_SIZE + 1;
                    const end = Math.min(start + curateXResults.length - 1, total || Infinity);
                    return `Showing ${start}-${end} of ${total} compound${total === 1 ? "" : "s"}`;
                  })()
                : "No compounds on this page"}
            </Typography>
          </div>

          {/* Was a fixed Metformin/Pioglitazone recommendation. The API
              returns no recommendation text, so this only states what the
              scores show. */}
          {best && (
            <div className="curatex-recommendation-card">
              <Typography className="curatex-recommendation-title">
                Highest score on this page
              </Typography>

              <Typography className="curatex-recommendation-text">
                {best.name} (rank {best.rank}, score {best.score}) is the highest-scoring
                candidate shown{targetName ? ` for ${targetName}` : ""}. The CurateX API does not
                return a written recommendation.
              </Typography>
            </div>
          )}

          <div className="curatex-results-actions">
            <PhaseActions {...actions} />

            <Button
              variant="contained"
              onClick={handleNextFromResults}
              disabled={!curateXResults.length}
              className="curatex-primary-button curatex-next-button"
            >
              Next
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Data Source Screen
  //
  // This screen, the exploration and the candidate-selection screens used to
  // be fixed Metformin content (CAS 657-24-9, DrugBank DB00331, "94%", five
  // source references) whatever compound was chosen. The CurateX API returns a
  // name and a score per compound and the profile's criteria, so that is what
  // they show; everything else says it is not available.
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-data-source") {
    const compound = activeCompound;
    const details = compound ? buildMatchDetails(compound, profile) : [];

    return (
      <Box className="curatex-data-source-page">
        <Button
          onClick={handleBackToResults}
          className="curatex-back-link"
        >
          ← Back to Results
        </Button>

        <Typography className="curatex-data-source-title">
          Data Source: {compound?.name || "No compound selected"}
          {compound && targetName ? ` — ${targetName} Match` : ""}
        </Typography>

        {compound && (
          <div className="curatex-source-summary-card">
            <SourceSummary label="Compound Name" value={compound.name} accent />

            <SourceSummary label="Rank" value={compound.rank ?? "—"} />

            {compound.chemblId && (
              <SourceSummary label="ChEMBL ID" value={compound.chemblId} />
            )}

            {targetName && <SourceSummary label="Target" value={targetName} />}

            <div className="curatex-source-summary-field">
              <Typography className="curatex-source-label">
                Overall Match Score
              </Typography>

              <div className="curatex-score-badge">{compound.score}</div>
            </div>
          </div>
        )}

        <Typography className="curatex-source-section-title">
          Source Data Comparison
        </Typography>

        {details.length ? (
          <div className="curatex-source-table">
            <SourceTableHeader />

            {details.map((detail) => (
              <SourceRow
                key={detail.label}
                parameter={detail.label}
                target={detail.target}
                value={detail.value}
                statusType={detail.status}
              />
            ))}
          </div>
        ) : (
          <Typography className="curatex-body-text" sx={{ fontSize: "13px", color: "#64748B" }}>
            The profile has no criteria to compare this compound against.
          </Typography>
        )}

        <Typography className="curatex-source-section-title">
          Source References
        </Typography>

        <Typography className="curatex-body-text" sx={{ fontSize: "13px", color: "#64748B" }}>
          Not available from the API — CurateX returns a score per compound but no
          per-property source values or references.
        </Typography>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Compound Exploration Screen
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-compound-exploration") {
    const compound = activeCompound;

    return (
      <Box className="curatex-page curatex-exploration-page">
        <div className="curatex-agent-card curatex-exploration-card">
          <AgentHeader moduleKey="curatex" />

          <Typography className="curatex-body-text curatex-exploration-intro">
            {compound
              ? `Here is what the CurateX results report for ${compound.name}:`
              : "No compound is selected."}
          </Typography>

          {compound && (
            <div className="curatex-compound-detail-card">
              <Typography className="curatex-compound-detail-title">
                {compound.name} - Compound Detail
              </Typography>

              <Typography className="curatex-compound-detail-subtitle">
                Summary of what the scoring run returned.
              </Typography>

              <CompoundSection
                title="Match Score"
                text={`${compound.score} — rank ${compound.rank ?? "—"} of ${total || curateXResults.length} scored candidates${targetName ? ` against the ${targetName} target profile` : ""}.`}
              />

              {(compound.chemblId || compound.smiles) && (
                <CompoundSection
                  title="Identifiers"
                  text={[
                    compound.chemblId && `ChEMBL: ${compound.chemblId}`,
                    compound.smiles && `SMILES: ${compound.smiles}`,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
              )}

              <CompoundSection
                title="Mechanism of Action, Current Uses, Patent Status"
                text="Not available from the CurateX API. Patent status is assessed by NovSearch later in the workflow."
                last
              />
            </div>
          )}

          <div className="curatex-exploration-actions">
            <Button
              variant="outlined"
              onClick={handleBackToResults}
              className="curatex-secondary-button"
            >
              Back to Results
            </Button>

            <Button
              variant="contained"
              onClick={handleNextFromCompoundExploration}
              disabled={!compound}
              className="curatex-primary-button"
            >
              Next
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Candidate Selection Screen
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-candidate-selection") {
    // The same rule the hand-off uses: the chosen compound, or failing that
    // the top five on this page.
    const forwarded = selectedCompound
      ? [selectedCompound]
      : (curateXResults ?? []).slice(0, 5);

    return (
      <Box className="curatex-page curatex-candidate-page">
        <div className="curatex-agent-card curatex-candidate-card">
          <AgentHeader moduleKey="curatex" />

          <Typography className="curatex-body-text curatex-candidate-intro">
            {forwarded.length
              ? `Candidate${forwarded.length === 1 ? "" : "s"} to forward to ScreenSuite for molecular docking:`
              : "There are no candidates to forward to ScreenSuite."}
          </Typography>

          {forwarded.map((compound) => (
            <div className="curatex-candidate-compound" key={compound.name}>
              <Typography className="curatex-candidate-name">
                {compound.name}
                {compound.score && compound.score !== "—" ? ` (${compound.score})` : ""}
              </Typography>

              {targetName && (
                <Typography className="curatex-candidate-target">
                  Target: {targetName}
                </Typography>
              )}
            </div>
          ))}

          <Typography className="curatex-candidate-status">
            Docking starts when you continue to ScreenSuite.
          </Typography>

          <div className="curatex-candidate-actions">
            <Button
              variant="contained"
              onClick={handleViewInScreenSuite}
              disabled={continuePending || !forwarded.length}
              className="curatex-primary-button"
            >
              {continuePending ? "Starting ScreenSuite…" : "View in ScreenSuite"}
            </Button>

            <Button
              variant="outlined"
              onClick={handleBackToResults}
              className="curatex-secondary-button"
            >
              Back to Results
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  return null;
};

// -----------------------------------------------------------------------------
// Reusable components
// -----------------------------------------------------------------------------

const SourceSummary = ({ label, value, accent = false }) => (
  <div className="curatex-source-summary-field">
    <Typography className="curatex-source-label">{label}</Typography>

    <Typography
      className={`curatex-source-summary-value ${
        accent ? "is-accent" : ""
      }`}
    >
      {value}
    </Typography>
  </div>
);

const SOURCE_GRID = { gridTemplateColumns: "minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) 150px" };

const SourceTableHeader = () => (
  <div className="curatex-source-table-header" style={SOURCE_GRID}>
    {["PARAMETER", "TARGET CRITERION", "COMPOUND VALUE", "MATCH STATUS"].map((header) => (
      <Typography key={header} className="curatex-source-table-header-cell">
        {header}
      </Typography>
    ))}
  </div>
);

const SOURCE_STATUS = {
  match: { label: "✓ Match", className: "curatex-status-match" },
  mismatch: { label: "✕ Mismatch", className: "curatex-status-mismatch" },
  unknown: { label: "? Not returned", className: "curatex-status-partial" },
};

const SourceRow = ({ parameter, target, value, statusType }) => {
  const status = SOURCE_STATUS[statusType] ?? SOURCE_STATUS.unknown;
  return (
    <div className="curatex-source-table-row" style={SOURCE_GRID}>
      <Typography className="curatex-source-cell strong">
        {parameter}
      </Typography>

      <Typography className="curatex-source-cell">{target}</Typography>

      <Typography className="curatex-source-cell strong">
        {value}
      </Typography>

      <div>
        <span className={`curatex-status-badge ${status.className}`}>
          {status.label}
        </span>
      </div>
    </div>
  );
};

const CompoundSection = ({ title, text, last = false }) => (
  <div className={`curatex-compound-section ${last ? "is-last" : ""}`}>
    <Typography className="curatex-compound-section-title">
      {title}
    </Typography>

    <Typography className="curatex-compound-section-text" sx={{ whiteSpace: "pre-line" }}>
      {text}
    </Typography>
  </div>
);

export default CuratexPhase;