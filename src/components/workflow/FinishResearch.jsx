import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { TEAL } from "./workflowConstants";
import AgentHeader from "./AgentHeader";
import { printSessionReport } from "../../workflow/sessionReport";
import { useCurrentUser } from "../../context/CurrentUserContext";

/**
 * Finish Research: the Continue / End Task choice and the closing summary.
 *
 * These lived inside the NovSearch card, so a session could only be finished
 * after NovSearch (demo 2026-10-15). They are drawn once, at the end of the
 * workspace conversation, and opened from the toolbar or from any module.
 * The summary covers every module the session ran (workflow/sessionReport.js).
 */

const FONT = "'Inter', sans-serif";

const text = {
  fontFamily: FONT,
  color: "#1E293B",
};

const buttonBase = {
  minHeight: "40px",
  height: "40px",
  padding: "0 16px",
  borderRadius: "8px",
  border: "1px solid #DCE3EA",
  background: "#FFFFFF",
  color: "#1E293B",
  fontFamily: FONT,
  fontSize: "13px",
  fontWeight: 500,
  textTransform: "none",
  boxShadow: "none",
  whiteSpace: "nowrap",
  "&:hover": {
    background: "#F8FAFC",
    borderColor: "#CBD5E1",
    boxShadow: "none",
  },
};

const primaryButton = {
  ...buttonBase,
  background: TEAL,
  borderColor: TEAL,
  color: "#FFFFFF",
  fontWeight: 600,
  "&:hover": {
    background: "#00A9BF",
    borderColor: "#00A9BF",
  },
};

const card = {
  width: "100%",
  maxWidth: "760px",
  boxSizing: "border-box",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  background: "#FFFFFF",
  padding: "16px 20px 20px",
};

const summaryText = {
  ...text,
  fontSize: "13px",
  lineHeight: "21px",
  whiteSpace: "pre-line",
};

const Divider = () => (
  <Box sx={{ width: "176px", borderTop: "1px solid #7B8491", mt: "12px", mb: "10px" }} />
);

const Header = () => <AgentHeader label="Research Summary" />;

const DecisionCard = ({ onContinue, onEndTask, pending, error }) => (
  <Box sx={card}>
    <Header />
    <Typography sx={{ ...text, fontSize: "15px", lineHeight: "22px", mb: "16px" }}>
      Would you like to continue exploring or conclude this research
      session? Ending the task saves the session.
    </Typography>

    <Box sx={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
      <Button onClick={onContinue} disabled={pending} sx={primaryButton}>
        Continue Research
      </Button>
      <Button
        onClick={onEndTask}
        disabled={!onEndTask || pending}
        title={onEndTask ? undefined : "Saving the session is not available here"}
        sx={buttonBase}
      >
        {pending ? "Saving the session…" : "End Task"}
      </Button>
    </Box>

    {error && (
      <Typography role="alert" sx={{ ...text, fontSize: "13px", lineHeight: "20px", color: "#DC2626", mt: "12px" }}>
        {error}
      </Typography>
    )}
  </Box>
);

const SummaryCard = ({ sessionReport, researcherName, onNewResearch }) => {
  const [exportBlocked, setExportBlocked] = useState(false);
  const sections = sessionReport?.sections ?? [];
  const diseaseLabel = sessionReport?.disease || "";

  return (
    <Box sx={card}>
      <Header />
      <Typography sx={{ ...text, fontSize: "15px", lineHeight: "22px", fontWeight: 500, mb: "14px" }}>
        Research task completed and the session is saved. Here is your final summary:
      </Typography>

      <Typography sx={summaryText}>
        {`Research Summary - ${diseaseLabel || "Drug Repurposing"}\n`}
        {sessionReport?.target ? `Target: ${sessionReport.target}\n` : ""}
        {diseaseLabel ? `Disease: ${diseaseLabel}\n` : ""}
        {researcherName ? `Researcher: ${researcherName}\n` : ""}
        {"Status: SAVED ✓"}
      </Typography>

      {sections.map((section) => (
        <React.Fragment key={section.key}>
          <Divider />
          <Typography sx={summaryText}>
            {`${section.title}:\n✓ ${section.summary}`}
            {section.items.length ? `\n${section.items.map((item, i) => `${i + 1}. ${item}`).join("\n")}` : ""}
          </Typography>
        </React.Fragment>
      ))}

      <Typography sx={{ ...text, fontSize: "13px", lineHeight: "20px", fontWeight: 600, mt: "12px", mb: "10px" }}>
        What would you like to do next?
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <Button
          sx={primaryButton}
          onClick={() => setExportBlocked(!printSessionReport(sessionReport, { researcherName }))}
          disabled={!sections.length}
        >
          Export Report
        </Button>
        <Button sx={buttonBase} onClick={onNewResearch}>+ New Research</Button>
      </Box>

      {exportBlocked && (
        <Typography role="alert" sx={{ ...text, fontSize: "12px", color: "#DC2626", mt: "8px" }}>
          The report window was blocked. Allow pop-ups for this site and try again.
        </Typography>
      )}
    </Box>
  );
};

/**
 * @param {"decision"|"summary"} stage
 * @param {() => Promise<void>} onEndTask - saves the session; rejects with the reason.
 * @param {() => void} onContinue - closes the panel.
 * @param {() => void} onSaved - End Task succeeded; the parent moves to "summary".
 */
const FinishResearch = ({ stage, onContinue, onEndTask, onSaved, sessionReport, onNewResearch }) => {
  const { displayName: researcherName } = useCurrentUser();
  const [state, setState] = useState({ pending: false, error: null });

  const handleEndTask = async () => {
    setState({ pending: true, error: null });
    try {
      await onEndTask();
      setState({ pending: false, error: null });
      onSaved?.();
    } catch (err) {
      setState({ pending: false, error: err?.message || "The session could not be saved. Please try again." });
    }
  };

  if (stage === "summary") {
    return <SummaryCard sessionReport={sessionReport} researcherName={researcherName} onNewResearch={onNewResearch} />;
  }
  return (
    <DecisionCard
      onContinue={onContinue}
      onEndTask={onEndTask ? handleEndTask : undefined}
      pending={state.pending}
      error={state.error}
    />
  );
};

export default FinishResearch;
