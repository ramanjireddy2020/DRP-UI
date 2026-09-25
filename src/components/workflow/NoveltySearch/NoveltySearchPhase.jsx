import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Checkbox, Typography } from "@mui/material";
import { definitionFor } from "../../../workflow/txkgResult";
import { TEAL, GRAY_BG } from "../workflowConstants";
import PhaseActions from "../PhaseActions";
import FormattedText from "../FormattedText";
import { printSessionReport } from "../../../workflow/sessionReport";
import novsearchApi from "../../../services/api/novsearch";

import SharedAgentHeader from "../AgentHeader";
import { useCurrentUser } from "../../../context/CurrentUserContext";

const NOVSEARCH_FONT = "'Inter', sans-serif";

/* ============================================================================
   DATA
============================================================================ */

/* ============================================================================
   SHARED STYLES
============================================================================ */

/**
 * Novelty / risk terms in the assessment, colour-coded.
 *
 * Testing found the assessment in Insights unformatted: plain grey text with
 * no emphasis or colour. The assessment's markdown is now rendered, these terms
 * are made bold where they appear, and each one found is shown as a chip.
 */
const ASSESSMENT_TERMS = [
  // Checked first, so "moderately novel" / "not novel" are not read as Novel.
  { pattern: /\b(moderate(ly)? novel|moderate novelty|partially (covered|explored)|some prior art)\b/i, label: "Moderate", color: "#B45309", bg: "#FEF3C7" },
  { pattern: /\b(crowded|well[- ]explored|heavily patented|extensive prior art|not novel|low novelty)\b/i, label: "Crowded", color: "#B91C1C", bg: "#FEE2E2" },
  { pattern: /(?<!moderately |moderate |not |low )\b(highly novel|novel|unexplored|white space|no prior art)\b(?! ?novelty)/i, label: "Novel", color: "#047857", bg: "#D1FAE5" },
  { pattern: /\b(freedom to operate|fto)\b/i, label: "Freedom to operate", color: "#1D4ED8", bg: "#DBEAFE" },
  { pattern: /\b(high risk|infringement risk)\b/i, label: "High risk", color: "#B91C1C", bg: "#FEE2E2" },
  { pattern: /\b(low risk)\b/i, label: "Low risk", color: "#047857", bg: "#D1FAE5" },
];

const emphasiseTerms = (value) =>
  ASSESSMENT_TERMS.reduce(
    (acc, term) =>
      acc.replace(new RegExp(term.pattern.source, "gi"), (m, ...rest) => {
        const offset = rest[rest.length - 2];
        const whole = rest[rest.length - 1];
        // Leave terms that are already bold alone.
        return whole.slice(Math.max(0, offset - 2), offset) === "**" ? m : `**${m}**`;
      }),
    String(value ?? "")
  );

