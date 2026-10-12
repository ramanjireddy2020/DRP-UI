/**
 * ProLIF interactions → Mol*.
 *
 * The backend's ProLIF JSON is the single source of truth: nothing here
 * detects interactions, it only maps the reported atoms onto the complex
 * PDB that Mol* has loaded and draws what ProLIF found.
 *
 * Atom references arrive as { index, element, name }. Checked against a
 * live complex (JAK2 × midostaurin, 2026-10-13):
 *   - protein: `index` is the 0-based position among the PDB's ATOM records,
 *     and agrees with the interaction's chain, residue number and atom name;
 *   - ligand: `index` is the 0-based position among the ligand's HETATM
 *     records (residue LIG, chain L). Ligand atom names repeat ("C", "N"), so
 *     the index is the only reliable identifier.
 *
 * The pure helpers (parse, resolve, expressions) carry no Mol* dependency so
 * they can be tested on their own; drawInteractions talks to the viewer.
 */

const WATER = new Set(["HOH", "WAT", "DOD", "H2O"]);
const LIGAND_NAMES = ["LIG", "UNL", "UNK", "MOL", "DRG", "INH"];

/** Colour per known ProLIF type; anything else gets a stable colour from its key. */
const TYPE_COLORS = {
  hydrogen_bonds: 0x2563eb,
  hydrophobic: 0xd97706,
  pi_stacking: 0x7c3aed,
  pi_cation: 0x0d9488,
  cation_pi: 0x0d9488,
  salt_bridges: 0xdc2626,
  halogen_bonds: 0x16a34a,
  metal: 0x6b7280,
  vdw_contacts: 0x94a3b8,
};
const SPARE_COLORS = [0xdb2777, 0x0891b2, 0x65a30d, 0xea580c, 0x4f46e5, 0x9333ea];

export const colorForType = (key) => {
  if (TYPE_COLORS[key] != null) return TYPE_COLORS[key];
  let hash = 0;
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SPARE_COLORS[hash % SPARE_COLORS.length];
};

export const cssColor = (value) => `#${value.toString(16).padStart(6, "0")}`;

/**
 * ATOM and HETATM records of the first model, in file order.
 * → { protein: [atom], hetero: [atom] }, atom = { serial, name, resName,
 *    chain, resSeq, iCode, element }
 */
export const parsePdbAtoms = (text) => {
  const protein = [];
  const hetero = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (line.startsWith("ENDMDL")) break;
    const record = line.slice(0, 6);
    if (record !== "ATOM  " && record !== "HETATM") continue;
    const atom = {
      serial: Number(line.slice(6, 11)),
      name: line.slice(12, 16).trim(),
      resName: line.slice(17, 20).trim(),
      chain: line.slice(21, 22).trim(),
      resSeq: Number(line.slice(22, 26)),
      iCode: line.slice(26, 27).trim(),
      element: line.slice(76, 78).trim(),
    };
    (record === "ATOM  " ? protein : hetero).push(atom);
  }
  return { protein, hetero };
};

