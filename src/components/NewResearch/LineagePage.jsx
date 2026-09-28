import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Step,
  StepLabel,
  Stepper,
  StepConnector,
} from "@mui/material";
import {
  Check as CheckIcon,
  DeleteOutline as DeleteOutlineIcon,
  EditOutlined as EditOutlinedIcon,
} from "@mui/icons-material";

import "./LineagePage.css";

/*
 * Everything on this page used to be a fixed mock-up: "Fork ancestry for the
 * active branch. Lit: TP53 (pending), EGFR (pending)…", "Main - JAK2 + TPOR
 * (MPL)", "Forked at Target identification", "Alt - JAK2 + TPOR (MPL)" and a
 * fixed six-step list, whatever the session was. It now comes from the live
 * session via the `lineage` prop built in CompleteWorkflow:
 *   { mainLabel, branch: { name, target, forkedAt } | null,
 *     steps: [{ id, title, status, selection }] }
 */

/* -------------------------------------------------
   CUSTOM STEP CONNECTOR
-------------------------------------------------- */

function LineageConnector() {
  return <StepConnector className="lineage-connector" />;
}

/* -------------------------------------------------
   CUSTOM STEP ICON
-------------------------------------------------- */

function LineageStepIcon(props) {
  const { active, completed, icon } = props;

  return (
    <div
      className={`lineage-step-icon ${
        completed
          ? "lineage-step-icon--completed"
          : active
          ? "lineage-step-icon--active"
          : "lineage-step-icon--pending"
      }`}
    >
      {completed ? <CheckIcon className="lineage-check-icon" /> : icon}
    </div>
  );
}

/* -------------------------------------------------
   STATUS CHIP
-------------------------------------------------- */

function StatusChip({ status }) {
  const statusConfig = {
    accepted: {
      label: "ACCEPTED",
      className: "status-chip--accepted",
    },

    awaiting: {
      label: "AWAITING DECISION",
      className: "status-chip--awaiting",
    },

    pending: {
      label: "PENDING",
      className: "status-chip--pending",
    },

    completed: {
      label: "COMPLETED",
      className: "status-chip--accepted",
    },

    running: {
      label: "RUNNING",
      className: "status-chip--awaiting",
    },

    failed: {
      label: "FAILED",
      className: "status-chip--pending",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Chip
      label={config.label}
      size="small"
      className={`status-chip ${config.className}`}
    />
  );
}

/* -------------------------------------------------
   STEP CARD
-------------------------------------------------- */

function LineageStepCard({ step, active, onClick }) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      className={`lineage-step-card ${
        active ? "lineage-step-card--active" : ""
      }`}
    >
      <div className="lineage-step-card__header">
        <div>
          <div className="lineage-step-number">
            STEP {String(step.id).padStart(2, "0")}
          </div>

          <div className="lineage-step-title">{step.title}</div>
        </div>

        <StatusChip status={step.status} />
      </div>

      {step.selection ? (
        <div className="lineage-selection-box">
          <div className="lineage-selection-label">SELECTION:</div>

          <div className="lineage-selection-value">
            {step.selection}
          </div>
        </div>
      ) : (
        <div className="lineage-no-selection">
          No selection yet on this step.
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------- */

function LineagePage({ lineage = null }) {
  const liveSteps = lineage?.steps ?? [];
  const [steps, setSteps] = useState(liveSteps);

  // Follow the session: the steps' status and selections change as it runs.
  useEffect(() => {
    setSteps(liveSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(liveSteps)]);

  // Step that is currently selected/active: the first one not yet done.
  const firstOpen = liveSteps.findIndex((st) => st.status !== "completed" && st.status !== "accepted");
  const [activeStep, setActiveStep] = useState(firstOpen >= 0 ? firstOpen : 0);

  const branch = lineage?.branch ?? null;
  // "Fork ancestry" line: each step with its selection and status, live.
  const ancestry = steps
    .filter((st) => st.selection || st.status !== "pending")
    .map((st) => `${st.title}: ${st.selection || "no selection"} (${st.status})`)
    .join(" · ");

  /* -------------------------------------------------
     HANDLE STEP CLICK
  -------------------------------------------------- */

  const handleStepClick = (index) => {
    setActiveStep(index);
  };

  /* -------------------------------------------------
     ACCEPT CURRENT STEP AND MOVE TO NEXT STEP
  -------------------------------------------------- */

  const handleAcceptAndContinue = () => {
    setSteps((currentSteps) =>
      currentSteps.map((step, index) => {
        if (index === activeStep) {
          return {
            ...step,
            status: "accepted",
          };
        }

        if (
          index === activeStep + 1 &&
          step.status === "pending"
        ) {
          return {
            ...step,
            status: "awaiting",
          };
        }

        return step;
      })
    );

    if (activeStep < steps.length - 1) {
      setActiveStep((currentStep) => currentStep + 1);
    }
  };

  /* -------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="lineage-page">
      <div className="lineage-container">

        {/* ============================================
            HOW YOU GOT HERE
        ============================================= */}

        <div className="lineage-section-label">
          HOW YOU GOT HERE
        </div>

        <div className="lineage-description">
          {branch ? "Fork ancestry for the active branch." : "The main research path."}
          {ancestry ? ` ${ancestry}.` : " No steps have run yet."}
        </div>

        {/* Rename / Delete */}

        <div className="lineage-actions">
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditOutlinedIcon />}
            className="lineage-outline-button"
          >
            Rename
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteOutlineIcon />}
            className="lineage-delete-button"
          >
            Delete
          </Button>
        </div>

        {/* ============================================
            BREADCRUMB
        ============================================= */}

        <Card
          elevation={0}
          className="lineage-breadcrumb-card"
        >
          <div className="lineage-breadcrumb">
            <span className="lineage-breadcrumb-main">
              {lineage?.mainLabel || "Main"}
            </span>

            {branch && (
              <>
                <span className="lineage-breadcrumb-arrow">
                  &gt;
                </span>

                <span className="lineage-breadcrumb-secondary">
                  Forked at {branch.forkedAt}
                </span>

                <span className="lineage-breadcrumb-arrow">
                  &gt;
                </span>
              </>
            )}
          </div>

          {branch && (
            <Chip
              label={`${branch.name}${branch.target ? ` - ${branch.target}` : ""}`}
              size="small"
              className="lineage-branch-chip"
            />
          )}
        </Card>

        {/* ============================================
            STEP DECISIONS
        ============================================= */}

        <div className="lineage-section-label lineage-section-label--steps">
          STEP DECISIONS
        </div>

        <div className="lineage-description">
          Selections and reviewer notes on this branch.
        </div>

        {/* ============================================
            DYNAMIC STEPPER
        ============================================= */}

        <Stepper
          activeStep={activeStep}
          orientation="vertical"
          connector={<LineageConnector />}
          className="lineage-stepper"
        >
          {steps.map((step, index) => (
            <Step
              key={step.id}
              completed={step.status === "accepted"}
            >
              <StepLabel
                StepIconComponent={LineageStepIcon}
                className="lineage-step-label"
              >
                <LineageStepCard
                  step={step}
                  active={activeStep === index}
                  onClick={() => handleStepClick(index)}
                />
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ============================================
            ACCEPT BUTTON
        ============================================= */}

        <div className="lineage-footer-actions">
          <Button
            variant="contained"
            onClick={handleAcceptAndContinue}
            disabled={steps[activeStep]?.status === "accepted"}
            className="lineage-accept-button"
          >
            Accept & Continue
          </Button>
        </div>

      </div>
    </div>
  );
}

export default LineagePage;