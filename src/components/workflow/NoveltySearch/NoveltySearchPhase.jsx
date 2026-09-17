import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { TEAL, GRAY_BG } from "../workflowConstants";

const NOVSEARCH_FONT = "'Inter', sans-serif";

/* ============================================================================
   DATA
============================================================================ */

/* ============================================================================
   SHARED STYLES
============================================================================ */

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

const AgentIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M12 3.5L13.7 9.3L19.5 11L13.7 12.7L12 18.5L10.3 12.7L4.5 11L10.3 9.3L12 3.5Z"
      stroke="#00BCD4"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 3.5V7.5M16.5 5.5H20.5"
      stroke="#00BCD4"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle
      cx="5"
      cy="18.5"
      r="1.5"
      stroke="#00BCD4"
      strokeWidth="1.5"
    />
  </svg>
);

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

const AgentHeader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      mb: "14px",
    }}
  >
    <Box
      sx={{
        width: "34px",
        height: "34px",
        border: "1px solid #00BCD4",
        borderRadius: "7px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F0FDFF",
        flexShrink: 0,
      }}
    >
      <AgentIcon />
    </Box>

    <Typography
      sx={{
        ...text,
        fontSize: "12px",
        lineHeight: "15px",
        fontWeight: 700,
        color: TEAL,
      }}
    >
      INOVAPATH NOVSEARCH AGENT
    </Typography>
  </Box>
);

/* ============================================================================
   USER MESSAGE
============================================================================ */

