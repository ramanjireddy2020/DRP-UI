import React from "react";

/**
 * Icons shared by the signed-out screens.
 *
 * The eye pair is lifted verbatim from Login.js rather than redrawn, so the
 * password toggle looks identical on sign in, sign up and reset — they sit on
 * the same field, and two hand-drawn variants of the same glyph is exactly how
 * screens start to look subtly different from one another.
 */

export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.3A10.7 10.7 0 0 1 12 4c7 0 10 8 10 8a17.5 17.5 0 0 1-3.1 4.6" />
    <path d="M6.6 6.6C3.8 8.3 2 12 2 12s3 8 10 8a9.8 9.8 0 0 0 4.4-1" />
  </svg>
);

/** The "Check your email" mark. Sized and coloured by .check-email-art. */
export const EnvelopeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
