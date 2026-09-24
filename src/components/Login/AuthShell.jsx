import React from "react";
import "./Login.css";

import molecularBg from "../assets/inovapath-loginbg.webp";
import inovapathLogo from "../assets/inovapath-logo.png";

/**
 * The page every signed-out screen sits on.
 *
 * Sign in, sign up and password reset are the same page with a different card
 * on the right, so the background, the brand and the hero copy live here once.
 * Three copies of this markup would drift the first time the description
 * changed — and that description is review point 1, already rewritten once.
 *
 * No new styling: every class below is one Login.css already defines, so the
 * new screens inherit the approved look with no second stylesheet to keep in
 * step.
 */

const Feature = ({ icon, title, text }) => (
  <div className="feature">
    <div className="feature-icon">{icon}</div>

    <div className="feature-content">
      <strong>{title}</strong>

      {/* Only the first tab carries a subtitle in the approved copy, so an
          absent `text` renders nothing rather than an empty line. */}
      {text ? <span>{text}</span> : null}
    </div>
  </div>
);

const AuthShell = ({ children }) => (
  <div className="login-page">
    {/* =====================================================
        MOLECULAR BACKGROUND
        ===================================================== */}

    <div
      className="molecular-background"
      style={{ backgroundImage: `url(${molecularBg})` }}
    />

    <div className="background-overlay" />

    {/* =====================================================
        LEFT SIDE
        ===================================================== */}

    <section className="login-visual">
      <div className="visual-content">
        <div className="brand">
          <div className="logo-wrapper">
            <img src={inovapathLogo} alt="Drug Repurposing Platform" className="brand-logo" />
          </div>

          <span className="brand-name">Drug Repurposing Platform</span>
        </div>

        <div className="hero-copy">
          <h1>
            Accelerated Drug
            <br />
            Discovery <span>with Gen AI</span>
          </h1>

          <p>
            An agentic AI platform to discover and validate existing drugs for
            new therapeutic indications.
          </p>
        </div>

        <div className="feature-row">
          <Feature
            icon="⌬"
            title="AI-Powered Analysis"
            text="Gen AI powered Reasoning"
          />

          <Feature icon="〽" title="Real-time Insights" />

          <Feature icon="◉" title="Biomedical Knowledge" />
        </div>
      </div>
    </section>

    {/* =====================================================
        RIGHT SIDE CARD
        ===================================================== */}

    <section className="login-panel">
      <div className="login-container">{children}</div>
    </section>
  </div>
);

export default AuthShell;
