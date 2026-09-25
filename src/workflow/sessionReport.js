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

/**
 * @returns {{ disease, target, sections: { key, title, summary, items: string[] }[] }}
 */
export const buildSessionReport = ({ txkg, litminex, curatexTarget, curatex, docking, novelty }) => {
  const sections = [];

  if (txkg?.hasData) {
    sections.push({
      key: "txkg",
      title: "TxKG — Target identification",
      summary: `${txkg.count ?? txkg.targets.length} protein target${(txkg.count ?? txkg.targets.length) === 1 ? "" : "s"} found`,
      items: top(txkg.targets, 5).map(
        (t) => `${t.name}${t.fullName && t.fullName !== t.name ? ` (${t.fullName})` : ""} — score ${t.score}`
      ),
    });
  }

  if (litminex?.hasData) {
    sections.push({
      key: "litminex",
      title: "LitMineX — Literature mining",
      summary: `${litminex.total} article${litminex.total === 1 ? "" : "s"} retrieved`,
      items: top(litminex.articles, 5).map((a) => `${a.title}${a.year ? ` (${a.year})` : ""}`),
    });
  }

  if (curatex?.hasData || curatexTarget) {
    sections.push({
      key: "curatex",
      title: "CurateX — Drug curation",
      summary: curatex?.hasData
        ? `${curatex.total} candidate${curatex.total === 1 ? "" : "s"} scored${curatexTarget ? ` against the ${curatexTarget} ideal candidate profile` : ""}`
        : `Ideal candidate profile built${curatexTarget ? ` for ${curatexTarget}` : ""}; no candidates scored yet`,
      items: top(curatex?.compounds, 5).map((c) => `${c.name} — score ${c.score}`),
    });
  }

  if (docking?.hasData) {
    sections.push({
      key: "screensuite",
      title: "ScreenSuite — Docking",
      summary: `${docking.hits.length} docking hit${docking.hits.length === 1 ? "" : "s"}`,
      items: [...docking.hits]
        .sort((a, b) => (a.rawAffinity ?? 0) - (b.rawAffinity ?? 0))
        .slice(0, 5)
        .map((h) => `${h.ligand} vs ${h.protein} — ${h.affinity} kcal/mol`),
    });
  }

  if (novelty?.hasData) {
    const patents = [...(novelty.patents ?? [])]
      .filter((p) => Number.isFinite(p.rawRelevance))
      .sort((a, b) => b.rawRelevance - a.rawRelevance);
    sections.push({
      key: "novsearch",
      title: "NovSearch — Novelty search",
      summary: `${novelty.total} patent${novelty.total === 1 ? "" : "s"} analysed`,
      items: [
        ...(novelty.assessment ? [`Assessment: ${novelty.assessment}`] : []),
        ...top(patents, 3).map((p) => `${p.id} — ${p.title} — relevance ${p.relevance}`),
      ],
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
