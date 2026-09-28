import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";

/**
 * Help Center, Privacy Policy and Terms of Service.
 *
 * The login footer and the sign-up consent line pointed at these but they did
 * not exist (testing). The screens and routes are real; their wording has to
 * come from product / legal, so each section says plainly that its content is
 * still to be provided rather than inventing policy text.
 */

const FONT = "'Geist', 'Inter', sans-serif";
const TEAL = "#00BCD4";

const PAGES = {
  help: {
    title: "Help Center",
    intro: "Guidance for using the Drug Repurposing Platform.",
    sections: [
      "Getting started",
      "Running a research session",
      "Working with branches",
      "Exporting results",
      "Contact support",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "How the Drug Repurposing Platform collects, uses and protects your information.",
    sections: [
      "Information we collect",
      "How we use information",
      "Data retention",
      "Your rights",
      "Contact",
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "The terms that apply to your use of the Drug Repurposing Platform.",
    sections: [
      "Acceptance of terms",
      "Use of the platform",
      "Accounts and security",
      "Intellectual property",
      "Limitation of liability",
      "Changes to these terms",
    ],
  },
};

const OTHER_LINKS = [
  { key: "help", to: "/help", label: "Help Center" },
  { key: "privacy", to: "/privacy", label: "Privacy Policy" },
  { key: "terms", to: "/terms", label: "Terms of Service" },
];

const InfoPage = ({ page }) => {
  const navigate = useNavigate();
  const content = PAGES[page] ?? PAGES.help;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F8FAFC", fontFamily: FONT }}>
      <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: "16px", md: "32px" }, py: { xs: "32px", md: "56px" } }}>
        <Button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/login"))}
          sx={{ textTransform: "none", fontFamily: FONT, color: TEAL, px: 0, mb: "20px" }}
        >
          ← Back
        </Button>

        <Typography component="h1" sx={{ fontFamily: FONT, fontSize: "28px", fontWeight: 700, color: "#0F172A", mb: "8px" }}>
          {content.title}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "15px", color: "#475569", mb: "20px" }}>{content.intro}</Typography>

        <Box
          role="note"
          sx={{ p: "12px 14px", mb: "28px", borderRadius: "8px", bgcolor: "#FEF3C7", border: "1px solid #FDE68A" }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#92400E" }}>
            The approved text for this page is still to be provided. The sections below show its structure.
          </Typography>
        </Box>

        {content.sections.map((heading) => (
          <Box key={heading} sx={{ mb: "22px" }}>
            <Typography component="h2" sx={{ fontFamily: FONT, fontSize: "17px", fontWeight: 600, color: "#0F172A", mb: "6px" }}>
              {heading}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#94A3B8", fontStyle: "italic" }}>
              Content to be provided.
            </Typography>
          </Box>
        ))}

        <Box sx={{ display: "flex", gap: "20px", flexWrap: "wrap", mt: "40px", pt: "20px", borderTop: "1px solid #E2E8F0" }}>
          {OTHER_LINKS.filter((l) => l.key !== page).map((l) => (
            <Typography
              key={l.key}
              component={RouterLink}
              to={l.to}
              sx={{ fontFamily: FONT, fontSize: "14px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              {l.label}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default InfoPage;
