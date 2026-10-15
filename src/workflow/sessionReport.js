/**
 * The end-of-session report, across every module the session ran.
 *
 * Testing found the report generated at the end of a session covered only the
 * last module (NovSearch), and that "Export report" re-ran NovSearch instead of
 * exporting. The summary is now assembled here from what each module's card
 * already holds, and exported from the browser as a printable page (the
 * browser's "Save as PDF"), so nothing is re-run to produce it.
 */

const top = (list, n) => (Array.isArray(list) ? list.slice(0, n) : []);

/** How many items each module lists, so no module outweighs the others. */
const TOP_N = 3;

/** Markdown and list markers out, whitespace collapsed. */
const flatten = (value) =>
  String(value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The first sentences of a module's own write-up, capped in length. The
 * report used to carry NovSearch's whole assessment but nothing of the other
 * modules' interpretation (demo 2026-10-15); every module now gets a note of
 * about the same size.
 */
const firstSentences = (value, count = 2, maxLength = 320) => {
  const textValue = flatten(value);
  if (!textValue) return null;
  const sentences = textValue.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [textValue];
  const joined = sentences.slice(0, count).map((x) => x.trim()).join(" ");
  return joined.length > maxLength ? `${joined.slice(0, maxLength - 1).trimEnd()}…` : joined;
};

/**
 * NovSearch's ESTIMATED viability, from the highest patent relevance. The
 * report has no verdict field, so this is labelled as an estimate wherever it
 * is shown. null with no scored patents.
 */
export const estimateViability = (patents) => {
  const scores = (patents ?? []).map((p) => p?.rawRelevance).filter((n) => Number.isFinite(n));
  if (!scores.length) return null;
  const topScore = Math.max(...scores);
  const level = topScore >= 0.9 ? "LOW" : topScore >= 0.75 ? "MODERATE" : "HIGH";
  return { top: topScore, level, label: `EST. ${level} VIABILITY` };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Each section is { key, title, summary, note, items }: a one-line count, a
 * short takeaway from the module's own text (null when it sent none) and at
 * most TOP_N top results.
 *
 * @returns {{ disease, target, sections: { key, title, summary, note, items: string[] }[] }}
 */
export const buildSessionReport = ({ txkg, litminex, curatexTarget, curatex, docking, novelty }) => {
  const sections = [];

  if (txkg?.hasData) {
    sections.push({
      key: "txkg",
      title: "TxKG — Target identification",
      summary: `${plural(txkg.count ?? txkg.targets.length, "protein target")} found`,
      note: firstSentences(txkg.interpretation),
      items: top(txkg.targets, TOP_N).map(
        (t) => `${t.name}${t.fullName && t.fullName !== t.name ? ` (${t.fullName})` : ""} — score ${t.score}`
      ),
    });
  }

  if (litminex?.hasData) {
    sections.push({
      key: "litminex",
      title: "LitMineX — Literature mining",
      summary: `${plural(litminex.total, "article")} retrieved`,
      note: firstSentences(litminex.insights?.content),
      items: top(litminex.articles, TOP_N).map((a) => `${a.title}${a.year ? ` (${a.year})` : ""}`),
    });
  }

  if (curatex?.hasData || curatexTarget) {
    sections.push({
      key: "curatex",
      title: "CurateX — Drug curation",
      summary: curatex?.hasData
        ? `${plural(curatex.total, "candidate")} scored${curatexTarget ? ` against the ${curatexTarget} ideal candidate profile` : ""}`
        : `Ideal candidate profile built${curatexTarget ? ` for ${curatexTarget}` : ""}; no candidates scored yet`,
      note: firstSentences(curatex?.recommendation?.text),
      items: top(curatex?.compounds, TOP_N).map((c) => `${c.name} — score ${c.score}`),
    });
  }

  if (docking?.hasData) {
    sections.push({
      key: "screensuite",
      title: "ScreenSuite — Docking",
      summary: `${plural(docking.hits.length, "docking hit")}`,
      note: firstSentences(docking.recommendation?.text),
      items: [...docking.hits]
        .sort((a, b) => (a.rawAffinity ?? 0) - (b.rawAffinity ?? 0))
        .slice(0, TOP_N)
        .map((h) => `${h.ligand} vs ${h.protein} — ${h.affinity} kcal/mol`),
    });
  }

  if (novelty?.hasData) {
    const patents = [...(novelty.patents ?? [])]
      .filter((p) => Number.isFinite(p.rawRelevance))
      .sort((a, b) => b.rawRelevance - a.rawRelevance);
    const viability = estimateViability(novelty.patents);
    sections.push({
      key: "novsearch",
      title: "NovSearch — Novelty search",
      summary: `${plural((novelty.patents ?? []).length, "patent")} found${viability ? ` · ${viability.label}` : ""}`,
      // A short novelty summary, not the full analysis.
      note: firstSentences(novelty.assessment, 3),
      items: top(patents, TOP_N).map((p) => `${p.id} — ${p.title} — relevance ${p.relevance}`),
    });
  }

  return {
    disease: txkg?.disease || novelty?.disease || null,
    target: curatexTarget || novelty?.target || null,
    sections,
  };
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Strip the markdown markers the agents' text carries, for the printed page. */
const plain = (value) =>
  String(value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");

/**
 * Open the report as a printable page and bring up the print dialog, where
 * "Save as PDF" produces the file. Returns false if the browser blocked the
 * window.
 */
export const printSessionReport = (report, { researcherName } = {}) => {
  const win = window.open("", "_blank");
  if (!win) return false;

  const date = new Date().toISOString().slice(0, 10);
  const sectionsHtml = report.sections.length
    ? report.sections
        .map(
          (s) => `
      <section>
        <h2>${escapeHtml(s.title)}</h2>
        <p class="summary">${escapeHtml(s.summary)}</p>
        ${s.note ? `<p class="note">${escapeHtml(s.note)}</p>` : ""}
        ${s.items.length ? `<ul>${s.items.map((i) => `<li>${escapeHtml(plain(i))}</li>`).join("")}</ul>` : ""}
      </section>`
        )
        .join("")
    : "<p>No module results were available for this session.</p>";

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Research Summary${report.disease ? ` - ${escapeHtml(report.disease)}` : ""}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #0F172A; margin: 32px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #64748B; margin-bottom: 20px; }
  h2 { font-size: 15px; margin: 18px 0 4px; padding-bottom: 3px; border-bottom: 2px solid #00BCD4; }
  .summary { font-weight: 600; margin: 4px 0; }
  .note { margin: 4px 0; color: #334155; }
  ul { margin: 4px 0 0 18px; padding: 0; }
  li { margin-bottom: 3px; }
</style></head>
<body>
  <h1>Research Summary${report.disease ? ` — ${escapeHtml(report.disease)}` : ""}</h1>
  <div class="meta">Drug Repurposing Platform · ${date}${researcherName ? ` · ${escapeHtml(researcherName)}` : ""}${report.target ? ` · Target: ${escapeHtml(report.target)}` : ""}</div>
  ${sectionsHtml}
</body></html>`);
  win.document.close();
  win.focus();
  // Let the page lay out before printing.
  win.setTimeout(() => win.print(), 250);
  return true;
};
