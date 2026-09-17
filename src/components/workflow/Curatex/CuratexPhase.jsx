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
import {
  FONT,
  TEAL,
  USER_MSG_BG,
  GRAY_BG,
  BORDER,
  TEXT_DARK,
  TEXT_MUTED,
} from "../workflowConstants";
import AgentHeader from "../AgentHeader";
import "./CuratexPhase.css";

// Default weight allocation per property — matches Figma "Target Product
// Profile - JAK2" card (weight-field values shown next to each row).
const DEFAULT_WEIGHTS = {
  indication: "15",
  moa: "10",
  route: "15",
  molecularWeight: "10",
  bioavailability: "20",
  halfLife: "15",
  logP: "10",
  solubility: "15",
  plasmaProteinBinding: "10",
};

/** The pageSize CompleteWorkflow requests, used only for the row caption. */
const CURATEX_PAGE_SIZE = 10;

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

    return {
      label: humanize(criterion?.name),
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
}) => {
  const activeCompound = selectedCompound || curateXResults?.[0];

  // Local state — weights per property, and the "Adding new parameter"
  // sub-state inside edit mode (Figma: field-row-new with Parameter
  // name.../Enter value or range... inputs + Save Changes/Cancel).
  /**
   * Criterion weights.
   *
   * DEFAULT_WEIGHTS is only the pre-load placeholder now — the real weights
   * come from GET /agents/curatex/{jobId}/profile and are what
   * POST /agents/curatex/compounds is scored against, so seeding them from a
   * fixture meant the researcher was editing numbers the backend never saw.
   */
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

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

  /** The target under study, from the profile endpoint. */
  const targetLabel = profile?.target || "the selected target";

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
    setIsAddingParameter(false);
    setNewParamName("");
    setNewParamValue("");
    setNewParamWeight("");
    setProfileEditMode?.(false);
  };

  const handleSaveChanges = () => {
    if (isAddingParameter && newParamName.trim() && newParamValue.trim()) {
      const key = newParamName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase());

      setProfileData?.({ ...profileData, [key]: newParamValue.trim() });
      setWeights((prev) => ({
        ...prev,
        [key]: newParamWeight.trim() || "10",
      }));
    }

    setIsAddingParameter(false);
    setNewParamName("");
    setNewParamValue("");
    setNewParamWeight("");
    setProfileEditMode?.(false);
  };

  const propertyLabel = (key) =>
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
              DR. PRIYA (YOU)
            </Typography>

            <Typography className="curatex-user-text">
              {curatexQuery}
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card">
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography className="curatex-body-text curatex-loading-description">
            {progressMessage ||
              `Searching for candidate compounds matching your ${targetLabel} target profile...`}
          </Typography>

          <div className="curatex-progress-track">
            <div className="curatex-progress-fill" />
          </div>

          <div className="curatex-loading-steps">
            {[
              { label: "Analyzing target profile parameters...", state: "done" },
              { label: "Scanning compound databases...", state: "done" },
              { label: "Matching candidates against criteria...", state: "active" },
            ].map((step, index) => (
              <div className="curatex-loading-step" key={index}>
                {step.state === "done" ? (
                  <span className="curatex-step-dot curatex-step-dot--done">✓</span>
                ) : (
                  <span className="curatex-step-dot curatex-step-dot--active">
                    <span className="curatex-spinner" />
                  </span>
                )}

                <Typography
                  className={`curatex-loading-step-text ${
                    step.state === "done" ? "is-done" : "is-active"
                  }`}
                >
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
      ? "Editing mode — modify values below, then save changes"
      : "Parameter added successfully. Review and submit to find matching candidates.";

    const showInputs = profileEditMode || isAddingParameter;

    return (
      <Box className="curatex-page">
        <div className="curatex-user-row">
          <div className="curatex-user-bubble">
            <Typography className="curatex-user-name">
              DR. PRIYA (YOU)
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
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

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
              {Object.entries(profileData).map(([key, value]) => (
                <React.Fragment key={key}>
                  <Typography className="curatex-profile-property">
                    {propertyLabel(key)}
                  </Typography>

                  {profileEditMode ? (
                    <TextField
                      value={value}
                      onChange={(event) =>
                        setProfileData?.({
                          ...profileData,
                          [key]: event.target.value,
                        })
                      }
                      size="small"
                      fullWidth
                      className="curatex-profile-input"
                    />
                  ) : (
                    <Typography className="curatex-profile-value">
                      {value}
                    </Typography>
                  )}

                  <div className="curatex-weight-field">
                    <Typography className="curatex-profile-weight">
                      {weights[key] || "10"}%
                    </Typography>
                  </div>

                  <IconButton
                    size="small"
                    className="curatex-profile-delete"
                    onClick={() => handleDeleteParameter(key)}
                  >
                    <DeleteOutlineOutlined className="curatex-trash-icon" />
                  </IconButton>
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
                    placeholder="Enter value or range..."
                    size="small"
                    fullWidth
                    className="curatex-profile-input curatex-new-param-input"
                  />

                  <div className="curatex-weight-field curatex-weight-field--new">
                    <TextField
                      value={newParamWeight}
                      onChange={(e) => setNewParamWeight(e.target.value)}
                      placeholder="%"
                      size="small"
                      variant="standard"
                      className="curatex-new-weight-input"
                      InputProps={{ disableUnderline: true }}
                    />
                  </div>

                  <IconButton size="small" className="curatex-profile-delete">
                    <DeleteOutlineOutlined className="curatex-trash-icon" />
                  </IconButton>
                </>
              )}
            </div>

            {profileEditMode && !isAddingParameter && (
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
            {profileEditMode || isAddingParameter ? (
              <>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
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

                <Button
                  variant="outlined"
                  onClick={() => setProfileEditMode?.(true)}
                  className="curatex-secondary-button curatex-edit-button"
                >
                  Edit Values
                </Button>
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
          <AgentHeader label="INOVAPATH CURATEX AGENT" />
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
    return (
      <Box className="curatex-page">
        <div className="curatex-user-row">
          <div className="curatex-user-bubble">
            <Typography className="curatex-user-name">
              DR. PRIYA (YOU)
            </Typography>

            <Typography className="curatex-user-text">
              Submit Profile
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card curatex-results-card">
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography className="curatex-body-text curatex-results-intro">
            {/* Was "Scoring 124 compounds against your JAK2 target product
                profile" on every run, whatever the target or the count. */}
            {resultsError
              ? resultsError
              : resultsLoading
              ? "Loading scored candidates…"
              : curateXResults.length
              ? `Scored ${curateXResults.length} candidate${curateXResults.length === 1 ? "" : "s"} against your ${targetLabel} target product profile. Here are the top candidates:`
              : `No candidates were returned for your ${targetLabel} target product profile.`}
          </Typography>

          {resultsError && onRetryResults && (
            <Button onClick={onRetryResults} className="curatex-secondary-button">
              Try again
            </Button>
          )}

          <div className="curatex-results-table">
            <div className="curatex-results-header">
              <Typography className="curatex-results-header-cell">
                RANK
              </Typography>
              <Typography className="curatex-results-header-cell">
                COMPOUND
              </Typography>
              <Typography className="curatex-results-header-cell">
                MATCHED PROPERTIES
              </Typography>
              <Typography className="curatex-results-header-cell">
                MISMATCHED
              </Typography>
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

                    <Typography className="curatex-matched-properties">
                      {compound.matchedProps}
                    </Typography>

                    <Typography className="curatex-mismatched-properties">
                      {compound.mismatchedProps}
                    </Typography>

                    <Typography className="curatex-row-chevron">
                      {isExpanded ? "⌃" : "›"}
                    </Typography>
                  </div>

                  {isExpanded && (
                    <div className="curatex-match-details">
                      <div className="curatex-match-details-heading">
                        <Typography className="curatex-match-details-title">
                          Match Details — {compound.name} vs JAK2 Target
                          Profile
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
                            <Typography
                              className={`curatex-match-detail-status ${
                                detail.status === "partial" ? "is-partial" : "is-match"
                              }`}
                            >
                              {detail.status === "partial" ? "~" : "✓"}
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
                ? `Showing ${(page - 1) * CURATEX_PAGE_SIZE + 1}-${(page - 1) * CURATEX_PAGE_SIZE + curateXResults.length} of ${total} compound${total === 1 ? "" : "s"}`
                : "No compounds on this page"}
            </Typography>
          </div>

          <div className="curatex-recommendation-card">
            <Typography className="curatex-recommendation-title">
              Recommendation
            </Typography>

            <Typography className="curatex-recommendation-text">
              Metformin and Pioglitazone are the strongest candidates. Both
              match on molecular weight, route of administration, and
              half-life. Metformin scores highest due to superior
              bioavailability alignment. Recommend carrying both forward to
              screening.
            </Typography>
          </div>

          <div className="curatex-results-actions">
            <Button
              variant="outlined"
              className="curatex-secondary-button"
            >
              Branch
            </Button>

            <Button
              variant="outlined"
              className="curatex-secondary-button"
            >
              Rerun
            </Button>

            <Button
              variant="contained"
              onClick={handleNextFromResults}
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
  // ---------------------------------------------------------------------------
  if (workflowPhase === "curatex-data-source") {
    const compound = activeCompound;

    return (
      <Box className="curatex-data-source-page">
        <Button
          onClick={handleBackToResults}
          className="curatex-back-link"
        >
          ← Back to Results
        </Button>

        <Typography className="curatex-data-source-title">
          Data Source: {compound?.name || "Metformin"} — JAK2 Match
        </Typography>

        <div className="curatex-source-summary-card">
          <SourceSummary
            label="Compound Name"
            value={compound?.name || "Metformin"}
            accent
          />

          <SourceSummary label="CAS Number" value="657-24-9" />

          <SourceSummary label="Molecular Formula" value="C₄H₁₁N₅" />

          <SourceSummary label="DrugBank ID" value="DB00331" />

          <div className="curatex-source-summary-field">
            <Typography className="curatex-source-label">
              Overall Match Score
            </Typography>

            <div className="curatex-score-badge">94%</div>
          </div>
        </div>

        <Typography className="curatex-source-section-title">
          Source Data Comparison
        </Typography>

        <div className="curatex-source-table">
          <SourceTableHeader />

          <SourceRow
            parameter="Molecular Weight"
            target="< 500 Da"
            value="129.16 Da"
            source="DrugBank"
            status="✓ Match"
            statusType="match"
            confidence="High"
          />

          <SourceRow
            parameter="Bioavailability"
            target="> 60%"
            value="50-60%"
            source="FDA Label"
            status="⚠ Partial"
            statusType="partial"
            confidence="Medium"
          />

          <SourceRow
            parameter="Half-life"
            target="8-12 hours"
            value="6.2 hours"
            source="PubChem"
            status="✕ Mismatch"
            statusType="mismatch"
            confidence="High"
          />

          <SourceRow
            parameter="LogP"
            target="1.5-3.5"
            value="-1.43"
            source="ChEMBL"
            status="✕ Mismatch"
            statusType="mismatch"
            confidence="High"
          />

          <SourceRow
            parameter="Solubility"
            target="> 10 mg/mL"
            value=">300 mg/mL"
            source="DrugBank"
            status="✓ Match"
            statusType="match"
            confidence="High"
          />

          <SourceRow
            parameter="Route of Administration"
            target="Oral"
            value="Oral"
            source="FDA Label"
            status="✓ Match"
            statusType="match"
            confidence="High"
          />

          <SourceRow
            parameter="Mechanism of Action"
            target="JAK2 Inhibition"
            value="AMPK Activation"
            source="PubMed"
            status="⚠ Partial"
            statusType="partial"
            confidence="Medium"
          />

          <SourceRow
            parameter="Indication"
            target="Type 2 Diabetes"
            value="Type 2 Diabetes"
            source="DailyMed"
            status="✓ Match"
            statusType="match"
            confidence="High"
          />

          <SourceRow
            parameter="Plasma Protein Binding"
            target="< 90%"
            value="Negligible"
            source="DrugBank"
            status="✓ Match"
            statusType="match"
            confidence="High"
          />
        </div>

        <Typography className="curatex-source-section-title">
          Source References
        </Typography>

        <div className="curatex-source-references">
          <SourceReference
            number="1"
            title="DrugBank (DB00331)"
            updated="Last updated: Jan 2024"
            url="drugbank.ca/drugs/DB00331"
          />

          <SourceReference
            number="2"
            title="PubChem (CID 4091)"
            updated="Last updated: Mar 2024"
            url="pubchem.ncbi.nlm.nih.gov"
          />

          <SourceReference
            number="3"
            title="ChEMBL (CHEMBL1431)"
            updated="Last updated: Feb 2024"
            url="ebi.ac.uk/chembl"
          />

          <SourceReference
            number="4"
            title="FDA Label"
            updated="Approval: 1995"
            url="accessdata.fda.gov"
          />

          <SourceReference
            number="5"
            title="PubMed"
            updated="3 relevant articles cited"
            url="pubmed.ncbi.nlm.nih.gov"
          />
        </div>
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
        <div className="curatex-user-row">
          <div className="curatex-user-bubble curatex-user-bubble--wide">
            <Typography className="curatex-user-name">
              DR. PRIYA (YOU)
            </Typography>

            <Typography className="curatex-user-text">
              Tell me more about {compound?.name || "Metformin"} - mechanism
              of action, current uses, and patent status.
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card curatex-exploration-card">
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography className="curatex-body-text curatex-exploration-intro">
            Here is the detailed compound profile for{" "}
            {compound?.name || "Metformin"}:
          </Typography>

          <div className="curatex-compound-detail-card">
            <Typography className="curatex-compound-detail-title">
              {compound?.name || "Metformin"} - Compound Detail
            </Typography>

            <Typography className="curatex-compound-detail-subtitle">
              Summary of mechanism, clinical use, and IP status.
            </Typography>

            <CompoundSection
              title="Mechanism of Action"
              text="Metformin activates AMP-activated protein kinase (AMPK), reducing hepatic glucose production and improving insulin sensitivity. In the context of JAK2 inhibition, recent studies suggest Metformin may modulate JAK-STAT signaling indirectly through AMPK activation."
            />

            <CompoundSection
              title="Current Uses"
              text="First-line therapy for Type 2 Diabetes. Also used off-label for PCOS, weight management, and under investigation for anti-aging and oncology applications."
            />

            <CompoundSection
              title="Patent Status"
              text="Original patents expired. Generic formulations widely available. Novel formulations and combination therapies may carry active IP - 3 relevant patents identified by NovSearch."
            />

            <CompoundSection
              title="Match Score"
              text="94% - Strong alignment on 5 of 6 target profile properties."
              last
            />
          </div>

          <Typography className="curatex-source-note">
            Source: PubMed, DrugBank, USPTO via NovSearch
          </Typography>

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
    return (
      <Box className="curatex-page curatex-candidate-page">
        <div className="curatex-agent-card curatex-candidate-question-card">
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography className="curatex-body-text curatex-candidate-question">
            Would you like to select specific candidates for screening, or
            should I proceed with the top-ranked compounds (Metformin and
            Pioglitazone) automatically?
          </Typography>
        </div>

        <div className="curatex-user-row">
          <div className="curatex-user-bubble curatex-user-bubble--wide">
            <Typography className="curatex-user-name">
              DR. PRIYA (YOU)
            </Typography>

            <Typography className="curatex-user-text">
              Go with the top two - Metformin and Pioglitazone. Send them to
              ScreenSuite for docking.
            </Typography>
          </div>
        </div>

        <div className="curatex-agent-card curatex-candidate-card">
          <AgentHeader label="INOVAPATH CURATEX AGENT" />

          <Typography className="curatex-body-text curatex-candidate-intro">
            Selected candidates forwarded to ScreenSuite for molecular
            docking:
          </Typography>

          {["Metformin", "Pioglitazone"].map((compoundName) => (
            <div className="curatex-candidate-compound" key={compoundName}>
              <Typography className="curatex-candidate-name">
                {compoundName}
              </Typography>

              <Typography className="curatex-candidate-target">
                Target: JAK2
              </Typography>
            </div>
          ))}

          <Typography className="curatex-candidate-status">
            ScreenSuite is now running PLP docking simulations. Estimated
            completion: ~5 minutes.
          </Typography>

          <div className="curatex-candidate-actions">
            <Button
              variant="contained"
              onClick={handleViewInScreenSuite}
              disabled={continuePending}
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

const SourceTableHeader = () => (
  <div className="curatex-source-table-header">
    {[
      "PARAMETER",
      "TARGET CRITERION",
      "SOURCE VALUE",
      "SOURCE",
      "MATCH STATUS",
      "CONFIDENCE",
    ].map((header) => (
      <Typography key={header} className="curatex-source-table-header-cell">
        {header}
      </Typography>
    ))}
  </div>
);

const SourceRow = ({
  parameter,
  target,
  value,
  source,
  status,
  statusType,
  confidence,
}) => (
  <div className="curatex-source-table-row">
    <Typography className="curatex-source-cell strong">
      {parameter}
    </Typography>

    <Typography className="curatex-source-cell">{target}</Typography>

    <Typography className="curatex-source-cell strong">
      {value}
    </Typography>

    <Typography className="curatex-source-cell">{source}</Typography>

    <div>
      <span
        className={`curatex-status-badge curatex-status-${statusType}`}
      >
        {status}
      </span>
    </div>

    <div>
      <span
        className={`curatex-confidence-badge ${
          confidence === "High" ? "is-high" : "is-medium"
        }`}
      >
        {confidence}
      </span>
    </div>
  </div>
);

const SourceReference = ({ number, title, updated, url }) => (
  <div className="curatex-source-reference">
    <div className="curatex-source-reference-left">
      <div className="curatex-source-reference-number">{number}</div>

      <div>
        <Typography className="curatex-source-reference-title">
          {title}
        </Typography>

        <Typography className="curatex-source-reference-updated">
          {updated}
        </Typography>
      </div>
    </div>

    <Typography className="curatex-source-reference-url">{url}</Typography>
  </div>
);

const CompoundSection = ({ title, text, last = false }) => (
  <div className={`curatex-compound-section ${last ? "is-last" : ""}`}>
    <Typography className="curatex-compound-section-title">
      {title}
    </Typography>

    <Typography className="curatex-compound-section-text">
      {text}
    </Typography>
  </div>
);

export default CuratexPhase;