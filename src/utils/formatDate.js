/**
 * The API returns naive ISO timestamps ("2026-09-11T05:29:58.373698") that are
 * UTC. Parse them as UTC and always display in UTC, ISO-8601 style.
 */
const parseUtc = (value) => {
  if (!value) return null;
  let text = String(value).trim();
  // Trim microseconds to milliseconds; not every engine parses 6 digits.
  text = text.replace(/(\.\d{3})\d+/, "$1");
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) text += "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "2026-09-11" (UTC), or "—" when missing/unparseable. */
export const formatUtcDate = (value) => {
  const date = parseUtc(value);
  return date ? date.toISOString().slice(0, 10) : "—";
};

/** "2026-09-11 05:29 UTC", or "—" when missing/unparseable. */
export const formatUtcDateTime = (value) => {
  const date = parseUtc(value);
  if (!date) return "—";
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
};

/**
 * Page buttons for a pager: always first and last, a window around the
 * current page, and "…" where pages are skipped.
 * @returns {Array<number|"…">}
 */
export const buildPageList = (page, totalPages) => {
  const total = Math.max(1, totalPages || 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
};
