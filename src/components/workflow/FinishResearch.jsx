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

/**
 * With branches, a branch can be finished on its own (it does not finish the
 * others, testing 2026-10-16) or every branch at once, which saves the
 * session and summarises all of them. Without branches it is End Task.
 */
const DecisionCard = ({ onContinue, hasBranches, branchLabel, onFinishBranch, onFinishAll, pending, error }) => (
  <Box sx={card}>
    <Header />
    <Typography sx={{ ...text, fontSize: "15px", lineHeight: "22px", mb: "16px" }}>
      {hasBranches
        ? `Would you like to continue exploring, finish the ${branchLabel} branch, or finish every branch? Finishing all branches saves the session.`
        : "Would you like to continue exploring or conclude this research session? Ending the task saves the session."}
    </Typography>

    <Box sx={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
      <Button onClick={onContinue} disabled={Boolean(pending)} sx={primaryButton}>
        Continue Research
      </Button>
      <Button
        onClick={onFinishBranch}
        disabled={!onFinishBranch || Boolean(pending)}
        title={onFinishBranch ? undefined : "Saving the session is not available here"}
        sx={buttonBase}
      >
        {pending === "branch"
          ? hasBranches ? "Finishing…" : "Saving the session…"
          : hasBranches ? `Finish ${branchLabel}` : "End Task"}
      </Button>
      {hasBranches && (
        <Button onClick={onFinishAll} disabled={!onFinishAll || Boolean(pending)} sx={buttonBase}>
          {pending === "all" ? "Finishing all branches…" : "Finish all branches"}
        </Button>
      )}
    </Box>

    {error && (
      <Typography role="alert" sx={{ ...text, fontSize: "13px", lineHeight: "20px", color: "#DC2626", mt: "12px" }}>
        {error}
      </Typography>
    )}
  </Box>
);

const SummaryCard = ({ sessionReport, researcherName, onNewResearch, heading, intro, status }) => {
  const [exportBlocked, setExportBlocked] = useState(false);
  const sections = sessionReport?.sections ?? [];
  const diseaseLabel = sessionReport?.disease || "";

  return (
    <Box sx={card}>
      <Header />
      <Typography sx={{ ...text, fontSize: "15px", lineHeight: "22px", fontWeight: 500, mb: "14px" }}>
        {intro}
      </Typography>

      <Typography sx={summaryText}>
        {`${heading} - ${diseaseLabel || "Drug Repurposing"}\n`}
        {sessionReport?.target ? `Target: ${sessionReport.target}\n` : ""}
        {diseaseLabel ? `Disease: ${diseaseLabel}\n` : ""}
        {researcherName ? `Researcher: ${researcherName}\n` : ""}
        {`Status: ${status}`}
      </Typography>

      {sections.map((section) => (
        <React.Fragment key={section.key}>
          <Divider />
          <Typography sx={summaryText}>
            {`${section.title}:\n✓ ${section.summary}`}
            {section.note ? `\n${section.note}` : ""}
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
          onClick={() => setExportBlocked(!printSessionReport(sessionReport, { researcherName, heading }))}
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
 * @param {"decision"|"summary"|"all"} stage
 * @param {boolean} hasBranches - the session has branches besides Main.
 * @param {string} branchLabel - the branch in view ("Main" for Main).
 * @param {() => Promise<void>} onFinishBranch - finishes the branch in view
 *   (without branches: saves the session); rejects with the reason.
 * @param {() => Promise<void>} onFinishAll - saves the session and builds the
 *   summary across branches; rejects with the reason.
 * @param {object} sessionReport - the branch in view's report.
 * @param {{ status: "loading"|"ready", report?: object }} allReport - the
 *   report across branches, for stage "all".
 */
const FinishResearch = ({
  stage,
  onContinue,
  hasBranches = false,
  branchLabel = "Main",
  onFinishBranch,
  onFinishAll,
  sessionReport,
  allReport = null,
  onNewResearch,
}) => {
  const { displayName: researcherName } = useCurrentUser();
  const [state, setState] = useState({ pending: null, error: null });

  const run = (which, action) => async () => {
    setState({ pending: which, error: null });
    try {
      await action();
      setState({ pending: null, error: null });
    } catch (err) {
      setState({ pending: null, error: err?.message || "The session could not be saved. Please try again." });
    }
  };

  if (stage === "all") {
    if (allReport?.status !== "ready") {
      return (
        <Box sx={card}>
          <Header />
          <Typography sx={{ ...text, fontSize: "14px", lineHeight: "22px" }}>
            Building the summary for every branch…
          </Typography>
        </Box>
      );
    }
    return (
      <SummaryCard
        sessionReport={allReport.report}
        researcherName={researcherName}
        onNewResearch={onNewResearch}
        heading="Research Summary — all branches"
        intro="Every branch is finished and the session is saved. Here is the overall summary, then each branch:"
        status="SAVED ✓"
      />
    );
  }

  if (stage === "summary") {
    return (
      <SummaryCard
        sessionReport={sessionReport}
        researcherName={researcherName}
        onNewResearch={onNewResearch}
        heading={hasBranches ? `Research Summary — ${branchLabel}` : "Research Summary"}
        intro={
          hasBranches
            ? `The ${branchLabel} branch is finished; the other branches are unchanged. Here is its summary:`
            : "Research task completed and the session is saved. Here is your final summary:"
        }
        status={hasBranches ? "BRANCH FINISHED ✓" : "SAVED ✓"}
      />
    );
  }

  return (
    <DecisionCard
      onContinue={onContinue}
      hasBranches={hasBranches}
      branchLabel={branchLabel}
      onFinishBranch={onFinishBranch ? run("branch", onFinishBranch) : undefined}
      onFinishAll={onFinishAll ? run("all", onFinishAll) : undefined}
      pending={state.pending}
      error={state.error}
    />
  );
};

export default FinishResearch;