/** The docked ligand's atoms, in file order: the HETATM residue ProLIF profiled. */
const ligandAtomsFor = (hetero, hint) => {
  const groups = new Map();
  hetero.forEach((a) => {
    if (WATER.has(a.resName)) return;
    const key = `${a.chain}|${a.resName}|${a.resSeq}|${a.iCode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  });
  const all = [...groups.values()];
  if (hint) {
    const match = all.find(
      ([a]) =>
        (!hint.chain || a.chain === hint.chain) &&
        (!hint.residueName || a.resName === hint.residueName) &&
        (hint.residueNumber == null || a.resSeq === Number(hint.residueNumber))
    );
    if (match) return match;
  }
  return (
    all.find(([a]) => LIGAND_NAMES.includes(a.resName)) ??
    all.sort((x, y) => y.length - x.length)[0] ??
    []
  );
};

const sameText = (a, b) => String(a ?? "").toUpperCase() === String(b ?? "").toUpperCase();

/**
 * Map one interaction onto the structure.
 * → { protein: [atom], ligand: [atom], problems: [string] }
 * A side with no mappable atom is reported in `problems`.
 */
export const resolveInteraction = (interaction, atoms) => {
  const problems = [];
  const protein = [];
  (interaction.proteinAtoms ?? []).forEach((ref) => {
    const byIndex = ref.index != null ? atoms.protein[ref.index] : null;
    const fits = (a) =>
      a &&
      (!interaction.chain || a.chain === interaction.chain) &&
      (interaction.residueNumber == null || a.resSeq === Number(interaction.residueNumber)) &&
      (!ref.name || sameText(a.name, ref.name));
    if (fits(byIndex)) {
      protein.push(byIndex);
      return;
    }
    // The index didn't agree with the residue: look the atom up by its ids.
    const byIds = ref.name
      ? atoms.protein.find(
          (a) =>
            a.chain === (interaction.chain ?? a.chain) &&
            a.resSeq === Number(interaction.residueNumber) &&
            sameText(a.name, ref.name)
        )
      : null;
    if (byIds) protein.push(byIds);
    else problems.push(`protein atom ${ref.name ?? ""}#${ref.index ?? "?"} not found in ${interaction.residue ?? "the receptor"}`);
  });

  const ligandAtoms = ligandAtomsFor(atoms.hetero, interaction.ligand);
  const ligand = [];
  (interaction.ligandAtoms ?? []).forEach((ref) => {
    const atom = ref.index != null ? ligandAtoms[ref.index] : null;
    if (atom && (!ref.element || sameText(atom.element, ref.element))) ligand.push(atom);
    else problems.push(`ligand atom ${ref.element ?? ref.name ?? ""}#${ref.index ?? "?"} not found`);
  });

  if (!protein.length) problems.push("no protein atom could be mapped");
  if (!ligand.length) problems.push("no ligand atom could be mapped");
  return { protein, ligand, problems };
};

const resi = (atom) => {
  const n = atom.resSeq < 0 ? `\\${atom.resSeq}` : String(atom.resSeq);
  return `${n}${atom.iCode ?? ""}`;
};

/**
 * PyMOL-syntax selection for a set of atoms: protein atoms by chain, residue
 * and atom name; ligand atoms by chain, residue and serial id (their names
 * repeat).
 */
export const selectionFor = (list, { byId = false } = {}) => {
  const groups = new Map();
  list.forEach((a) => {
    const key = `${a.chain}|${resi(a)}`;
    if (!groups.has(key)) groups.set(key, { chain: a.chain, resi: resi(a), atoms: [] });
    groups.get(key).atoms.push(byId ? String(a.serial) : a.name);
  });
  return [...groups.values()]
    .map((g) =>
      [g.chain ? `chain ${g.chain}` : null, `resi ${g.resi}`, `${byId ? "id" : "name"} ${[...new Set(g.atoms)].join("+")}`]
        .filter(Boolean)
        .join(" and ")
    )
    .map((s) => `(${s})`)
    .join(" or ");
};

/** Whole residues taking part, for the ball-and-stick layer. */
const residuesSelection = (resolved) => {
  const seen = new Map();
  resolved.forEach(({ protein }) =>
    protein.forEach((a) => seen.set(`${a.chain}|${resi(a)}`, a))
  );
  return [...seen.values()]
    .map((a) => `(${[a.chain ? `chain ${a.chain}` : null, `resi ${resi(a)}`].filter(Boolean).join(" and ")})`)
    .join(" or ");
};

/**
 * Draw every mappable interaction in a loaded Mol* viewer:
 *   - the interacting residues as ball-and-stick;
 *   - one dashed distance line per interaction, coloured by type.
 * Unmappable interactions are skipped with a console warning; the rest still
 * draw. → { mapped: Map(id → { protein, ligand, color }), skipped: [id] }
 */
