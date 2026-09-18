/**
 * Homepages for the curated databases TxKG cites in `supportingSources`.
 *
 * The API returns these as prose labels only — "CTD / MedGen curated
 * disease-gene associations", "IntAct curated protein interactions" — with no
 * URL and no per-record accession, so the Sources tab listed them as plain
 * text a reader could not follow up.
 *
 * Matching is on a keyword in the label rather than the whole string, because
 * one label can name several databases and the wording is not stable. A label
 * that matches nothing renders unlinked rather than guessing a destination.
 */
const SOURCE_LINKS = [
  { match: "ctd", name: "CTD", url: "https://ctdbase.org/" },
  { match: "medgen", name: "MedGen", url: "https://www.ncbi.nlm.nih.gov/medgen/" },
  { match: "intact", name: "IntAct", url: "https://www.ebi.ac.uk/intact/" },
  { match: "reactome", name: "Reactome", url: "https://reactome.org/" },
  { match: "kegg", name: "KEGG", url: "https://www.genome.jp/kegg/" },
  { match: "smpdb", name: "SMPDB", url: "https://smpdb.ca/" },
  { match: "uniprot", name: "UniProt", url: "https://www.uniprot.org/" },
  { match: "pubmed", name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/" },
  { match: "drugbank", name: "DrugBank", url: "https://go.drugbank.com/" },
  { match: "chembl", name: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/" },
  { match: "disgenet", name: "DisGeNET", url: "https://www.disgenet.org/" },
  { match: "omim", name: "OMIM", url: "https://www.omim.org/" },
  { match: "gene ontology", name: "Gene Ontology", url: "https://geneontology.org/" },
  { match: "biokg", name: "BioKG", url: "https://github.com/dsi-bdi/biokg" },
  { match: "string", name: "STRING", url: "https://string-db.org/" },
];

/**
 * Every database named in one source label, with a link each.
 *
 * @param {string} label - e.g. "CTD / MedGen curated disease-gene associations"
 * @returns {{name: string, url: string}[]} possibly empty
 */
export const linksForSource = (label) => {
  const text = String(label ?? "").toLowerCase();
  if (!text) return [];

  return SOURCE_LINKS.filter((entry) => text.includes(entry.match)).map(({ name, url }) => ({
    name,
    url,
  }));
};

/**
 * A UniProt entry page for one accession — used by the target rows, where the
 * API does give a specific record.
 */
export const uniprotUrl = (uniprotId) =>
  uniprotId ? `https://www.uniprot.org/uniprotkb/${uniprotId}/entry` : null;

/** A PubMed record from an article id like "art_20008195". */
export const pubmedUrl = (articleId) => {
  const pmid = String(articleId ?? "").replace(/^art_/, "");
  return /^\d+$/.test(pmid) ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null;
};

const sourceLinks = { linksForSource, uniprotUrl, pubmedUrl };

export default sourceLinks;
