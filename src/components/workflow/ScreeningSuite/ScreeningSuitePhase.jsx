import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { FONT, TEAL, GRAY_BG } from "../workflowConstants";
import PhaseActions from "../PhaseActions";
import { agentHeadingFor } from "../../../workflow/moduleMap";
import { useCurrentUser } from "../../../context/CurrentUserContext";

/* ============================================================================
   DATA
============================================================================ */


const residueInteractions = [
  {
    id: 1,
    residue: "68/ALA",
    receptor: "A:ALA:68",
    recBQ: "5.84",
    resBQ: "3.41",
    selection: "A:ALA:68",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 2,
    residue: "70/PRO",
    receptor: "A:PRO:70",
    recBQ: "4.90",
    resBQ: "0.39",
    selection: "A:PRO:70",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 3,
    residue: "74/PRO",
    receptor: "A:PRO:74",
    recBQ: "2.88",
    resBQ: "0.10",
    selection: "A:PRO:74",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 4,
    residue: "104/PHE",
    receptor: "A:PHE:104",
    recBQ: "6.81",
    resBQ: "2.59",
    selection: "A:PHE:104",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 5,
    residue: "90/PRO",
    receptor: "A:PRO:90",
    recBQ: "3.55",
    resBQ: "0.57",
    selection: "A:PRO:90",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 6,
    residue: "106/PRO",
    receptor: "A:PRO:106",
    recBQ: "4.08",
    resBQ: "1.03",
    selection: "A:PRO:106",
    ligBonds: "0",
    intBonds: "0",
  },
  {
    id: 7,
    residue: "110/TRP",
    receptor: "A:TRP:110",
    recBQ: "7.52",
    resBQ: "4.21",
    selection: "A:TRP:110",
    ligBonds: "0",
    intBonds: "0",
  },
];

const hydrogenBonds = [
  {
    id: 1,
    residue: "142/HIS",
    receptor: "A:HIS:142",
    donorBQ: "2.98",
    recBQ: "1.45",
    selection: "A:HIS:142",
    distHA: "3.26",
    distDA: "3.88",
  },
  {
    id: 2,
    residue: "158/LYS",
    receptor: "A:LYS:158",
    donorBQ: "3.12",
    recBQ: "0.87",
    selection: "A:LYS:158",
    distHA: "3.41",
    distDA: "4.02",
  },
  {
    id: 3,
    residue: "271/ASP",
    receptor: "A:ASP:271",
    donorBQ: "4.55",
    recBQ: "2.11",
    selection: "A:ASP:271",
    distHA: "3.58",
    distDA: "4.15",
  },
  {
    id: 4,
    residue: "84/GLU",
    receptor: "A:GLU:84",
    donorBQ: "3.78",
    recBQ: "1.23",
    selection: "A:GLU:84",
    distHA: "3.72",
    distDA: "4.33",
  },
  {
    id: 5,
    residue: "198/ARG",
    receptor: "A:ARG:198",
    donorBQ: "5.02",
    recBQ: "2.89",
    selection: "A:ARG:198",
    distHA: "3.89",
    distDA: "4.51",
  },
];

const recommendations = [
  {
    target: "JAK2",
    compound: "Gefitinib",
    affinity: "-8.046 kcal/mol",
    level: "High (92%)",
    color: "#00BCD4",
  },
  {
    target: "EGFR",
    compound: "Gefitinib",
    affinity: "-7.832 kcal/mol",
    level: "High (88%)",
    color: "#00BCD4",
  },
  {
    target: "VEGFR2",
    compound: "Sorafenib",
    affinity: "-7.445 kcal/mol",
    level: "Moderate (76%)",
    color: "#F59E0B",
  },
  {
    target: "PI3K",
    compound: "Idelalisib",
    affinity: "-6.918 kcal/mol",
    level: "Moderate (71%)",
    color: "#F59E0B",
  },
  {
    target: "mTOR",
    compound: "Everolimus",
    affinity: "-6.502 kcal/mol",
    level: "Low (63%)",
    color: "#EF4444",
  },
];

/* ============================================================================
   COMMON STYLES
============================================================================ */

const baseText = {
  fontFamily: FONT,
  color: "#0F172A",
};

/* ============================================================================
   SCREEN SUITE ICON
============================================================================ */

const ScreenSuiteIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="
        M11.9 3.25
        L13.55 9.1
        C13.67 9.52 14 9.85 14.42 9.97
        L20.27 11.62
        C20.75 11.76 20.75 12.44 20.27 12.58
        L14.42 14.23
        C14 14.35 13.67 14.68 13.55 15.1
        L11.9 20.95
        C11.76 21.43 11.08 21.43 10.94 20.95
        L9.29 15.1
        C9.17 14.68 8.84 14.35 8.42 14.23
        L2.57 12.58
        C2.09 12.44 2.09 11.76 2.57 11.62
        L8.42 9.97
        C8.84 9.85 9.17 9.52 9.29 9.1
        L10.94 3.25
        C11.08 2.77 11.76 2.77 11.9 3.25Z
      "
      stroke="#00BCD4"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <circle
      cx="5.25"
      cy="18.45"
      r="1.65"
      stroke="#00BCD4"
      strokeWidth="1.5"
    />

    <path
      d="M18.45 3.25V7.05M16.55 5.15H20.35"
      stroke="#00BCD4"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
  </svg>
);

/* ============================================================================
   USER MESSAGE
============================================================================ */

const UserMessage = ({ subject }) => {
  const { chatLabel: userLabel } = useCurrentUser();
  return (
  <Box
    sx={{
      display: "flex",
      justifyContent: "flex-end",
      mb: "16px",
    }}
  >
    <Box
      sx={{
        width: "534px",
        maxWidth: "100%",
        background: "#F0FDF9",
        borderRadius: "12px",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <Typography
        sx={{
          ...baseText,
          fontSize: "10px",
          lineHeight: "12px",
          fontWeight: 700,
          letterSpacing: "0.7px",
          color: TEAL,
          textTransform: "uppercase",
          mb: "8px",
        }}
      >
        {userLabel}
      </Typography>

      <Typography
        sx={{
          ...baseText,
          fontSize: "14px",
          lineHeight: "20px",
          color: "#334155",
        }}
      >
        {/* Was a fixed "for Metformin and Pioglitazone against JAK2". */}
        {subject
          ? `View ScreenSuite docking status for ${subject}`
          : "View ScreenSuite docking status"}
      </Typography>
    </Box>
  </Box>
  );
};

/* ============================================================================
   AGENT HEADER
============================================================================ */

const AgentHeader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      mb: "12px",
    }}
  >
    <Box
      sx={{
        width: "34px",
        height: "34px",
        border: "1px solid #00BCD4",
        borderRadius: "8px",
        background: "#F0FDFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <ScreenSuiteIcon />
    </Box>

    <Typography
      sx={{
        ...baseText,
        fontSize: "13px",
        lineHeight: "16px",
        fontWeight: 700,
        color: TEAL,
        textTransform: "uppercase",
      }}
    >
      {agentHeadingFor("screensuite")}
    </Typography>
  </Box>
);

/* ============================================================================
   DOCKING TABLE
============================================================================ */

/**
 * @param {object[]} hits - normalised rows from GET /agents/screensuite/{jobId}/hits
 *   (protein, mode, affinity, ligand, outputFile). The module-level
 *   `dockingResults` fixture is only the fallback for a caller that passes
 *   none, and is never reached from the workflow.
 */
const PLPTable = ({ onOpenReport, hits }) => {
  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
      }}
    >
      <Box sx={{ minWidth: "850px" }}>
        {/* HEADER */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "80px 40px 100px 110px 80px minmax(150px, 1fr) 76px",
            alignItems: "center",
            columnGap: "4px",
            padding: "10px",
            background: "#F1F5F9",
            borderRadius: "4px",
          }}
        >
          <Typography sx={tableHeader}>PROTEIN NAME</Typography>
          <Typography sx={tableHeader}>MODE</Typography>
          <Typography sx={tableHeader}>
            BINDING AFFINITY (KCAL/MOL)
          </Typography>
          <Typography sx={tableHeader}>PROTEIN-LIGAND</Typography>
          <Typography sx={tableHeader}>PROTEIN</Typography>
          <Typography sx={tableHeader}>LIGAND</Typography>
          <Box />
        </Box>

        {/* ROWS */}
        {(Array.isArray(hits) && hits.length ? hits : []).map((row) => (
          <Box
            key={row.id}
            sx={{
              display: "grid",
              gridTemplateColumns:
                "80px 40px 100px 110px 80px minmax(150px, 1fr) 76px",
              alignItems: "center",
              columnGap: "4px",
              padding: "10px",
              minHeight: "41px",
              boxSizing: "border-box",
              background: "#FFFFFF",
              borderTop: "1px solid #EBEDF2",
            }}
          >
            <Typography sx={tableCell}>{row.protein}</Typography>

            <Typography sx={tableCell}>{row.mode}</Typography>

            <Typography sx={tableCell}>{row.affinity}</Typography>

            <Typography
              sx={{
                ...tableCell,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.proteinLigand}
            </Typography>

            <Typography
              sx={{
                ...tableCell,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.proteinValue}
            </Typography>

            <Typography
              sx={{
                ...tableCell,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.ligand}
            </Typography>

            <Button
              onClick={() => onOpenReport(row)}
              sx={{
                minWidth: "76px",
                width: "76px",
                height: "21px",
                padding: "5px 8px",
                background: TEAL,
                color: "#FFFFFF",
                borderRadius: "4px",
                fontFamily: FONT,
                fontSize: "9px",
                lineHeight: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                boxShadow: "none",
                "&:hover": {
                  background: "#00A9BF",
                  boxShadow: "none",
                },
              }}
            >
              PLP REPORT
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const tableHeader = {
  ...baseText,
  fontSize: "9px",
  lineHeight: "11px",
  fontWeight: 700,
  color: "#33404D",
};

const tableCell = {
  ...baseText,
  fontSize: "10px",
  lineHeight: "12px",
  fontWeight: 400,
  color: "#262B33",
};

/* ============================================================================
   RESIDUE INTERACTIONS
============================================================================ */

const ResidueInteractions = () => {
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
      <Box
        sx={{
          height: "35px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          boxSizing: "border-box",
        }}
      >
        <Typography
          sx={{
            ...baseText,
            fontSize: "12px",
            lineHeight: "15px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Residue Interactions
        </Typography>

        <Typography
          sx={{
            ...baseText,
            fontSize: "11px",
            lineHeight: "13px",
            fontWeight: 400,
            color: "#6B7280",
          }}
        >
          (7 found)
        </Typography>
      </Box>

      {/* HEADER */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            "30px 80px 80px 70px 70px 100px 80px 80px",
          minWidth: "590px",
          padding: "8px 10px",
          background: "#F9FAFB",
          borderTop: "1px solid #F3F4F6",
          borderBottom: "1px solid #F3F4F6",
          boxSizing: "border-box",
        }}
      >
        {[
          "#",
          "RESIDUE",
          "RECEPTOR",
          "REC_BQ",
          "RES_BQ",
          "SELECTION",
          "LIG BONDS",
          "INT BONDS",
        ].map((heading) => (
          <Typography
            key={heading}
            sx={{
              ...baseText,
              fontSize: "10px",
              lineHeight: "13px",
              fontWeight: 600,
              color: "#6B7280",
            }}
          >
            {heading}
          </Typography>
        ))}
      </Box>

      {/* ROWS */}
      {residueInteractions.map((row) => (
        <Box
          key={row.id}
          sx={{
            display: "grid",
            gridTemplateColumns:
              "30px 80px 80px 70px 70px 100px 80px 80px",
            minWidth: "590px",
            padding: "7px 10px",
            boxSizing: "border-box",
            borderBottom: "1px solid #F3F4F6",
            background: "#FFFFFF",
          }}
        >
          {[
            row.id,
            row.residue,
            row.receptor,
            row.recBQ,
            row.resBQ,
            row.selection,
            row.ligBonds,
            row.intBonds,
          ].map((value, index) => (
            <Typography
              key={`${row.id}-${index}`}
              sx={{
                ...baseText,
                fontSize: "11px",
                lineHeight: "13px",
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </Typography>
          ))}
        </Box>
      ))}
    </Box>
  );
};

/* ============================================================================
   HYDROGEN BONDS
============================================================================ */

const HydrogenBonds = () => {
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
      <Box
        sx={{
          height: "35px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          boxSizing: "border-box",
        }}
      >
        <Typography
          sx={{
            ...baseText,
            fontSize: "12px",
            lineHeight: "15px",
            fontWeight: 600,
          }}
        >
          Hydrogen Bonds
        </Typography>

        <Typography
          sx={{
            ...baseText,
            fontSize: "11px",
            color: "#6B7280",
          }}
        >
          (5 found)
        </Typography>
      </Box>

      {/* HEADER */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            "30px 80px 80px 80px 70px 100px 80px 80px",
          minWidth: "600px",
          padding: "8px 10px",
          background: "#F9FAFB",
          borderTop: "1px solid #F3F4F6",
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        {[
          "#",
          "RESIDUE",
          "RECEPTOR",
          "DONOR_BQ",
          "REC_BQ",
          "SELECTION",
          "DIST H_A",
          "DIST D_A",
        ].map((heading) => (
          <Typography
            key={heading}
            sx={{
              ...baseText,
              fontSize: "10px",
              lineHeight: "13px",
              fontWeight: 600,
              color: "#6B7280",
            }}
          >
            {heading}
          </Typography>
        ))}
      </Box>

      {/* ROWS */}
      {hydrogenBonds.map((row) => (
        <Box
          key={row.id}
          sx={{
            display: "grid",
            gridTemplateColumns:
              "30px 80px 80px 80px 70px 100px 80px 80px",
            minWidth: "600px",
            padding: "7px 10px",
            borderBottom: "1px solid #F3F4F6",
            boxSizing: "border-box",
          }}
        >
          {[
            row.id,
            row.residue,
            row.receptor,
            row.donorBQ,
            row.recBQ,
            row.selection,
            row.distHA,
            row.distDA,
          ].map((value, index) => (
            <Typography
              key={`${row.id}-${index}`}
              sx={{
                ...baseText,
                fontSize: "11px",
                lineHeight: "13px",
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </Typography>
          ))}
        </Box>
      ))}
    </Box>
  );
};

/* ============================================================================
   PROTEIN VISUALIZATION
============================================================================ */

const ProteinVisualization = () => {
  return (
    <Box
      sx={{
        width: "208px",
        flexShrink: 0,
        boxSizing: "border-box",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        background: "#F8FAFC",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",

        "@media (max-width: 850px)": {
          width: "100%",
        },
      }}
    >
      <Typography
        sx={{
          ...baseText,
          fontSize: "13px",
          lineHeight: "17px",
          fontWeight: 600,
          color: "#1E293B",
        }}
      >
        Protein Visualization
      </Typography>

      {/* ACTUAL UPLOADED IMAGE */}
      <Box
        component="img"
        src="/assets/protein-visualization.png"
        alt="JAK2 protein visualization"
        sx={{
          display: "block",
          width: "100%",
          height: "379px",
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: "8px",
          background: "#FFFFFF",

          "@media (max-width: 850px)": {
            height: "auto",
            maxHeight: "420px",
            objectFit: "contain",
          },
        }}
      />

      <Typography
        sx={{
          ...baseText,
          width: "166px",
          fontSize: "11px",
          lineHeight: "18px",
          fontWeight: 400,
          color: "#596673",
        }}
      >
        Target: JAK2 Kinase Domain
        <br />
        Binding Energy: -8.045 kcal/mol
        <br />
        Mode: 1 of 5
      </Typography>
    </Box>
  );
};

/* ============================================================================
   EXPANDED PLP REPORT
============================================================================ */

/* Retained but NOT rendered: these read the residueInteractions /
   hydrogenBonds / recommendations fixtures, and the API exposes no endpoint
   for any of them (the collection lists the PLP report, 3D view and download
   bundles as unavailable on this deployment). Kept so the markup is ready if
   those endpoints appear, rather than deleted and rebuilt from scratch. */
// eslint-disable-next-line no-unused-vars
const ExpandedPLPReport = () => {
  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        marginTop: "12px",
        padding: "12px",
        background: "#F8FAFC",
        border: "1px solid #00BCD4",
        borderRadius: "8px",
      }}
    >
      {/* TITLE */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <Typography
          sx={{
            ...baseText,
            fontSize: "11px",
            color: TEAL,
            fontWeight: 500,
          }}
        >
          ▼
        </Typography>

        <Typography
          sx={{
            ...baseText,
            fontSize: "13px",
            lineHeight: "16px",
            fontWeight: 700,
            color: TEAL,
          }}
        >
          JAK2 - Expanded PLP Report (Mode 1, -8.045 kcal/mol)
        </Typography>
      </Box>

      {/* REPORT CONTENT */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",

          "@media (max-width: 850px)": {
            flexDirection: "column",
          },
        }}
      >
        {/* LEFT COLUMN */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* MODE BANNER */}
          <Box
            sx={{
              boxSizing: "border-box",
              width: "100%",
              minHeight: "38px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              background: "#FFFFFF",
              border: "1px solid #00BCD4",
              borderLeft: "3px solid #00BCD4",
              borderRadius: "8px",
              boxShadow: "0px 2px 4px rgba(0,0,0,0.03)",
            }}
          >
            <Typography
              sx={{
                ...baseText,
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 700,
              }}
            >
              JAK2 Mode 1
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "13px",
                lineHeight: "16px",
                fontWeight: 600,
                color: TEAL,
              }}
            >
              -8.045 kcal/mol
            </Typography>
          </Box>

          <ResidueInteractions />

          <HydrogenBonds />

          {/* SUMMARY */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
              padding: "0 4px",
            }}
          >
            <Typography
              sx={{
                ...baseText,
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              7 residue interactions
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              5 hydrogen bonds
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "11px",
                fontWeight: 500,
                color: TEAL,
              }}
            >
              Best H-bond: 3.26 Å
            </Typography>
          </Box>
        </Box>

        {/* RIGHT COLUMN */}
        <ProteinVisualization />
      </Box>
    </Box>
  );
};

/* ============================================================================
   ACTION BUTTONS
============================================================================ */

/* Retained but NOT rendered: these read the residueInteractions /
   hydrogenBonds / recommendations fixtures, and the API exposes no endpoint
   for any of them (the collection lists the PLP report, 3D view and download
   bundles as unavailable on this deployment). Kept so the markup is ready if
   those endpoints appear, rather than deleted and rebuilt from scratch. */
// eslint-disable-next-line no-unused-vars
const ActionButtons = ({ expanded, actions = {} }) => {
  const normalButton = {
    minHeight: "32px",
    height: "32px",
    padding: "8px 16px",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    background: "#FFFFFF",
    color: "#334155",
    fontFamily: FONT,
    fontSize: "13px",
    lineHeight: "16px",
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

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        paddingTop: "12px",
      }}
    >
      <Button sx={normalButton}>Branch</Button>

      <Button sx={normalButton} onClick={actions.onRerun} disabled={!actions.onRerun || Boolean(actions.busy)}>{actions.busy === "rerun" ? "Rerunning…" : "Rerun"}</Button>

      <Button
        sx={{
          ...normalButton,
          background: expanded ? TEAL : "#FFFFFF",
          color: expanded ? "#FFFFFF" : "#334155",
          borderColor: expanded ? TEAL : "#E2E8F0",

          "&:hover": {
            background: expanded ? "#00A9BF" : "#F8FAFC",
            borderColor: expanded ? "#00A9BF" : "#CBD5E1",
          },
        }}
      >
        Export PLP Report
      </Button>

      <Button sx={normalButton}>Create Bundle</Button>

      <Button sx={normalButton}>Download Bundle</Button>
    </Box>
  );
};

/* ============================================================================
   OVERALL RECOMMENDATION
============================================================================ */

/* Retained but NOT rendered: these read the residueInteractions /
   hydrogenBonds / recommendations fixtures, and the API exposes no endpoint
   for any of them (the collection lists the PLP report, 3D view and download
   bundles as unavailable on this deployment). Kept so the markup is ready if
   those endpoints appear, rather than deleted and rebuilt from scratch. */
// eslint-disable-next-line no-unused-vars
const OverallRecommendation = () => {
  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        marginTop: "12px",
        padding: "16px",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
      }}
    >
      <Typography
        sx={{
          ...baseText,
          fontSize: "14px",
          lineHeight: "17px",
          fontWeight: 700,
          color: TEAL,
          marginBottom: "8px",
        }}
      >
        Overall Recommendation - All Targets
      </Typography>

      <Typography
        sx={{
          ...baseText,
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 400,
          color: "#475569",
          marginBottom: "8px",
        }}
      >
        Based on molecular docking analysis across 5 protein targets, the
        following repurposing candidates show strongest potential for Type 2
        Diabetes:
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {recommendations.map((item) => (
          <Box
            key={item.target}
            sx={{
              display: "grid",
              gridTemplateColumns: "80px 150px 160px 1fr",
              alignItems: "center",
              minHeight: "25px",
              paddingLeft: "8px",

              "@media (max-width: 700px)": {
                gridTemplateColumns: "70px 120px 140px 1fr",
              },
            }}
          >
            <Typography
              sx={{
                ...baseText,
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {item.target}
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "12px",
                color: "#475569",
              }}
            >
              {item.compound}
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "12px",
                color: "#475569",
              }}
            >
              {item.affinity}
            </Typography>

            <Typography
              sx={{
                ...baseText,
                fontSize: "12px",
                fontWeight: 500,
                color: item.color,
              }}
            >
              {item.level}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        sx={{
          ...baseText,
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 600,
          color: TEAL,
          marginTop: "4px",
        }}
      >
        Top candidates: JAK2 + Gefitinib and EGFR + Gefitinib recommended for
        further validation.
      </Typography>
    </Box>
  );
};

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