export const drawInteractions = async (viewer, pdbText, interactions) => {
  const mapped = new Map();
  const skipped = [];
  const plugin = viewer?.plugin;
  const structure = plugin?.managers.structure.hierarchy.current.structures[0];
  const transformer = structure?.components[0]?.cell.transform.transformer;
  if (!structure || !transformer || !interactions?.length) return { mapped, skipped };

  const parent = structure.cell.obj?.data;
  const selection = plugin.managers.structure.selection;
  const atoms = parsePdbAtoms(pdbText);

  const component = async (expression, label) => {
    const update = plugin.build().to(structure.cell).apply(transformer, {
      type: { name: "script", params: { language: "pymol", expression } },
      nullIfEmpty: true,
      label,
    });
    await update.commit();
    return update.ref;
  };
  // Atom-level loci on the whole structure, via the selection manager (the
  // CDN build doesn't expose Mol*'s own loci helpers).
  const lociOf = (ref) => {
    const sub = plugin.state.data.cells.get(ref)?.obj?.data;
    if (!sub) return null;
    // `false`: no granularity, or the atoms widen to whole residues (and the
    // distance would be measured between residue and ligand centres).
    selection.fromLoci("set", { kind: "structure-loci", structure: sub }, false);
    const loci = selection.getLoci(parent);
    selection.clear();
    return loci?.kind === "element-loci" && loci.elements?.length ? loci : null;
  };
  const remove = async (refs) => {
    const update = plugin.build();
    refs.filter(Boolean).forEach((ref) => update.delete(ref));
    await update.commit();
  };

  const resolved = [];
  interactions.forEach((interaction) => {
    const r = resolveInteraction(interaction, atoms);
    if (r.problems.length && (!r.protein.length || !r.ligand.length)) {
      skipped.push(interaction.id);
      console.warn(
        `[Mol*] ProLIF interaction ${interaction.id} (${interaction.type} ${interaction.residue ?? ""}) not drawn: ${r.problems.join("; ")}`
      );
      return;
    }
    if (r.problems.length) {
      console.warn(`[Mol*] ProLIF interaction ${interaction.id}: ${r.problems.join("; ")} (drawn with the atoms that were found)`);
    }
    resolved.push({ interaction, ...r });
  });
  if (!resolved.length) return { mapped, skipped };

  // Interacting residues, so the contacts are visible inside the cartoon.
  try {
    const residuesRef = await component(residuesSelection(resolved), "Interacting residues");
    const cell = plugin.state.data.cells.get(residuesRef);
    if (cell?.obj) {
      await plugin.builders.structure.representation.addRepresentation(cell, {
        type: "ball-and-stick",
        color: "element-symbol",
        typeParams: { sizeFactor: 0.25 },
      });
    }
  } catch (err) {
    console.warn("[Mol*] Could not draw the interacting residues:", err);
  }

  for (const { interaction, protein, ligand } of resolved) {
    let refs = [];
    try {
      refs = [
        await component(selectionFor(protein), `${interaction.id} protein`),
        await component(selectionFor(ligand, { byId: true }), `${interaction.id} ligand`),
      ];
      const proteinLoci = lociOf(refs[0]);
      const ligandLoci = lociOf(refs[1]);
      if (!proteinLoci || !ligandLoci) {
        skipped.push(interaction.id);
        console.warn(`[Mol*] ProLIF interaction ${interaction.id}: atoms not found in the loaded structure`);
        continue;
      }
      const color = colorForType(interaction.key);
      try {
        await plugin.managers.structure.measurement.addDistance(proteinLoci, ligandLoci, {
          // Small, faint labels: a pose can have a dozen or more contacts.
          visualParams: { linesColor: color, textColor: color, linesSize: 0.06, dashLength: 0.18, textSize: 0.4, backgroundOpacity: 0.25 },
        });
      } catch (err) {
        // The line is a nicety; selecting the interaction still works.
        console.warn(`[Mol*] ProLIF interaction ${interaction.id}: distance line not drawn`, err);
      }
      mapped.set(interaction.id, { protein: proteinLoci, ligand: ligandLoci, color });
    } catch (err) {
      skipped.push(interaction.id);
      console.warn(`[Mol*] ProLIF interaction ${interaction.id} not drawn:`, err);
    } finally {
      await remove(refs).catch(() => {});
    }
  }
  return { mapped, skipped };
};

/** Select both partners of one interaction and bring them into view. */
export const showInteraction = (viewer, entry) => {
  const plugin = viewer?.plugin;
  if (!plugin) return;
  const selects = plugin.managers.interactivity.lociSelects;
  if (!entry) {
    selects.deselectAll();
    return;
  }
  // The protein side as its whole residue (granularity applies); the ligand
  // side as exactly the atoms ProLIF named.
  selects.selectOnly({ loci: entry.protein });
  selects.select({ loci: entry.ligand }, false);
  try {
    plugin.managers.camera.focusLoci([entry.protein, entry.ligand]);
  } catch {
    plugin.managers.camera.focusLoci(entry.protein);
  }
};