const AssessmentChips = ({ value }) => {
  const found = ASSESSMENT_TERMS.filter((term) => term.pattern.test(String(value ?? "")));
  if (!found.length) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", mb: "8px" }}>
      {found.map((term) => (
        <Box key={term.label} sx={{ px: "8px", py: "2px", borderRadius: "10px", bgcolor: term.bg }}>
          <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, color: term.color, lineHeight: "14px" }}>
            {term.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const text = {
  fontFamily: NOVSEARCH_FONT,
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
  fontFamily: NOVSEARCH_FONT,
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

/* ============================================================================
   SVG ICONS
============================================================================ */


const LinkIcon = ({ color = TEAL }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M10 13.5L14 9.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7.5 16.5L5.8 18.2C4.25 19.75 1.75 19.75 0.2 18.2C-1.35 16.65-1.35 14.15 0.2 12.6L4.4 8.4C5.95 6.85 8.45 6.85 10 8.4"
      transform="translate(3 0)"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M14 15.6C15.55 17.15 18.05 17.15 19.6 15.6L23.8 11.4C25.35 9.85 25.35 7.35 23.8 5.8C22.25 4.25 19.75 4.25 18.2 5.8L16.5 7.5"
      transform="translate(-3 0)"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PlusIcon = () => (
  <Typography
    component="span"
    sx={{
      fontFamily: NOVSEARCH_FONT,
      fontSize: "22px",
      lineHeight: "22px",
      color: "#64748B",
      fontWeight: 400,
    }}
  >
    +
  </Typography>
);

const ArrowUpIcon = () => (
  <Typography
    component="span"
    sx={{
      fontFamily: NOVSEARCH_FONT,
      fontSize: "21px",
      lineHeight: "21px",
      color: "#FFFFFF",
      fontWeight: 400,
    }}
  >
    ↑
  </Typography>
);

const MicIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
  >
    <rect
      x="8"
      y="3"
      width="8"
      height="12"
      rx="4"
      stroke="#94A3B8"
      strokeWidth="2"
    />
    <path
      d="M5 11V12C5 15.866 8.134 19 12 19C15.866 19 19 15.866 19 12V11"
      stroke="#94A3B8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 19V22"
      stroke="#94A3B8"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/* ============================================================================
   AGENT HEADER
============================================================================ */

/**
 * Item T5: the local header is gone. The shared AgentHeader renders the one
 * agreed form for every module — name as written, full agent name beneath.
 */
const AgentHeader = () => <SharedAgentHeader moduleKey="novsearch" />;

/* ============================================================================
   USER MESSAGE
============================================================================ */

const UserMessage = ({ children }) => {
  const { chatLabel: userLabel } = useCurrentUser();
  return (
  <Box
    sx={{
      display: "flex",
      justifyContent: "flex-end",
      width: "100%",
      mb: "34px",
    }}
  >
    <Box
      sx={{
        width: "490px",
        maxWidth: "100%",
        minHeight: "81px",
        boxSizing: "border-box",
        padding: "16px",
        background: "#F0FDFA",
        borderRadius: "12px",
      }}
    >
      <Typography
        sx={{
          ...text,
          fontSize: "11px",
          lineHeight: "14px",
          fontWeight: 700,
          color: TEAL,
          mb: "12px",
        }}
      >
        {userLabel}
      </Typography>

      <Typography
        sx={{
          ...text,
          fontSize: "15px",
          lineHeight: "22px",
          fontWeight: 400,
          color: "#1E293B",
        }}
      >
        {children}
      </Typography>
    </Box>
  </Box>
  );
};

/* ============================================================================
   RESULTS TABLE
============================================================================ */

/**
 * @param {object[]} rows - normalised patents from
 *   GET /agents/novsearch/{jobId}/report — { id, title, relevance }.
 * @param {boolean} selectable - adds the checkbox column Compare reads from.
 */
const PatentTable = ({ rows = [], selectable = false, selectedIds = [], onToggle, emptyText, relevanceHelp = null }) => {
  const columns = selectable
    ? "32px 120px minmax(0, 1fr) 94px"
    : "120px minmax(0, 1fr) 94px";

  return (
    <Box
      sx={{
        width: "100%",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#FFFFFF",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: columns,
          alignItems: "center",
          minHeight: "50px",
          padding: "0 14px",
          boxSizing: "border-box",
          background: "#F8FAFC",
        }}
      >
        {selectable && <Box />}
        <Typography sx={tableHeader}>PATENT ID</Typography>
        <Typography sx={tableHeader}>TITLE</Typography>
        {/* What relevance measures, from the report's scoreDefinitions. */}
        <Typography sx={{ ...tableHeader, cursor: relevanceHelp ? "help" : "default" }} title={relevanceHelp || undefined}>
          RELEVANCE{relevanceHelp ? " ⓘ" : ""}
        </Typography>
      </Box>

      {rows.length === 0 && emptyText && (
        <Typography sx={{ ...tableCell, color: "#64748B", padding: "14px", borderTop: "1px solid #E2E8F0" }}>
          {emptyText}
        </Typography>
      )}

      {rows.map((patent) => (
        <Box
          key={patent.id}
          sx={{
            display: "grid",
            gridTemplateColumns: columns,
            alignItems: "center",
            minHeight: "46px",
            padding: "0 14px",
            boxSizing: "border-box",
            borderTop: "1px solid #E2E8F0",
          }}
        >
          {selectable && (
            <Checkbox
              size="small"
              checked={selectedIds.includes(patent.id)}
              onChange={() => onToggle?.(patent.id)}
              inputProps={{ "aria-label": `Select patent ${patent.id}` }}
              sx={{ p: 0, color: "#CBD5E1", "&.Mui-checked": { color: TEAL } }}
            />
          )}

          <Typography
            sx={{
              ...tableCell,
              fontWeight: 600,
              color: "#374151",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {patent.id}
          </Typography>

          <Typography
            sx={{
              ...tableCell,
              color: "#64748B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {patent.title}
          </Typography>

          <Typography
            sx={{
              ...tableCell,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            {patent.relevance}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const tableHeader = {
  ...text,
  fontSize: "11px",
  lineHeight: "14px",
  fontWeight: 700,
  color: "#475569",
};

const tableCell = {
  ...text,
  fontSize: "13px",
  lineHeight: "16px",
};

/* ============================================================================
   INSIGHTS
============================================================================ */

/**
 * An ESTIMATED viability, labelled as such.
 *
 * The report has no verdict field. The badge used to be read off
 * `patents[0]` (assuming the list was sorted) and presented as if it were the
 * backend's own conclusion, so it could contradict the assessment text. It is
 * now taken from the highest relevance in the list and says it is an estimate;
 * with no scored patents there is no badge at all.
 */
const viabilityFor = (report) => {
  const scores = (report?.patents ?? [])
    .map((p) => p?.rawRelevance)
    .filter((n) => Number.isFinite(n));
  if (!scores.length) return null;

  const top = Math.max(...scores);
  if (top >= 0.9) return { top, label: "EST. LOW VIABILITY", bg: "#FEE2E2", color: "#DC2626" };
  if (top >= 0.75) return { top, label: "EST. MODERATE VIABILITY", bg: "#FEF3C7", color: "#B45309" };
  return { top, label: "EST. HIGH VIABILITY", bg: "#DCFCE7", color: "#16A34A" };
};

const InsightsCard = ({ report }) => {
  const viability = viabilityFor(report);

  return (
  <Box
    sx={{
      width: "100%",
      height: "100%",
      minHeight: "300px",
      boxSizing: "border-box",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      padding: "18px 16px",
      background: "#FFFFFF",
    }}
  >
    <Typography
      sx={{
        ...text,
        fontSize: "15px",
        lineHeight: "18px",
        fontWeight: 600,
        mb: "16px",
      }}
    >
      Insights
    </Typography>

    <Box
      sx={{
        width: "100%",
        borderTop: "1px solid #E2E8F0",
        mb: "16px",
      }}
    />

    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #7DDFF0",
        borderRadius: "8px",
        padding: "12px",
        background: "#FFFFFF",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          mb: "7px",
        }}
      >
        <Typography
          sx={{
            ...text,
            fontSize: "12px",
            lineHeight: "15px",
            fontWeight: 600,
            color: TEAL,
          }}
        >
          Novelty Assessment
        </Typography>

        {viability && (
          <Box
            title={`Estimated from the highest patent relevance (${viability.top.toFixed(2)}). The API returns no verdict.`}
            sx={{
              px: "8px",
              py: "2px",
              borderRadius: "10px",
              background: viability.bg,
            }}
          >
            <Typography
              sx={{
                ...text,
                fontSize: "9px",
                lineHeight: "11px",
                fontWeight: 600,
                color: viability.color,
              }}
            >
              {viability.label}
            </Typography>
          </Box>
        )}
      </Box>

      {report?.assessment ? (
        <>
          <AssessmentChips value={report.assessment} />
          <FormattedText text={emphasiseTerms(report.assessment)} fontSize="12px" lineHeight={1.55} color="#475569" />
        </>
      ) : (
        <Typography sx={{ ...text, fontSize: "12px", lineHeight: "15px", color: "#7B8491" }}>
          No novelty assessment was returned for this run.
        </Typography>
      )}

      {/* The report's recommendations — previously there was nowhere for these
          to appear at all. */}
      {report?.recommendations?.length > 0 && (
        <Box sx={{ mt: "10px" }}>
          <FormattedText
            text={report.recommendations.map((rec) => `- ${emphasiseTerms(typeof rec === "string" ? rec : rec?.text ?? JSON.stringify(rec))}`).join("\n")}
            fontSize="12px"
            lineHeight={1.5}
            color="#475569"
          />
        </Box>
      )}

      {viability && (
        <Typography
          sx={{ ...text, fontSize: "10px", lineHeight: "14px", color: "#94A3B8", mt: "10px" }}
        >
          The viability badge is an estimate from the highest patent relevance
          ({viability.top.toFixed(2)}), not a verdict from the API.
        </Typography>
      )}
    </Box>
  </Box>
  );
};

/* ============================================================================
   ASK ANSWERS (Compare + follow-up)
============================================================================ */

const LoadingDots = () => (
  <Box sx={{ display: "flex", gap: "4px" }}>
    {[0, 1, 2].map((item) => (
      <Box
        key={item}
        sx={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: item === 0 ? TEAL : item === 1 ? "#65D9E5" : "#C4EEF2",
        }}
      />
    ))}
  </Box>
);

/**
 * One POST /agents/novsearch/ask exchange — { answer, patentIdsUsed,
 * chunksUsed } — with its loading and error states.
 */
const AnswerCard = ({ entry, onRetry }) => (
  <Box
    sx={{
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid #E2E8F0",
      borderRadius: "12px",
      background: "#FFFFFF",
      padding: "16px",
      mb: "34px",
    }}
  >
    <AgentHeader />

    {entry.pending && (
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LoadingDots />
        <Typography sx={{ ...text, fontSize: "14px", lineHeight: "22px" }}>
          Searching the indexed patents…
        </Typography>
      </Box>
    )}

    {!entry.pending && entry.error && (
      <Box role="alert">
        <Typography sx={{ ...text, fontSize: "13px", lineHeight: "20px", color: "#DC2626" }}>
          {entry.error}
        </Typography>
        {onRetry && (
          <Button
            onClick={onRetry}
            sx={{ ...text, textTransform: "none", fontSize: "13px", color: TEAL, px: 0, mt: "4px" }}
          >
            Try again
          </Button>
        )}
      </Box>
    )}

    {!entry.pending && !entry.error && (
      <>
        <Typography
          sx={{
            ...text,
            fontSize: "15px",
            lineHeight: "23px",
            fontWeight: 400,
            whiteSpace: "pre-line",
          }}
        >
          {entry.answer || "NovSearch returned no answer to this question."}
        </Typography>

        {(entry.chunksUsed != null || entry.patentIdsUsed?.length > 0) && (
          <Box sx={{ mt: "10px", borderTop: "1px solid #E2E8F0", pt: "10px" }}>
            <Typography sx={{ ...text, fontSize: "12px", lineHeight: "18px", color: "#64748B" }}>
              {entry.chunksUsed != null
                ? `Based on ${entry.chunksUsed} passage${entry.chunksUsed === 1 ? "" : "s"}`
                : "Based on"}
              {entry.patentIdsUsed?.length > 0
                ? ` from ${entry.patentIdsUsed.join(", ")}`
                : " from the indexed patents"}
              .
            </Typography>
          </Box>
        )}
      </>
    )}
  </Box>
);

/* ============================================================================
   RESULTS ACTIONS
============================================================================ */

const ResultsActions = ({ onCompare, selectedCount = 0, onFinish, actions = {} }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", mt: "24px" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      {/* Was "View Patent Details", which opened a hardcoded comparison of
          three patents that were never in the report. */}
      <Button
        onClick={onCompare}
        disabled={selectedCount < 2}
        title={selectedCount < 2 ? "Select at least two patents to compare" : undefined}
        sx={{
          ...buttonBase,
          color: TEAL,
          borderColor: "#DCE3EA",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          "&.Mui-disabled": { color: "#94A3B8" },
        }}
      >
        <LinkIcon color={selectedCount < 2 ? "#94A3B8" : TEAL} />
        Compare Selected{selectedCount ? ` (${selectedCount})` : ""}
      </Button>

      {onFinish && (
        <Button sx={buttonBase} onClick={onFinish}>
          Finish Research
        </Button>
      )}
    </Box>

    {/* Branch / Rerun / Export. "Share Insights" is gone: there is no
        endpoint behind it. */}
    <PhaseActions {...actions} />
  </Box>
);

/* ============================================================================
   LOADING SCREEN
============================================================================ */

/**
 * While the assessment runs. The results screen used to render with no data
 * at this point, reading "No patents were returned" and "NOT ASSESSED".
 */
const LoadingScreen = ({ progressMessage }) => (
  <>
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px",
      }}
    >
      <AgentHeader />

      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LoadingDots />
        <Typography sx={{ ...text, fontSize: "15px", lineHeight: "22px" }}>
          {progressMessage || "Searching patent databases for prior art…"}
        </Typography>
      </Box>
    </Box>
  </>
);

/* ============================================================================
   RESULTS SCREEN
============================================================================ */

const ResultsScreen = ({
  report,
  loading,
  error,
  onRetry,
  actions = {},
  selectedIds = [],
  onToggle,
  onCompare,
  onFinish,
}) => {
  const patentRows = report?.patents ?? [];
  const subject = [report?.drug, report?.target, report?.disease]
    .filter(Boolean)
    .join(" + ");

  return (
    <>

      <Box
        sx={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          background: "#FFFFFF",
          padding: "16px",
          mb: "34px",
        }}
      >
        <AgentHeader />

        <Typography
          sx={{
            ...text,
            fontSize: "15px",
            lineHeight: "22px",
            fontWeight: 400,
            mb: "12px",
          }}
        >
          {/* Was "Analysed 17 patents for Imatinib + JAK inhibitors" on every
              run, whatever came back. */}
          {error
            ? error
            : loading
            ? "Loading the novelty report…"
            : patentRows.length
            ? `Novelty search complete. Analysed ${report.total} patent${report.total === 1 ? "" : "s"}${subject ? ` for ${subject}` : ""}. Select patents to compare them:`
            : "No patents were returned for this candidate."}
        </Typography>

        {error && onRetry && (
          <Button
            onClick={onRetry}
            sx={{ ...text, textTransform: "none", fontSize: "13px", color: TEAL, mb: "12px" }}
          >
            Try again
          </Button>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.7fr) minmax(290px, 1fr)",
            gap: "16px",

            "@media (max-width: 850px)": {
              gridTemplateColumns: "1fr",
            },
          }}
        >
          <PatentTable
            relevanceHelp={definitionFor(report?.scoreDefinitions, "relevance")}
            rows={patentRows}
            selectable
            selectedIds={selectedIds}
            onToggle={onToggle}
          />

          <InsightsCard report={report} />
        </Box>

        <ResultsActions
          onCompare={onCompare}
          selectedCount={selectedIds.length}
          onFinish={onFinish}
          actions={actions}
        />
      </Box>
    </>
  );
};

/* ============================================================================
   COMPARISON SCREEN
============================================================================ */

/**
 * Compare → POST /agents/novsearch/ask with the selected patentIds.
 *
 * This screen used to be an empty table under a hardcoded question about
 * US10234567, EP3456789 and US10294021 and a hardcoded answer; the ask
 * endpoint was never called.
 */
const ComparisonScreen = ({ rows = [], comparison, onBack, onRetry, actions = {} }) => (
  <>
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px",
        mb: "40px",
      }}
    >
      <PatentTable rows={rows} emptyText="The selected patents are no longer in the report." />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          mt: "24px",
        }}
      >
        <Box>
          <Button sx={buttonBase} onClick={onBack}>
            Back to Results
          </Button>
        </Box>

        <PhaseActions {...actions} />
      </Box>
    </Box>

    {comparison && (
      <>
        <UserMessage>{comparison.question}</UserMessage>
        <AnswerCard entry={comparison} onRetry={onRetry} />
      </>
    )}
  </>
);

/* ============================================================================
   END TASK
============================================================================ */

const DecisionScreen = ({ onContinue, onEndTask, pending = false, error = null, diseaseLabel }) => (
  <>
    <Box
      sx={{
        width: "100%",
        maxWidth: "760px",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px",
        mb: "34px",
      }}
    >
      <AgentHeader />

      <Typography
        sx={{
          ...text,
          fontSize: "15px",
          lineHeight: "22px",
          color: "#1E293B",
          mb: "16px",
        }}
      >
        Would you like to continue exploring or conclude this research
        session? Ending the task saves the session.
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Button
          onClick={onContinue}
          disabled={pending}
          sx={primaryButton}
        >
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

        {pending && <LoadingDots />}
      </Box>

      {error && (
        <Typography role="alert" sx={{ ...text, fontSize: "13px", lineHeight: "20px", color: "#DC2626", mt: "12px" }}>
          {error}
        </Typography>
      )}
    </Box>
  </>
);

/* ============================================================================
   SUMMARY SCREEN
============================================================================ */

const Divider = () => (
  <Box
    sx={{
      width: "176px",
      borderTop: "1px solid #7B8491",
      mt: "12px",
      mb: "10px",
    }}
  />
);

const summaryText = {
  ...text,
  fontSize: "13px",
  lineHeight: "22px",
  whiteSpace: "pre-line",
};

/**
 * The closing summary, from the novelty report this component actually holds.
 *
 * This was fixed text — "124 articles", "17 patents, HIGH novelty confirmed",
 * five Type 2 Diabetes candidates with binding scores, and a Metformin
 * recommendation — on every session. Anything the report does not carry is
 * left out rather than filled in.
 */
const SummaryScreen = ({ report, sessionReport, researcherName, actions = {}, onNewResearch }) => {
  const diseaseLabel = report?.disease || sessionReport?.disease || "";
  const [exportBlocked, setExportBlocked] = useState(false);
  // The other modules' sections; NovSearch's own is drawn below from `report`.
  const earlierSections = (sessionReport?.sections ?? []).filter((s) => !s.title.startsWith("NovSearch"));

  // The whole session, printed from the browser. This used to call the
  // per-job PDF export for the NovSearch job, which covered NovSearch only
  // and was seen to re-run the module instead of exporting.
  const exportReport = () => {
    if (!sessionReport) {
      actions.onExport?.("pdf");
      return;
    }
    setExportBlocked(!printSessionReport(sessionReport, { researcherName }));
  };
  const topPatents = [...(report?.patents ?? [])]
    .filter((p) => Number.isFinite(p.rawRelevance))
    .sort((a, b) => b.rawRelevance - a.rawRelevance)
    .slice(0, 3);

  return (
  <>
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px 20px 20px",
      }}
    >
      <AgentHeader />

      <Typography
        sx={{
          ...text,
          fontSize: "15px",
          lineHeight: "22px",
          fontWeight: 500,
          mb: "14px",
        }}
      >
        Research task completed and the session is saved. Here is your final summary:
      </Typography>

      <Typography sx={{ ...summaryText, lineHeight: "21px" }}>
        {`Research Summary - ${diseaseLabel || "Drug Repurposing"}\n`}
        {report?.target ? `Target: ${report.target}\n` : ""}
        {diseaseLabel ? `Disease: ${diseaseLabel}\n` : ""}
        {researcherName ? `Researcher: ${researcherName}\n` : ""}
        {"Status: SAVED ✓"}
      </Typography>

      {/* The whole session, not just NovSearch: testing found the closing
          report covered only the last module run. */}
      {earlierSections.map((section) => (
        <React.Fragment key={section.title}>
          <Divider />
          <Typography sx={summaryText}>
            {`${section.title}:\n✓ ${section.summary}`}
            {section.items.length ? `\n${section.items.map((item, i) => `${i + 1}. ${item}`).join("\n")}` : ""}
          </Typography>
        </React.Fragment>
      ))}

      <Divider />

      <Typography sx={summaryText}>
        {"Novelty Search:\n"}
        {report
          ? `✓ ${report.total} patent${report.total === 1 ? "" : "s"} analysed`
          : "The novelty report is not available."}
      </Typography>

      {report?.assessment && (
        <Typography sx={{ ...summaryText, mt: "6px" }}>
          {`Assessment: ${report.assessment}`}
        </Typography>
      )}

      {topPatents.length > 0 && (
        <>
          <Divider />
          <Typography sx={summaryText}>
            {"Most relevant patents:\n"}
            {topPatents
              .map((p, i) => `${i + 1}. ${p.id} - ${p.title} - Relevance: ${p.relevance}`)
              .join("\n")}
          </Typography>
        </>
      )}

      {report?.recommendations?.length > 0 && (
        <>
          <Divider />
          <Typography sx={summaryText}>
            {"Recommendations:\n"}
            {report.recommendations.map((rec) => `• ${rec}`).join("\n")}
          </Typography>
        </>
      )}


      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "20px",
          fontWeight: 600,
          mt: "12px",
          mb: "10px",
        }}
      >
        What would you like to do next?
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Button sx={primaryButton} onClick={exportReport} disabled={!sessionReport && (!actions.onExport || Boolean(actions.busy))}>{actions.busy === "export" ? "Exporting…" : "Export Report"}</Button>
        <Button sx={buttonBase} onClick={actions.onBranch} disabled={!actions.onBranch || Boolean(actions.busy)}>{actions.busy === "branch" ? "Branching…" : "Branch"}</Button>
        <Button sx={buttonBase} onClick={onNewResearch}>+ New Research</Button>
        {/* "Share Results" is gone: there is no sharing endpoint. */}
      </Box>

      {actions.error && (
        <Typography role="alert" sx={{ ...text, fontSize: "12px", color: "#DC2626", mt: "8px" }}>
          {actions.error}
        </Typography>
      )}
      {exportBlocked && (
        <Typography role="alert" sx={{ ...text, fontSize: "12px", color: "#DC2626", mt: "8px" }}>
          The report window was blocked. Allow pop-ups for this site and try again.
        </Typography>
      )}
    </Box>
  </>
  );
};