const UserMessage = ({ children }) => (
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
        DR. PRIYA (YOU)
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

/* ============================================================================
   RESULTS TABLE
============================================================================ */

/**
 * @param {object[]} rows - normalised patents from
 *   GET /agents/novsearch/{jobId}/report — { id, title, relevance }.
 */
const PatentTable = ({ rows = [] }) => (
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
        gridTemplateColumns: "94px minmax(0, 1fr) 94px",
        alignItems: "center",
        minHeight: "50px",
        padding: "0 14px",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      <Typography sx={tableHeader}>PATENT ID</Typography>
      <Typography sx={tableHeader}>TITLE</Typography>
      <Typography sx={tableHeader}>RELEVANCE</Typography>
    </Box>

    {/* Rows. The module-level `patents` fixture is no longer read — these come
        from the novelty report. */}
    {rows.map((patent) => (
      <Box
        key={patent.id}
        sx={{
          display: "grid",
          gridTemplateColumns: "94px minmax(0, 1fr) 94px",
          alignItems: "center",
          minHeight: "46px",
          padding: "0 14px",
          boxSizing: "border-box",
          borderTop: "1px solid #E2E8F0",
        }}
      >
        <Typography
          sx={{
            ...tableCell,
            fontWeight: 600,
            color: "#374151",
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
 * The novelty verdict.
 *
 * `assessment` and `recommendations` are the report's own fields. The
 * "HIGH VIABILITY" badge used to be hardcoded green, so every candidate — even
 * one blocked by a direct patent hit — was presented as clear to file. It is
 * derived from the top relevance score instead: the API returns no verdict
 * enum, and relevance is the only signal in the payload that speaks to
 * overlap.
 */
const viabilityFor = (report) => {
  const top = report?.patents?.[0]?.rawRelevance;
  if (!Number.isFinite(top)) {
    return { label: "NOT ASSESSED", bg: "#F1F5F9", color: "#64748B" };
  }
  if (top >= 0.9) return { label: "LOW VIABILITY", bg: "#FEE2E2", color: "#DC2626" };
  if (top >= 0.75) return { label: "MODERATE VIABILITY", bg: "#FEF3C7", color: "#B45309" };
  return { label: "HIGH VIABILITY", bg: "#DCFCE7", color: "#16A34A" };
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

        <Box
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
      </Box>

      <Typography
        sx={{
          ...text,
          fontSize: "12px",
          lineHeight: "15px",
          color: "#7B8491",
          whiteSpace: "pre-wrap",
        }}
      >
        {report?.assessment ||
          "No novelty assessment was returned for this run."}
      </Typography>

      {/* The report's recommendations — previously there was nowhere for these
          to appear at all. */}
      {report?.recommendations?.length > 0 && (
        <Box sx={{ mt: "10px" }}>
          {report.recommendations.map((rec, i) => (
            <Typography
              key={i}
              sx={{
                ...text,
                fontSize: "12px",
                lineHeight: "16px",
                color: "#7B8491",
                mb: "4px",
              }}
            >
              • {rec}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  </Box>
  );
};

/* ============================================================================
   RESULTS ACTIONS
============================================================================ */

const ResultsActions = ({ onCompare }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      mt: "24px",
    }}
  >
    <Button
      onClick={onCompare}
      sx={{
        ...buttonBase,
        color: TEAL,
        borderColor: "#DCE3EA",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <LinkIcon />
      View Patent Details
    </Button>

    <Button sx={buttonBase}>Branch</Button>

    <Button sx={buttonBase}>Rerun</Button>

    <Button sx={buttonBase}>Share Insights</Button>
  </Box>
);

/* ============================================================================
   RESULTS SCREEN
============================================================================ */

const ResultsScreen = ({ onCompare, report, loading, error, onRetry }) => {
  const patentRows = report?.patents ?? [];
  const subject = [report?.drug, report?.target, report?.disease]
    .filter(Boolean)
    .join(" + ");

  return (
    <>
      <UserMessage>
        {/* Was a fixed "Imatinib + JAK inhibitors" string. */}
        {subject
          ? `Search patents for ${subject}`
          : "Search patents for this candidate"}
      </UserMessage>

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
            ? `Novelty search complete. Analysed ${report.total} patent${report.total === 1 ? "" : "s"}${subject ? ` for ${subject}` : ""}. Results ranked by relevance:`
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
          <PatentTable rows={patentRows} />

          <InsightsCard report={report} />
        </Box>

        <ResultsActions onCompare={onCompare} />
      </Box>
    </>
  );
};

/* ============================================================================
   COMPARISON SCREEN
============================================================================ */

const ComparisonScreen = () => (
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
      <PatentTable />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          mt: "24px",
        }}
      >
        <Button
          sx={{
            ...buttonBase,
            color: TEAL,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LinkIcon />
          View Patent Details
        </Button>

        <Button sx={buttonBase}>Branch</Button>

        <Button sx={buttonBase}>Rerun</Button>

        <Button sx={buttonBase}>Share Insights</Button>
      </Box>
    </Box>

    <UserMessage>
      Compare patents US10234567, EP3456789, and US10294021. What are the
      common mechanisms and how do they differ in their approach?
    </UserMessage>

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

      <Typography
        sx={{
          ...text,
          fontSize: "15px",
          lineHeight: "23px",
          fontWeight: 400,
          whiteSpace: "pre-line",
        }}
      >
        Comparing 3 patents on JAK inhibition:
        {"\n\n"}
        • US10234567: Selective JAK2 with IC50 &lt; 10nM, oral delivery
        {"\n"}
        • EP3456789: Combination therapy approach (Imatinib + JAK inhibitor)
        {"\n"}
        • US10294021: Dual BCR-ABL/JAK targeting, broader kinase coverage
      </Typography>

      <Box
        sx={{
          mt: "10px",
          borderTop: "1px solid #E2E8F0",
          pt: "10px",
        }}
      >
        <Typography
          sx={{
            ...text,
            fontSize: "13px",
            lineHeight: "20px",
            color: "#64748B",
          }}
        >
          All three share the JAK2 pathway but differ in selectivity and
          combination strategy.
        </Typography>
      </Box>

      <Box
        sx={{
          mt: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
      </Box>
    </Box>
  </>
);

/* ============================================================================
   COMPILING SCREEN
============================================================================ */

const DecisionScreen = ({ onContinue, onEndTask }) => (
  <>
    <UserMessage>
      Complete this research task. Generate a final summary report for the
      Type 2 Diabetes drug repurposing project.
    </UserMessage>

    <Box
      sx={{
        width: "100%",
        maxWidth: "760px",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px",
      }}
    >
      <AgentHeader />

      <Typography
        sx={{
          ...text,
          fontSize: "15px",
          lineHeight: "22px",
          fontWeight: 400,
          mb: "16px",
        }}
      >
        Research task completed successfully! Your findings have been
        compiled.
      </Typography>

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
        session?
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Button
          onClick={onContinue}
          sx={primaryButton}
        >
          Continue Research
        </Button>

        <Button onClick={onEndTask} sx={buttonBase}>End Task</Button>
      </Box>
    </Box>
  </>
);

const CompilingScreen = ({ progressMessage }) => (
  <>

    <UserMessage>End Task</UserMessage>

    <Box
      sx={{
        width: "100%",
        maxWidth: "760px",
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        background: "#FFFFFF",
        padding: "16px",
      }}
    >
      <AgentHeader />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          mb: "12px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: "4px",
          }}
        >
          {[0, 1, 2].map((item) => (
            <Box
              key={item}
              sx={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background:
                  item === 0
                    ? TEAL
                    : item === 1
                    ? "#65D9E5"
                    : "#C4EEF2",
              }}
            />
          ))}
        </Box>

        <Typography
          sx={{
            ...text,
            fontSize: "15px",
            lineHeight: "22px",
          }}
        >
          {progressMessage || "Compiling your research report... This will be completed shortly."}
        </Typography>
      </Box>

      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "20px",
          color: "#7B8491",
        }}
      >
        You will be notified when the report is ready for review.
      </Typography>
    </Box>
  </>
);

/* ============================================================================
   SUMMARY SCREEN
============================================================================ */

const SummaryScreen = () => (
  <>
    <UserMessage>End Task</UserMessage>

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
        Research task completed successfully! Here is your final summary:
      </Typography>

      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "21px",
          whiteSpace: "pre-line",
        }}
      >
        {"Research Summary - Type 2 Diabetes Drug Repurposing\n"}
        {"Project: Novel Target Drug Repurposing for T2D\n"}
        {"Researcher: Dr. Priya • Duration: 3 sessions\n"}
        {"Status: COMPLETED ✓"}
      </Typography>

      <Box
        sx={{
          width: "176px",
          borderTop: "1px solid #7B8491",
          mt: "12px",
          mb: "10px",
        }}
      />

      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "22px",
          whiteSpace: "pre-line",
        }}
      >
        {"Modules Executed:\n"}
        {"✓ TxKG - 5 protein targets identified (JAK2, EGFR, VEGFR2, PI3K, mTOR)\n"}
        {"✓ LitMinEx - 124 articles analyzed across PubMed & clinical databases\n"}
        {"✓ CuraTex - 5 compounds curated (Metformin, Pioglitazone, Canagliflozin, Empagliflozin, Liraglutide)\n"}
        {"✓ NovSearch - 17 patents analyzed, HIGH novelty confirmed\n"}
        {"✓ ScreenSuite - PLP docking reports generated for all targets"}
      </Typography>

      <Box
        sx={{
          width: "176px",
          borderTop: "1px solid #7B8491",
          mt: "12px",
          mb: "10px",
        }}
      />

      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "22px",
          whiteSpace: "pre-line",
        }}
      >
        {"Top Drug Candidates:\n"}
        {"1. Metformin → JAK2 - Binding: -9.2 kcal/mol - Confidence: High\n"}
        {"2. Pioglitazone → EGFR - Binding: -8.7 kcal/mol - Confidence: High\n"}
        {"3. Canagliflozin → VEGFR2 - Binding: -7.8 kcal/mol - Confidence: Moderate\n"}
        {"4. Empagliflozin → PI3K - Binding: -7.4 kcal/mol - Confidence: Moderate\n"}
        {"5. Liraglutide → mTOR - Binding: -6.9 kcal/mol - Confidence: Low"}
      </Typography>

      <Box
        sx={{
          width: "176px",
          borderTop: "1px solid #7B8491",
          mt: "12px",
          mb: "10px",
        }}
      />

      <Typography
        sx={{
          ...text,
          fontSize: "13px",
          lineHeight: "22px",
          whiteSpace: "pre-line",
        }}
      >
        {"Recommendation:\n"}
        {"Metformin and Pioglitazone show the strongest binding affinity and confidence scores. Recommend proceeding to in-vitro validation phase."}
      </Typography>

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
        <Button sx={primaryButton}>Export Report</Button>
        <Button sx={buttonBase}>Branch</Button>
        <Button sx={buttonBase}>+ New Research</Button>
        <Button sx={buttonBase}>Share Results</Button>
      </Box>
    </Box>
  </>
);

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
      placeholder="Type @ for modules or ask a research question..."
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

  if (
    value.includes("summary") ||
    value.includes("completed") ||
    value.includes("complete")
  ) {
    return "summary";
  }

  if (
    value.includes("compiling") ||
    value.includes("report") ||
    value.includes("researchreport")
  ) {
    return "compiling";
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
}) => {
  const [stage, setStage] = useState(() =>
    getInitialStage(workflowPhase)
  );

  const [inputValue, setInputValue] = useState("");

  /**
   * "Compiling" is a local presentation step — the final report is assembled
   * from data already fetched, not by another agent run — so it advances as
   * soon as the report is in hand rather than after a fixed 2.5s.
   *
   * The timer that remains is only a ceiling: without it, a compile with no
   * report to wait for would sit on this screen indefinitely.
   */
  useEffect(() => {
    if (stage !== "compiling") {
      return undefined;
    }

    if (report?.hasData || error) {
      setStage("summary");
      return undefined;
    }

    const timer = setTimeout(() => setStage("summary"), 2500);
    return () => clearTimeout(timer);
  }, [stage, report, error]);

  /*
   * Keep externally supplied workflowPhase useful if the parent changes it.
   * Local stage changes are used for the interactive Figma prototype flow.
   */
  useMemo(() => {
    const externalStage = getInitialStage(workflowPhase);

    if (workflowPhase !== undefined && workflowPhase !== null) {
      setStage(externalStage);
    }
  }, [workflowPhase]);

  const handleSubmit = () => {
    const value = inputValue.trim();

    if (!value) {
      return;
    }

    const normalized = value.toLowerCase();

    if (
      normalized.includes("compare") ||
      normalized.includes("comparison")
    ) {
      setStage("comparison");
    } else if (
      normalized.includes("summary") ||
      normalized.includes("final report") ||
      normalized.includes("complete")
    ) {
      setStage("decision");
    }

    setInputValue("");
  };

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
            RESULTS
        ================================================================= */}

        {stage === "results" && (
          <ResultsScreen
            onCompare={() => setStage("comparison")}
            report={report}
            loading={loading}
            error={error}
            onRetry={onRetry}
          />
        )}

        {/* ================================================================
            COMPARISON
        ================================================================= */}

        {stage === "comparison" && (
          <ComparisonScreen />
        )}

        {/* ================================================================
            COMPILING / RESEARCH REPORT
        ================================================================= */}

        {stage === "decision" && (
          <DecisionScreen
            onContinue={() => setStage("results")}
            onEndTask={() => setStage("compiling")}
          />
        )}

        {stage === "compiling" && <CompilingScreen progressMessage={progressMessage} />}

        {/* ================================================================
            FINAL SUMMARY
        ================================================================= */}

        {stage === "summary" && <SummaryScreen />}

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
          disabled={stage === "summary"}
        />
      </Box>
    </Box>
  );
};

export default NoveltySearchPhase;