/**
 * ScreenSuite — molecular docking.
 *
 * ⚠️ Docking cannot complete on this deployment: PyMOL and Vina are not
 * installable on Databricks Apps, so /agents/screensuite/screen fails. The
 * PLP report, the residue/hydrogen-bond breakdowns, the 3D viewer and the
 * download bundles have no endpoint in the API at all.
 *
 * So everything below the affinity table is fixture-backed with nothing to
 * replace it. Rather than present that as real output, the results view shows
 * the affinity table when the API returns hits, and an explicit
 * not-available notice when it does not.
 */
const ScreeningSuitePhase = ({
  workflowPhase,
  progressMessage,
  hits = [],
  loading = false,
  error = null,
  onRetry,
  unavailable = false,
  unavailableMessage,
  /** Branch / Rerun / Export handlers from usePhaseActions. */
  actions = {},
}) => {
  const [selectedReport, setSelectedReport] = useState(null);

  const hasHits = Array.isArray(hits) && hits.length > 0;

  /**
   * What is being docked, read off the hits rather than named in the copy.
   * The header used to say "Metformin and Pioglitazone against JAK2" on every
   * run.
   */
  const subject = hasHits
    ? `${[...new Set(hits.map((h) => h.ligand).filter((l) => l && l !== "—"))].join(", ")} against ${
        [...new Set(hits.map((h) => h.protein).filter((p) => p && p !== "—"))].join(", ")
      }`
    : null;

  if (workflowPhase === "screensuite-loading") {
    return (
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          height: "100%",
          background: GRAY_BG,
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "none",
            margin: 0,
            padding: "24px 40px 40px",
            boxSizing: "border-box",

            "@media (max-width: 700px)": {
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "16px",
            },
          }}
        >
          <UserMessage subject={subject} />

          <Box
            sx={{
              width: "100%",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px",
              boxSizing: "border-box",
            }}
          >
            <AgentHeader />

            <Typography
              sx={{
                ...baseText,
                fontSize: "14px",
                lineHeight: "22px",
                fontWeight: 400,
                color: "#334155",
                marginBottom: "12px",
              }}
            >
              {progressMessage ||
                "Received candidates from CurateX. Initializing molecular docking pipeline..."}
            </Typography>

            {/* Said up front, because the run is expected to fail here and a
                silent eight-minute wait followed by an error is worse. */}
            {unavailable && (
              <Typography
                sx={{
                  ...baseText,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#B45309",
                  marginBottom: "12px",
                }}
              >
                {unavailableMessage ||
                  "Docking is not expected to succeed on this deployment."}
              </Typography>
            )}

            <Box
              sx={{
                border: "1px solid #F1F5F9",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <Typography
                sx={{
                  ...baseText,
                  fontSize: "13px",
                  lineHeight: "16px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "12px",
                }}
              >
                ⚡ ScreenSuite - Docking Initialization
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "space-between", ...baseText, fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>
                <span>Setting up docking environment...</span>
                <span style={{ color: TEAL, fontWeight: 700 }}>12%</span>
              </Box>

              <Box sx={{ height: "5px", background: "#F1F5F9", borderRadius: "4px", marginBottom: "12px" }}>
                <Box sx={{ width: "12%", height: "100%", background: TEAL, borderRadius: "4px" }} />
              </Box>

              {[
                ["✓", "Candidates received - Metformin (94%), Pioglitazone (91%)", "#00BCD4"],
                ["✓", "Target validated - JAK2 (UniProt: O60674)", "#00BCD4"],
                ["◉", "Preparing receptor structure & binding site grid...", "#00BCD4"],
                ["○", "Run PLP docking simulations", "#CBD5E1"],
              ].map(([icon, label, color]) => (
                <Box key={label} sx={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "7px" }}>
                  <span style={{ color, fontSize: "11px", width: "10px" }}>{icon}</span>
                  <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "15px", fontWeight: 500, color: "#334155" }}>
                    {label}
                  </Typography>
                </Box>
              ))}

              {/* The "~8 min" here matched the old 8-second mock timer, not
                  anything the backend reports. There is no estimate in the
                  status payload, so none is shown. */}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: "100%",
        background: GRAY_BG,
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          margin: 0,
          padding: "24px 40px 40px",
          boxSizing: "border-box",

          "@media (max-width: 700px)": {
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "16px",
          },
        }}
      >
        {/* ================================================================
            USER REQUEST
        ================================================================= */}

        <UserMessage subject={subject} />

        {/* ================================================================
            MAIN AGENT CARD
        ================================================================= */}

        <Box
          sx={{
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <AgentHeader />

          <Typography
            sx={{
              ...baseText,
              fontSize: "14px",
              lineHeight: "22px",
              fontWeight: 400,
              color: "#334155",
              marginBottom: "12px",
            }}
          >
            {/* Was "Processed 142 compounds against 5 protein targets" on every
                run, including runs that returned nothing. */}
            {error
              ? error
              : loading
              ? "Loading docking hits…"
              : hasHits
              ? `Docking complete. ${hits.length} hit${hits.length === 1 ? "" : "s"} returned. Select a protein to view its detailed PLP Report:`
              : "Docking returned no hits."}
          </Typography>

          {error && onRetry && (
            <Button
              onClick={onRetry}
              sx={{ ...baseText, textTransform: "none", fontSize: "13px", color: TEAL, marginBottom: "12px" }}
            >
              Try again
            </Button>
          )}

          {/* ==============================================================
              DOCKING RESULTS
          ============================================================== */}

          {hasHits && (
            <PLPTable
              hits={hits}
              onOpenReport={(row) => {
                setSelectedReport(row);
              }}
            />
          )}

          {/* The expanded PLP report, residue interactions, hydrogen bonds,
              the 3D viewer, the download bundles and the overall
              recommendation are NOT rendered.

              /hits is the only ScreenSuite results endpoint in the API — the
              rest have none at all, and their components read fixed residue,
              hydrogen-bond and affinity tables (A:ALA:68, -8.046 kcal/mol,
              "High (92%)"). Rendering those next to a real affinity table
              would present invented structural data as measurement, which is
              worse than showing nothing. They stay in this file, unrendered,
              for whenever the endpoints exist. */}
          {hasHits && selectedReport && (
            <Box
              sx={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "12px",
              }}
            >
              <Typography
                sx={{ ...baseText, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}
              >
                No PLP report for {selectedReport.protein}
              </Typography>
              <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "18px", color: "#64748B" }}>
                The affinity above is the full extent of what this deployment
                returns. Residue interactions, hydrogen bonds, the 3D pose view
                and the downloadable bundle have no endpoint in the API.
              </Typography>
            </Box>
          )}

          {!hasHits && !loading && (
            <Box
              role="alert"
              sx={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <Typography
                sx={{ ...baseText, fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}
              >
                Docking output is not available
              </Typography>
              <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "18px", color: "#64748B" }}>
                {unavailable && unavailableMessage
                  ? unavailableMessage
                  : "No binding affinities were returned for this run, so there is no PLP report, 3D view or download bundle to show."}
              </Typography>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
};

export default ScreeningSuitePhase;