/* ============================================================================
   CHAT INPUT
============================================================================ */

const ChatInput = ({ value, onChange, onSubmit, disabled = false }) => (
  <Box
    sx={{
      width: "100%",
      height: "98px",
      boxSizing: "border-box",
      border: "1.5px solid #E2E8F0",
      borderRadius: "16px",
      background: "#FFFFFF",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: "12px",
    }}
  >
    <Box
      component="input"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSubmit();
        }
      }}
      placeholder="Ask a question about the indexed patents..."
      sx={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontFamily: NOVSEARCH_FONT,
        fontSize: "14px",
        lineHeight: "20px",
        color: "#1E293B",

        "&::placeholder": {
          color: "#94A3B8",
          opacity: 1,
        },
      }}
    />

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mt: "12px",
      }}
    >
      <Box
        sx={{
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          background: "#F1F5F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        <PlusIcon />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <MicIcon />

        <Box
          onClick={disabled ? undefined : onSubmit}
          sx={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: disabled ? "#CBD5E1" : "#08B8D0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <ArrowUpIcon />
        </Box>
      </Box>
    </Box>
  </Box>
);

/* ============================================================================
   PHASE NORMALIZATION
============================================================================ */

const getInitialStage = (workflowPhase) => {
  const value = String(workflowPhase ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");

  if (value.includes("loading")) {
    return "loading";
  }

  if (value.includes("summary")) {
    return "summary";
  }

  if (value.includes("decision") || value.includes("endtask")) {
    return "decision";
  }

  if (
    value.includes("comparison") ||
    value.includes("compare")
  ) {
    return "comparison";
  }

  return "results";
};

/** POST /agents/novsearch/ask → { answer, mode, patentIdsUsed, chunksUsed }. */
const askNovSearch = async (payload) => {
  const res = await novsearchApi.ask(payload);
  const chunks = Number(res?.chunksUsed);
  return {
    answer: res?.answer ?? null,
    mode: res?.mode ?? null,
    patentIdsUsed: Array.isArray(res?.patentIdsUsed) ? res.patentIdsUsed : [],
    chunksUsed: res?.chunksUsed != null && Number.isFinite(chunks) ? chunks : null,
  };
};

const askError = (err, fallback) => err?.userMessage || err?.message || fallback;

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

const NoveltySearchPhase = ({
  workflowPhase,
  /** The runner's live progress line. */
  progressMessage,
  /** GET /agents/novsearch/{jobId}/report, normalised. */
  report = null,
  loading = false,
  error = null,
  onRetry,
  /** Branch / Rerun / Export handlers from usePhaseActions (this module's job). */
  actions = {},
  /** The assessment job is still running — shows the loading stage. */
  isLoading = false,
  /**
   * End Task → marks the session Saved (PATCH /sessions/{id}). Awaited; the
   * summary only appears once it succeeds.
   */
  onEndTask,
  /** Every module's results; see workflow/sessionReport.js. */
  sessionReport = null,
}) => {
  const navigate = useNavigate();

  const [stage, setStage] = useState(() =>
    getInitialStage(workflowPhase)
  );

  const [inputValue, setInputValue] = useState("");

  /** Patents ticked in the results table, for Compare. */
  const [selectedIds, setSelectedIds] = useState([]);

  /** The Compare exchange: { question, ids, pending, error, answer, … }. */
  const [comparison, setComparison] = useState(null);
  const comparisonRequestRef = useRef(0);

  /** Follow-up questions and their answers, in order. */
  const [thread, setThread] = useState([]);

  const [endTaskState, setEndTaskState] = useState({ pending: false, error: null });

  // Review points 6 and 20: the closing screens named Type 2 Diabetes and
  // Dr. Priya whatever the session was about. Both come from the run now.
  const { displayName: researcherName } = useCurrentUser();
  const diseaseLabel = report?.disease || "";

  /** Follow the parent's phase when it changes (e.g. loading → results). */
  useEffect(() => {
    if (workflowPhase !== undefined && workflowPhase !== null) {
      setStage(getInitialStage(workflowPhase));
    }
  }, [workflowPhase]);

  const running = isLoading || stage === "loading";
  const patents = useMemo(() => report?.patents ?? [], [report]);

  const toggleSelected = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /** Compare → ask({ question, patentIds: selected, topK: null }). */
  const runComparison = async (ids) => {
    if (!ids.length) return;

    const question = `Compare patents ${ids.join(", ")}. What are the common mechanisms and how do they differ in their approach?`;
    const requestId = ++comparisonRequestRef.current;

    setComparison({ question, ids, pending: true, error: null });
    setStage("comparison");

    try {
      const result = await askNovSearch({ question, patentIds: ids, topK: null });
      if (requestId !== comparisonRequestRef.current) return;
      setComparison({ question, ids, pending: false, error: null, ...result });
    } catch (err) {
      if (requestId !== comparisonRequestRef.current) return;
      setComparison({
        question,
        ids,
        pending: false,
        error: askError(err, "The comparison could not be run."),
      });
    }
  };

  const handleCompare = () => {
    // Only patents still in the report — a rerun can replace the list.
    const ids = selectedIds.filter((id) => patents.some((p) => p.id === id));
    runComparison(ids);
  };

  /** Follow-up box → ask({ question, patentIds: null, topK: null }) over every indexed patent. */
  const askFollowUp = async (question, existingId = null) => {
    const id = existingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setThread((prev) =>
      existingId
        ? prev.map((e) => (e.id === id ? { id, question, pending: true, error: null } : e))
        : [...prev, { id, question, pending: true, error: null }]
    );

    try {
      const result = await askNovSearch({ question, patentIds: null, topK: null });
      setThread((prev) =>
        prev.map((e) => (e.id === id ? { id, question, pending: false, error: null, ...result } : e))
      );
    } catch (err) {
      setThread((prev) =>
        prev.map((e) =>
          e.id === id
            ? { id, question, pending: false, error: askError(err, "The question could not be answered.") }
            : e
        )
      );
    }
  };

  /**
   * The follow-up text used to be keyword-matched ("compare", "summary") to
   * switch screens and then thrown away, so no question was ever answered.
   */
  const handleSubmit = () => {
    const value = inputValue.trim();

    if (!value) {
      return;
    }

    setInputValue("");
    askFollowUp(value);
  };

  const handleEndTask = async () => {
    if (!onEndTask) return;

    setEndTaskState({ pending: true, error: null });
    try {
      await onEndTask();
      setEndTaskState({ pending: false, error: null });
      setStage("summary");
    } catch (err) {
      setEndTaskState({
        pending: false,
        error: askError(err, "The session could not be saved. Please try again."),
      });
    }
  };

  const comparisonRows = patents.filter((p) => comparison?.ids?.includes(p.id));

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: "100%",
        minHeight: 0,
        background: GRAY_BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          margin: "0 auto",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
          padding: "24px 40px 40px",

          "@media (max-width: 1100px)": {
            padding: "28px 28px 36px",
          },

          "@media (max-width: 700px)": {
            padding: "20px 16px 28px",
          },
        }}
      >
        {/* ================================================================
            LOADING
        ================================================================= */}

        {running && <LoadingScreen progressMessage={progressMessage} />}

        {/* ================================================================
            RESULTS
        ================================================================= */}

        {/* Stays on screen after End Task: the summary used to REPLACE the
            results, so the patent table and assessment could no longer be
            viewed once the session was ended (testing). */}
        {!running && (stage === "results" || stage === "summary") && (
          <ResultsScreen
            actions={actions}
            report={report}
            loading={loading}
            error={error}
            onRetry={onRetry}
            selectedIds={selectedIds}
            onToggle={toggleSelected}
            onCompare={handleCompare}
            onFinish={stage === "summary" ? undefined : () => setStage("decision")}
          />
        )}

        {/* ================================================================
            COMPARISON
        ================================================================= */}

        {!running && stage === "comparison" && (
          <ComparisonScreen
            actions={actions}
            rows={comparisonRows}
            comparison={comparison}
            onBack={() => setStage("results")}
            onRetry={comparison ? () => runComparison(comparison.ids) : undefined}
          />
        )}

        {/* ================================================================
            END TASK
        ================================================================= */}

        {!running && stage === "decision" && (
          <DecisionScreen
            diseaseLabel={diseaseLabel}
            onContinue={() => setStage("results")}
            onEndTask={onEndTask ? handleEndTask : undefined}
            pending={endTaskState.pending}
            error={endTaskState.error}
          />
        )}

        {/* ================================================================
            FOLLOW-UP THREAD
        ================================================================= */}

        {!running &&
          thread.map((entry) => (
            <React.Fragment key={entry.id}>
              <UserMessage>{entry.question}</UserMessage>
              <AnswerCard entry={entry} onRetry={() => askFollowUp(entry.question, entry.id)} />
            </React.Fragment>
          ))}

        {/* ================================================================
            FINAL SUMMARY
        ================================================================= */}

        {!running && stage === "summary" && (
          <SummaryScreen
            actions={actions}
            report={report}
            sessionReport={sessionReport}
            researcherName={researcherName}
            onNewResearch={() => navigate("/dashboard/new-research")}
          />
        )}

      </Box>

      {/* Keep the composer fixed to the NovSearch viewport across every stage. */}
      <Box
        sx={{
          flexShrink: 0,
          width: "100%",
          background: GRAY_BG,
          borderTop: "1px solid #E2E8F0",
          padding: "12px 16px",
          boxSizing: "border-box",

          "@media (max-width: 1100px)": {
            padding: "12px 16px",
          },

          "@media (max-width: 700px)": {
            padding: "12px 16px",
          },
        }}
      >
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={running || stage === "summary"}
        />
      </Box>
    </Box>
  );
};

export default NoveltySearchPhase;
