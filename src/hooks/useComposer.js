import { useCallback, useEffect, useState } from "react";
import { saveDraft, patchDraft } from "../services/api/sessions";
import { listProjects, readProjectList } from "../services/api/projects";
import { getModules } from "../services/api/modules";
import { uploadFile } from "../services/api/files";

const DRAFT_DEBOUNCE_MS = 800;
const SEARCH_DEBOUNCE_MS = 300;

const errorText = (err, fallback) => err?.userMessage || err?.message || fallback;

/**
 * State and API wiring shared by the two research composers (HomePage and
 * NewResearchPage): query + module + project + attached files, the draft
 * autosave, and the project / module pickers.
 *
 * buildWorkflowState() returns the router state the workflow expects for a
 * new research run: { query, module, projectId, fileIds }.
 */
const useComposer = () => {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState(null);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [draftError, setDraftError] = useState(null);

  /* Project picker ------------------------------------------------------- */
  const [projectSearch, setProjectSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [projectsKey, setProjectsKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const params = { page: 1 };
        if (projectSearch.trim()) params.search = projectSearch.trim();
        const { items } = readProjectList(await listProjects(params));
        if (active) setProjects(items);
      } catch (err) {
        if (active) setProjectsError(errorText(err, "Failed to load projects"));
      } finally {
        if (active) setProjectsLoading(false);
      }
    }, projectSearch ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [projectSearch, projectsKey]);

  const reloadProjects = useCallback(() => setProjectsKey((k) => k + 1), []);

  /* Module picker -------------------------------------------------------- */
  const [modules, setModules] = useState([]);
  const [modulesError, setModulesError] = useState(null);

  useEffect(() => {
    let active = true;
    getModules()
      .then((data) => {
        if (active) setModules(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setModulesError(errorText(err, "Failed to load modules"));
      });
    return () => {
      active = false;
    };
  }, []);

  /* Draft autosave -------------------------------------------------------- */
  useEffect(() => {
    const text = query.trim();
    if (!text) return undefined;
    const timer = setTimeout(async () => {
      try {
        await saveDraft({ query: text, module: module || null });
        setDraftError(null);
      } catch (err) {
        setDraftError(errorText(err, "Draft not saved"));
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, module]);

  const selectProject = useCallback(async (next) => {
    setProject(next);
    if (!next?.id) return;
    try {
      await patchDraft({ projectId: next.id });
      setDraftError(null);
    } catch (err) {
      setDraftError(errorText(err, "Draft not saved"));
    }
  }, []);

  /* Uploads -------------------------------------------------------------- */
  const addFiles = useCallback(async (fileList) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    setUploading(true);
    setUploadError(null);
    for (const file of picked) {
      try {
        const res = await uploadFile(file);
        if (!res?.fileId) throw new Error(`Upload of ${file.name} returned no fileId`);
        setFiles((prev) => [
          ...prev,
          { fileId: res.fileId, fileName: res.fileName || file.name, sizeBytes: res.sizeBytes },
        ]);
      } catch (err) {
        setUploadError(errorText(err, `Failed to upload ${file.name}`));
      }
    }
    setUploading(false);
  }, []);

  const removeFile = useCallback(
    (fileId) => setFiles((prev) => prev.filter((f) => f.fileId !== fileId)),
    []
  );

  /* Hand-off ------------------------------------------------------------- */
  const buildWorkflowState = () => ({
    query: query.trim(),
    module: module || null,
    projectId: project?.id || null,
    fileIds: files.map((f) => f.fileId),
  });

  return {
    query,
    setQuery,
    module,
    setModule,
    modules,
    modulesError,
    project,
    selectProject,
    clearProject: () => setProject(null),
    projectSearch,
    setProjectSearch,
    projects,
    projectsLoading,
    projectsError,
    reloadProjects,
    files,
    addFiles,
    removeFile,
    uploading,
    uploadError,
    draftError,
    buildWorkflowState,
  };
};

export default useComposer;
