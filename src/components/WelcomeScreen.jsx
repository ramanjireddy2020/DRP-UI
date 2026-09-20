import { useEffect, useState } from "react";
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
  getResearchFocus,
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
   Therapeutic specialties
   ============================================================ */

const SPECIALTIES = [
  {
    label: "Oncology / Cancer",
    defaultOn: true,
  },
  {
    label: "Neurodegenerative (Alzheimer's, Parkinson's)",
    defaultOn: false,
  },
  {
    label: "Diabetes",
    defaultOn: true,
  },
  {
    label: "Cardiovascular Systems",
    defaultOn: false,
  },
  {
    label: "Immunology & Inflammation",
    defaultOn: false,
  },
  {
    label: "Infectious Viruses",
    defaultOn: false,
  },
];


/* ============================================================
   Initial search tags
   ============================================================ */

const INITIAL_SEARCH_TAGS = [
  "Type 2 Diabetes",
  "Oncology",
  "Rare Diseases",
];


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
     Selected specialties state
     ============================================================ */

  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      SPECIALTIES.map(
        ({ label, defaultOn }) => [
          label,
          defaultOn,
        ]
      )
    )
  );


  /* ============================================================
     Search tags state
     ============================================================ */

  const [searchTags, setSearchTags] =
    useState(INITIAL_SEARCH_TAGS);

  const [draft, setDraft] =
    useState("");


  /* ============================================================
     Saving state

     Review point 10: the picker was pure local state — "Save Focus
     & Get Started" called an optional prop and navigated away, so
     nothing was ever written. It now reads GET and writes POST
     /users/me/research-focus.
     ============================================================ */

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);


  /* ============================================================
     Pre-select whatever was saved before
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    getResearchFocus()
      .then((focus) => {
        const areas = Array.isArray(focus)
          ? focus
          : focus?.therapeuticAreas;

        if (!mounted || !Array.isArray(areas) || !areas.length) return;

        setSelected((previous) => {
          const next = { ...previous };
          Object.keys(next).forEach((label) => {
            next[label] = areas.includes(label);
          });
          return next;
        });

        // Anything saved that is not one of the six built-in chips is
        // still the user's focus, so it shows as a removable tag.
        setSearchTags((previous) => [
          ...previous,
          ...areas.filter(
            (area) =>
              !SPECIALTIES.some((s) => s.label === area) &&
              !previous.includes(area)
          ),
        ]);
      })
      .catch(() => {
        // Onboarding must not be blocked by a missing saved focus.
      });

    return () => {
      mounted = false;
    };
  }, []);


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

  const handleSave = async () => {
    if (saving) return;

    // The chips the user ticked plus any free-text disease area they added:
    // both are "therapeutic areas of interest" as far as the endpoint goes.
    const therapeuticAreas = [
      ...Object.entries(selected)
        .filter(([, on]) => on)
        .map(([label]) => label),
      ...searchTags,
    ];

    setSaving(true);
    setSaveError(null);

    try {
      await saveResearchFocus(therapeuticAreas);
    } catch (error) {
      // Surfaced rather than swallowed — the whole point of this screen is
      // that the choice is persisted, so a silent failure is worse than a
      // blocked button.
      setSaveError(
        error?.userMessage ||
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

    navigate("/dashboard/new-research");
  };


  /* ============================================================
     Skip
     ============================================================ */

  const handleSkip = () => {
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

              <StepCard
                step={1}
                iconType="target"
                title="Set Research Focus"
                description="Identify therapeutic areas of focus for your research"
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

              {SPECIALTIES.map((specialty) => {

                const active =
                  selected[specialty.label];


                return (
                  <button
                    type="button"
                    key={specialty.label}
                    className={`ws-specialty ${
                      active
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggleSpecialty(
                        specialty.label
                      )
                    }
                    aria-pressed={active}
                  >

                    <span>
                      {specialty.label}
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
              disabled={saving}
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
              >
                take me to the new research task
              </button>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}