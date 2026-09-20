import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SplashScreen.css";

import inovapathLogo from "./assets/inovapath-logo.png";

const SPLASH_DURATION = 4800;

const LogoMark = ({ size = 86 }) => {
  return (
    <img
      src={inovapathLogo}
      alt="iNovaPath"
      width={size}
      height={size}
      className="splash-logo-image"
    />
  );
};

const PARTICLES = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  angle: (360 / 30) * index,
  radius: 150 + (index % 5) * 42,
  size: 2 + (index % 3),
  duration: 8 + (index % 5),
  delay: -(index % 9) * 0.65,
}));

const ORBITS = [
  {
    className: "orbit orbit-one",
    duration: "18s",
    direction: "normal",
  },
  {
    className: "orbit orbit-two",
    duration: "26s",
    direction: "reverse",
  },
  {
    className: "orbit orbit-three",
    duration: "36s",
    direction: "normal",
  },
];

const SplashScreen = () => {
  const navigate = useNavigate();

  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, SPLASH_DURATION);

    const navigationTimer = setTimeout(() => {
      navigate("/welcome");
    }, SPLASH_DURATION + 850);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <main
      className={`splash-screen ${
        fading ? "is-fading" : ""
      }`}
    >
      {/* =====================================================
          BACKGROUND ATMOSPHERE
          ===================================================== */}

      <div className="splash-noise" />
      <div className="splash-vignette" />

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      {/* =====================================================
          SUBTLE GRID
          ===================================================== */}

      <div className="research-grid" />

      {/* =====================================================
          CENTRAL LIGHT FIELD
          ===================================================== */}

      <div className="center-glow" />
      <div className="center-pulse" />

      {/* =====================================================
          ORBIT SYSTEM
          ===================================================== */}

      <div className="orbit-system">
        {ORBITS.map((orbit, index) => (
          <div
            key={orbit.className}
            className={orbit.className}
            style={{
              "--orbit-duration": orbit.duration,
              "--orbit-direction": orbit.direction,
            }}
          >
            <span
              className={`orbit-dot orbit-dot-${index + 1}`}
            />
          </div>
        ))}
      </div>

      {/* =====================================================
          PARTICLES
          ===================================================== */}

      <div className="particle-field">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="particle"
            style={{
              "--angle": `${particle.angle}deg`,
              "--radius": `${particle.radius}px`,
              "--size": `${particle.size}px`,
              "--duration": `${particle.duration}s`,
              "--delay": `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* =====================================================
          CENTER CONTENT
          ===================================================== */}

      <section className="splash-content">

        {/* ===================================================
            MAIN iNovaPath LOGO
            =================================================== */}

        <div className="logo-stage">
          <div className="logo-ring ring-one" />
          <div className="logo-ring ring-two" />
          <div className="logo-ring ring-three" />

          <div className="logo-halo" />

          <div className="logo-core">
            <LogoMark size={86} />
          </div>
        </div>

        {/* ===================================================
            STATUS

            Review point 5: this single line is the only copy
            the splash screen carries. The brand title, the
            "research environment ready" state, the progress
            bar and the thinking dots were all removed.
            =================================================== */}

        <div className="status-block">
          <div className="status-title">
            Preparing your research workspace...
          </div>
        </div>
      </section>
    </main>
  );
};

export default SplashScreen;