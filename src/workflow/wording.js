/**
 * Product wording applied to text that arrives from the backend.
 *
 * Testing asked for CurateX's output to be called the "ideal candidate
 * profile" everywhere. The UI's own strings say so, but the backend still
 * writes "drug profile" / "Target Product Profile" in progress lines
 * ("Building the drug profile for jak2...") and in the supervisor's replies.
 * Until the backend copy changes, those phrases are rewritten on display.
 */
const PROFILE_TERMS = /\b(?:target\s+product\s+profile|target\s+candidate\s+profile|drug\s+profile)\b/gi;

const REPLACEMENT = "ideal candidate profile";

/** All caps stays all caps; a sentence start is capitalised; otherwise lower case. */
const casedFor = (match, offset, whole) => {
  if (match === match.toUpperCase()) return REPLACEMENT.toUpperCase();
  const before = whole.slice(0, offset).trimEnd();
  const startsSentence = before === "" || /[.!?:]$/.test(before);
  return startsSentence ? REPLACEMENT.replace(/^./, (c) => c.toUpperCase()) : REPLACEMENT;
};

export const withProductWording = (text) =>
  typeof text === "string"
    ? text
        .replace(PROFILE_TERMS, casedFor)
        // "a ideal candidate profile" → "an ideal candidate profile"
        .replace(/\b([Aa]) (ideal candidate profile|IDEAL CANDIDATE PROFILE|Ideal candidate profile)/g, "$1n $2")
    : text;

export default withProductWording;
