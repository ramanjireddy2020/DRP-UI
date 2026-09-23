import { useCallback, useEffect, useState } from "react";
import {
  X,
  Plus,
  Check,
  Target,
  FlaskConical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";
import {
  completeOnboarding,
  getTherapeuticAreas,
  saveResearchFocus,
} from "../services/researchApi";
import "./WelcomeScreen.css";

/**
 * Backward-compatible background export.
 */
export const BG_IMAGE =
  "radial-gradient(100% 100% at 50% 50%, rgba(0, 194, 181, 0.65) 0%, rgba(0, 194, 181, 0) 100%), " +
  "radial-gradient(100% 100% at 50% 50%, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 100%), " +
  "#f8fafc";


/* ============================================================
   Therapeutic areas

   The chips come from GET /therapeutic-areas (a string array).
   The hardcoded SPECIALTIES list and the three default search
   tags were removed: they drifted from the backend catalog and
   saved areas the user never picked. Nothing starts selected.
   ============================================================ */

const statusTextStyle = {
  margin: 0,
  fontFamily: "Inter, sans-serif",
  fontSize: "12px",
  color: "#64748b",
};


/* ============================================================
   iNovaPath Logo
   Figma properties:

   Frame:
   Width  : 106px
   Height : 28px
   Radius : 20px
   Padding: 6px 12px

   Text:
   Content       : ◇ iNovaPath
   Width         : 82px
   Height        : 16px
   Font          : Inter
   Weight        : 600
   Size           : 13px
   Line height    : 100%
   Letter spacing: 0%
   Color          : #00C2B5
   ============================================================ */

function NovaPathLogo() {
  return (
    <div
      className="ws-badge"
      aria-label="iNovaPath"
    >
      <span className="ws-logo-text">
        ◈ iNovaPath
      </span>
    </div>
  );
}


/* ============================================================
   Step Card
   ============================================================ */

function StepCard({
  step,
  iconType,
  title,
  description,
  tags = [],
}) {
  return (
    <article className="ws-step-card">

      {/* Step header */}

      <div className="ws-step-header">

        {/* Figma STEP badge */}

        <span className="ws-step-label">
          STEP {step}
        </span>


        {/* Step icon */}

        <div
          className="ws-step-icon"
          aria-hidden="true"
        >
          {iconType === "target" ? (
            <Target
              size={24}
              strokeWidth={2}
            />
          ) : (
            <FlaskConical
              size={22}
              strokeWidth={2}
            />
          )}
        </div>

      </div>


      {/* Title */}

      <h2>
        {title}
      </h2>


      {/* Description */}

      <p>
        {description}
      </p>


      {/* Tags — step 1 carries none since review point 8 trimmed it. */}

      {tags.length > 0 && (
        <div className="ws-tag-row">

          {tags.map((tag) => (
            <span
              className="ws-tag-pill"
              key={tag}
            >
              {tag}
            </span>
          ))}

        </div>
      )}

    </article>
  );
}


/* ============================================================
   Search Tag
   ============================================================ */

function SearchTag({
  label,
  onRemove,
}) {
  return (
    <span className="ws-search-tag">

      <span>
        {label}
      </span>


      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <X size={12} />
      </button>

    </span>
  );
}


/* ============================================================
   Welcome Screen
   ============================================================ */

export default function WelcomeScreen({
  userName,
  onSave,
  onSkip,
}) {
  const navigate = useNavigate();

  // Review point 6: the greeting was hardcoded to "Priya". It now comes from
  // GET /users/me via the context, with an explicit prop still winning so the
  // screen stays usable in isolation.
  const { displayName } = useCurrentUser();
  const greetingName = userName || displayName;


  /* ============================================================
     Therapeutic area catalog (GET /therapeutic-areas)
     ============================================================ */

  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState(null);

  const loadAreas = useCallback(() => {
    let mounted = true;

    setAreasLoading(true);
    setAreasError(null);

    getTherapeuticAreas()
      .then((list) => {
        if (!mounted) return;
        setAreas(
          Array.isArray(list)
            ? list.filter((item) => typeof item === "string" && item.trim())
            : []
        );
      })
      .catch((error) => {
        if (!mounted) return;
        setAreasError(
          error?.userMessage ||
            "Could not load therapeutic areas."
        );
      })
      .finally(() => {
        if (mounted) setAreasLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => loadAreas(), [loadAreas]);


  /* ============================================================
     Selected chips — only what the user ticks
     ============================================================ */

  const [selected, setSelected] = useState({});


  /* ============================================================
     Search tags state — free-text areas the user typed
     ============================================================ */

  const [searchTags, setSearchTags] =
    useState([]);

  const [draft, setDraft] =
    useState("");


  /* ============================================================
     Saving state

     "Save" writes POST /users/me/research-focus and then
     POST /users/me/onboarding/complete; "Skip" only completes
     onboarding. Both responses are { success, message } and a
     success: false is surfaced, not ignored.
     ============================================================ */

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [skipping, setSkipping] = useState(false);
  const [skipFailed, setSkipFailed] = useState(false);


  /* ============================================================
     Toggle specialty
     ============================================================ */

  const toggleSpecialty = (label) => {
    setSelected((previous) => ({
      ...previous,
      [label]: !previous[label],
    }));
  };


  /* ============================================================
     Remove search tag
     ============================================================ */

  const removeSearchTag = (label) => {
    setSearchTags((previous) =>
      previous.filter(
        (item) => item !== label
      )
    );
  };


  /* ============================================================
     Add search tag
     ============================================================ */

  const addDraftTag = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const value = draft.trim();

    if (!value) {
      return;
    }

    event.preventDefault();

    const catalogMatch = areas.find(
      (area) => area.toLowerCase() === value.toLowerCase()
    );

    if (catalogMatch) {
      setSelected((previous) => ({
        ...previous,
        [catalogMatch]: true,
      }));
      setDraft("");
      return;
    }

    setSearchTags((previous) =>
      previous.includes(value)
        ? previous
        : [...previous, value]
    );

    setDraft("");
  };


  /* ============================================================
     Save
     ============================================================ */

  /**
   * POST /users/me/onboarding/complete. Throws with a user-facing
   * message when the request fails or the backend says success: false.
   */
  const finishOnboarding = async () => {
    const result = await completeOnboarding({});

    if (result?.success === false) {
      throw new Error(
        result?.message ||
          "Could not complete onboarding. Please try again."
      );
    }
  };

  const handleSave = async () => {
    if (saving || skipping) return;

    // Only what the user chose: the chips they ticked plus any free-text
    // disease area they added.
    const therapeuticAreas = Array.from(
      new Set([
        ...areas.filter((label) => selected[label]),
        ...searchTags,
      ])
    );

    setSaving(true);
    setSaveError(null);

    try {
      if (therapeuticAreas.length) {
        const result = await saveResearchFocus(therapeuticAreas);

        if (result?.success === false) {
          throw new Error(
            result?.message ||
              "Could not save your research focus. Please try again."
          );
        }
      }

      await finishOnboarding();
    } catch (error) {
      // Surfaced rather than swallowed — the whole point of this screen is
      // that the choice is persisted, so a silent failure is worse than a
      // blocked button.
      setSaveError(
        error?.userMessage ||
          error?.message ||
          "Could not save your research focus. Please try again."
      );
      setSaving(false);
      return;
    }

    setSaving(false);

    onSave?.({
      selected,
      searchTags,
      therapeuticAreas,
    });

    navigate("/dashboard");
  };


  /* ============================================================
     Skip

     Still marks onboarding complete so the splash stops routing
     here. If that fails the error is shown and the next click
     continues anyway, so a backend problem never traps the user.
     ============================================================ */

  const handleSkip = async () => {
    if (saving || skipping) return;

    if (!skipFailed) {
      setSkipping(true);
      setSaveError(null);

      try {
        await finishOnboarding();
      } catch (error) {
        setSaveError(
          `${
            error?.userMessage ||
            error?.message ||
            "Could not complete onboarding."
          } Click skip again to continue anyway.`
        );
        setSkipFailed(true);
        setSkipping(false);
        return;
      }

      setSkipping(false);
    }

    onSkip?.();

    navigate("/dashboard/new-research");
  };


  return (
    <main className="welcome-screen">

      {/* ========================================================
          BACKGROUND
          ======================================================== */}

      <div
        className="ws-background"
        aria-hidden="true"
      >

        {/* Main glow */}

        <div className="bg-glow-main" />


        {/* Center rings */}

        <div className="bg-ring bg-ring-1" />

        <div className="bg-ring bg-ring-2" />

        <div className="bg-ring bg-ring-3" />


        {/* Corner glows */}

        <div className="bg-glow bg-glow-tl-1" />

        <div className="bg-glow bg-glow-tl-2" />

        <div className="bg-glow bg-glow-mid-left" />

        <div className="bg-glow bg-glow-top-right" />

        <div className="bg-glow bg-glow-bottom-right" />

      </div>


      {/* ========================================================
          VIEWPORT
          ======================================================== */}

      <div className="ws-viewport">

        <div className="ws-design-frame">


          {/* ====================================================
              HERO
              ==================================================== */}

          <header className="ws-hero">

            {/* iNovaPath Figma logo */}

            <NovaPathLogo />


            {/* Heading */}

            <h1>
              Welcome to iNovaPath, {greetingName}!
            </h1>


            {/* Description */}

            <p>
              Your Gen AI powered research assistant.
            </p>

          </header>


          {/* ====================================================
              GETTING STARTED GUIDE
              ==================================================== */}

          <div className="ws-guide">

            <span />

            <strong>
              Getting started guide
            </strong>

            <span />

          </div>


          {/* ====================================================
              STEP CARDS
              ==================================================== */}

          <section className="ws-onboarding">

            <div className="ws-step-grid">


              {/* ==================================================
                  STEP 1
                  ================================================== */}

              {/* Item T3: step 1 carries therapeutic-area boxes again, to
                  match step 2's row. Review point 8 had removed the previous
                  three; these are the four the testing team named. */}
              <StepCard
                step={1}
                iconType="target"
                title="Set Research Focus"
                description="Identify therapeutic areas of focus for your research"
                tags={[
                  "Oncology",
                  "Rare Diseases",
                  "Inflammation",
                  "Neurodegenerative",
                ]}
              />


              {/* ==================================================
                  STEP 2
                  ================================================== */}

              <StepCard
                step={2}
                iconType="flask"
                title="Complete the Workflow"
                description="Post natural language questions to the agent to complete the research workflow and identify repurposing hit"
                tags={[
                  "Target ID",
                  "Literature",
                  "Repurposing hit",
                  "Docking",
                  "Novelty search",
                ]}
              />

            </div>

          </section>


          {/* ====================================================
              QUICK START
              ==================================================== */}

          <section className="ws-quick-card">

            <h2>
              Quick Start: Select Therapeutic Areas of Interest
            </h2>


            <p>
              Search or select therapeutic areas to seed
              your home dashboard view.
            </p>


            {/* Search */}

            <div className="ws-search-box">

              {searchTags.map((tag) => (
                <SearchTag
                  key={tag}
                  label={tag}
                  onRemove={() =>
                    removeSearchTag(tag)
                  }
                />
              ))}


              <input
                type="text"
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value)
                }
                onKeyDown={addDraftTag}
                placeholder="Add more disease areas..."
                aria-label="Add disease area"
              />

            </div>


            {/* Therapeutic areas */}

            <div className="ws-specialty-row">

              {areasLoading && (
                <p style={statusTextStyle} role="status">
                  Loading therapeutic areas...
                </p>
              )}

              {!areasLoading && areasError && (
                <p className="ws-save-error" role="alert" style={{ margin: 0 }}>
                  {areasError}{" "}
                  <button
                    type="button"
                    onClick={loadAreas}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      textDecoration: "underline",
                      cursor: "pointer",
                      font: "inherit",
                    }}
                  >
                    Retry
                  </button>
                </p>
              )}

              {!areasLoading && !areasError && areas.length === 0 && (
                <p style={statusTextStyle}>
                  No therapeutic areas are available yet. You can still
                  add disease areas above.
                </p>
              )}

              {!areasLoading && !areasError && areas.map((label) => {

                const active = Boolean(selected[label]);


                return (
                  <button
                    type="button"
                    key={label}
                    className={`ws-specialty ${
                      active
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggleSpecialty(label)
                    }
                    aria-pressed={active}
                  >

                    <span>
                      {label}
                    </span>


                    {active ? (
                      <Check
                        size={13}
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    ) : (
                      <Plus
                        size={13}
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}

                  </button>
                );

              })}

            </div>

          </section>


          {/* ====================================================
              ACTIONS
              ==================================================== */}

          <div className="ws-actions">

            <button
              type="button"
              className="ws-primary"
              onClick={handleSave}
              disabled={saving || skipping}
            >
              {saving
                ? "Saving..."
                : "Save Focus & Get Started"}
            </button>


            {saveError && (
              <p
                className="ws-save-error"
                role="alert"
              >
                {saveError}
              </p>
            )}


            <div className="ws-skip">

              <span>
                Skip for now -
              </span>


              <button
                type="button"
                onClick={handleSkip}
                disabled={saving || skipping}
              >
                {skipping
                  ? "finishing setup..."
                  : "take me to the new research task"}
              </button>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}