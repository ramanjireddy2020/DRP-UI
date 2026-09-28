import {
  NODE_TYPE_STYLES,
  OTHER_NODE_STYLE,
  styleForType,
  normalizeNodeType,
  buildLegend,
  findHubId,
  normalizeGraph,
} from "./subgraphStyle";

/** The theme palette the subgraph must use, per node type. */
const PALETTE = {
  disease: "#F25966",
  "gene/protein": "#F28C33",
  pathway: "#149E99",
  biological_process: "#3B82F6",
  molecular_function: "#EAB308",
  cellular_component: "#A3A3A3",
  "drug/compound": "#8C4DBF",
  complex: "#A66BC4",
  genetic_disorder: "#D94F64",
  tissue: "#84B77A",
  cell: "#35B8D4",
};
const OTHER = "#64748B";

describe("styleForType — palette", () => {
  test.each(Object.entries(PALETTE))("%s → %s", (type, color) => {
    expect(styleForType(type).color).toBe(color);
    expect(normalizeNodeType(type)).toBe(type);
  });

  test("every styled type is in the palette, and nothing else", () => {
    expect(Object.fromEntries(NODE_TYPE_STYLES.map((s) => [s.key, s.color]))).toEqual(PALETTE);
    expect(OTHER_NODE_STYLE.color).toBe(OTHER);
  });
});

describe("styleForType — case and separator variants", () => {
  test.each([
    ["gene/protein", "gene/protein"],
    ["Gene/Protein", "gene/protein"],
    ["gene / protein", "gene/protein"],
    ["GENE_PROTEIN", "gene/protein"],
    ["gene", "gene/protein"],
    ["Protein", "gene/protein"],
    ["biological_process", "biological_process"],
    ["Biological Process", "biological_process"],
    ["biological-process", "biological_process"],
    ["BiologicalProcess", "biological_process"],
    ["Molecular Function", "molecular_function"],
    ["cellular-component", "cellular_component"],
    ["Drug", "drug/compound"],
    ["compound", "drug/compound"],
    ["Drug / Compound", "drug/compound"],
    ["Genetic Disorder", "genetic_disorder"],
    ["DISEASE", "disease"],
    ["disease hub", "disease"],
    ["Pathway", "pathway"],
    ["Complex", "complex"],
    ["Tissue", "tissue"],
    ["Cell", "cell"],
  ])("%s → %s", (input, key) => {
    expect(normalizeNodeType(input)).toBe(key);
    expect(styleForType(input).color).toBe(PALETTE[key]);
  });

  test("exact matching, not substrings: genetic_disorder is not a gene, cell is not cellular_component", () => {
    expect(normalizeNodeType("genetic_disorder")).toBe("genetic_disorder");
    expect(normalizeNodeType("cell")).toBe("cell");
    expect(normalizeNodeType("cellular_component")).toBe("cellular_component");
  });
});

describe("styleForType — unknown or missing type", () => {
  test.each([[undefined], [null], [""], ["   "], ["unknown"], ["phenotype"], ["genes and stuff"], [42]])(
    "%p → Other",
    (input) => {
      expect(normalizeNodeType(input)).toBe("other");
      expect(styleForType(input)).toBe(OTHER_NODE_STYLE);
      expect(styleForType(input).color).toBe(OTHER);
    }
  );
});

describe("legend and canvas use the same colours", () => {
  const graph = {
    nodes: [
      { id: "D", name: "Thrombocytosis", node_type: "disease" },
      { id: "O60674", name: "JAK2", node_type: "gene/protein" },
      { id: "P1", name: "STAT3", type: "Gene/Protein" },
      { id: "hsa04935", node_type: "pathway" },
      { id: "GO1", node_type: "Biological Process" },
      { id: "C1", node_type: "cell" },
      { id: "X1", node_type: "mystery" },
      { id: "X2" },
    ],
    edges: [],
  };

  test("one legend entry per type present, in the canvas colour", () => {
    const legend = buildLegend(graph);
    const { nodes } = normalizeGraph(graph);
    // Every drawn node's colour (what the canvas paints) is in the legend
    // under that node's label.
    nodes.forEach((node) => {
      const style = styleForType(node.type);
      expect(legend).toContainEqual({ label: style.label, color: style.color });
    });
    expect(legend.map((e) => e.label)).toEqual([
      "Disease",
      "Gene / Protein",
      "Pathway",
      "Biological process",
      "Cell",
      "Other",
    ]);
  });

  test("the API's colours are ignored", () => {
    const legend = buildLegend({
      nodes: [{ id: "a", type: "pathway", color: "#000000" }],
      legend: { pathway: "#123456" },
      color_legend: { pathway: "#654321" },
    });
    expect(legend).toEqual([{ label: "Pathway", color: PALETTE.pathway }]);
  });
});

describe("disease hub", () => {
  test("the disease node is the hub, whatever its case", () => {
    const nodes = [
      { id: "g", type: "gene/protein" },
      { id: "d", type: "Disease" },
    ];
    expect(findHubId(nodes, [{ source: "g", target: "x" }])).toBe("d");
  });

  test("a genetic disorder is not mistaken for the disease hub", () => {
    const nodes = [
      { id: "gd", type: "genetic_disorder" },
      { id: "g", type: "gene/protein" },
    ];
    const edges = [
      { source: "g", target: "gd" },
      { source: "g", target: "y" },
    ];
    // No disease node, so the most connected node is the hub.
    expect(findHubId(nodes, edges)).toBe("g");
  });
});

describe("comorbidity links are not shown", () => {
  const graph = {
    nodes: [
      { id: "D", type: "disease" },
      { id: "G", type: "gene/protein" },
      { id: "GD", type: "genetic_disorder" },
      { id: "LONE", type: "pathway" },
    ],
    edges: [
      { source: "D", target: "G", label: "Protein Disease Association" },
      { source: "D", target: "GD", label: "Comorbidity" },
    ],
  };

  test("comorbidity edges are dropped, with nodes only they connected", () => {
    const { nodes, edges } = normalizeGraph(graph);
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe("Protein Disease Association");
    expect(nodes.map((n) => n.id)).toEqual(["D", "G", "LONE"]);
  });

  test("matched on type / relation too, any case", () => {
    const { edges } = normalizeGraph({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b", type: "DISEASE_COMORBIDITY" }],
    });
    expect(edges).toHaveLength(0);
  });

  test("graphs without comorbidity are unchanged", () => {
    const g = { nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b", label: "x" }] };
    expect(normalizeGraph(g).nodes).toHaveLength(2);
    expect(normalizeGraph(g).edges).toHaveLength(1);
  });
});
