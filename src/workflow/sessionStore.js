/**
 * What a session needs to remember that the backend doesn't keep yet
 * (testing 2026-10-13). Stored in this browser only, so it survives a reload
 * or reopening from Recent Sessions on the same machine:
 *
 *  - the project a session belongs to: sessions don't store or return
 *    projectId (POST /sessions and PATCH /sessions/{id} ignore it);
 *  - CurateX's candidates job per CurateX step: POST
 *    /agents/curatex/compounds isn't recorded on the session;
 *  - the criteria a candidates job was scored without: its results still
 *    list every criterion;
 *  - which branches are finished: sessions have one status, not one per
 *    branch;
 *  - each branch's picks (targets, articles, compound, profile edits), so a
 *    reload doesn't fall back to another branch's;
 *  - NovSearch patent Q&A per NovSearch job: /agents/novsearch/ask doesn't
 *    store answers.
 *
 * Each can move to the backend later without changing the callers. Every
 * read and write is guarded: private windows or blocked storage just mean
 * nothing is remembered.
 */
import { getArtifacts } from "../services/api/sessions";
import { addProjectResult, getProjectItems } from "../services/api/projects";

const KEYS = {
  projects: "drp.sessionProjects",
  compounds: "drp.curatexCompoundsJobs",
  excludedCriteria: "drp.curatexExcludedCriteria",
  finishedBranches: "drp.finishedBranches",
  branchPicks: "drp.branchPicks",
  patentQa: "drp.patentQa",
};

const read = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: nothing is remembered, nothing breaks.
  }
};

const update = (key, id, value) => {
  if (!id) return;
  const all = read(key);
  if (value == null) delete all[id];
  else all[id] = value;
  write(key, all);
};

/* Session → project ------------------------------------------------------- */

/** → { projectId, projectName } or null */
export const getSessionProject = (sessionId) => (sessionId ? read(KEYS.projects)[sessionId] ?? null : null);

export const setSessionProject = (sessionId, project) =>
  update(KEYS.projects, sessionId, project?.projectId ? { projectId: project.projectId, projectName: project.projectName ?? null } : null);

/** Session ids this browser has linked to a project. */
export const sessionsLinkedTo = (projectId) =>
  Object.entries(read(KEYS.projects))
    .filter(([, link]) => link?.projectId === projectId)
    .map(([sessionId]) => sessionId);

/** Result types POST /projects/{id}/results accepts. */
const FILEABLE = new Set(["targets", "subgraph", "metapath", "litminex_results", "article"]);

/**
 * File a session's results into a project. The Project page lists project
 * items, and sessions can't be filed themselves (the endpoint takes results
 * only), so a session shows up there through its results. Results already
 * filed for this session are skipped: the endpoint doesn't de-duplicate.
 * → number of results added
 */
export const fileSessionResults = async (projectId, sessionId) => {
  if (!projectId || !sessionId) return 0;
  const [items, artifacts] = await Promise.all([getProjectItems(projectId), getArtifacts(sessionId)]);
  const filed = new Set(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.sessionId === sessionId)
      .map((item) => item.resultId)
  );
  let added = 0;
  for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
    const resultType = String(artifact?.resultType ?? "").toLowerCase();
    if (!artifact?.jobId || !FILEABLE.has(resultType) || filed.has(artifact.jobId)) continue;
    await addProjectResult(projectId, { sessionId, resultId: artifact.jobId, resultType });
    filed.add(artifact.jobId);
    added += 1;
  }
  return added;
};

/* CurateX candidates job per CurateX step ---------------------------------- */

/**
 * Stored with the profile job it was scored from: a Rerun keeps the step id
 * but builds a new profile, and the old candidates must not come back for
 * it. Entries saved before this are a bare job id and match any profile.
 */
export const getCompoundsJob = (stepId, profileJobId) => {
  const saved = stepId ? read(KEYS.compounds)[stepId] ?? null : null;
  if (!saved || typeof saved === "string") return saved;
  if (profileJobId && saved.profileJobId && saved.profileJobId !== profileJobId) return null;
  return saved.jobId ?? null;
};
export const setCompoundsJob = (stepId, jobId, profileJobId) =>
  update(KEYS.compounds, stepId, jobId ? { jobId, profileJobId: profileJobId || null } : null);

/** API criterion names a candidates job was scored without (removed or weight 0). */
export const getExcludedCriteria = (jobId) => (jobId ? read(KEYS.excludedCriteria)[jobId] ?? [] : []);
export const setExcludedCriteria = (jobId, names) =>
  update(KEYS.excludedCriteria, jobId, Array.isArray(names) && names.length ? names : null);

/* Finished branches per session --------------------------------------------- */

/** → { [branchKey]: "YYYY-MM-DD" } ("__main__" for Main). */
export const getFinishedBranches = (sessionId) => (sessionId ? read(KEYS.finishedBranches)[sessionId] ?? {} : {});
export const setBranchFinished = (sessionId, branchKey) => {
  if (!sessionId || !branchKey) return;
  update(KEYS.finishedBranches, sessionId, {
    ...getFinishedBranches(sessionId),
    [branchKey]: new Date().toISOString().slice(0, 10),
  });
};
/** A renamed branch keeps its finished date under the new name. */
export const renameFinishedBranch = (sessionId, fromKey, toKey) => {
  const finished = getFinishedBranches(sessionId);
  if (!sessionId || !fromKey || !toKey || !finished[fromKey]) return;
  const { [fromKey]: date, ...rest } = finished;
  update(KEYS.finishedBranches, sessionId, { ...rest, [toKey]: date });
};

/* Picks per branch, per session ---------------------------------------------- */

/** → { [branchKey]: { selectedTargets, selectedArticles, selectedCompound, profileData, selectedPatentIds, profileSeeded } } */
export const getBranchPicks = (sessionId) => (sessionId ? read(KEYS.branchPicks)[sessionId] ?? {} : {});
export const setBranchPicks = (sessionId, picks) => update(KEYS.branchPicks, sessionId, picks && Object.keys(picks).length ? picks : null);

/* NovSearch patent Q&A per NovSearch job ---------------------------------- */

export const getPatentThread = (jobId) => {
  const thread = jobId ? read(KEYS.patentQa)[jobId] : null;
  return Array.isArray(thread) ? thread : null;
};

/** Finished entries only; a question still waiting for its answer isn't kept. */
export const setPatentThread = (jobId, thread) =>
  update(
    KEYS.patentQa,
    jobId,
    Array.isArray(thread) && thread.length ? thread.filter((e) => !e.pending) : null
  );
