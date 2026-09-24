import { useCallback, useMemo, useReducer, useRef } from "react";
import {
  createSession as createSessionRequest,
  getSession as getSessionRequest,
  createStep as createStepRequest,
  rerunStep as rerunStepRequest,
  postMessage as postMessageRequest,
  patchSession as patchSessionRequest,
} from "../services/api/sessions";
import {
  MODULES,
  ALL_MODULES,
  MODULE_BY_KEY,
  apiModuleKey,
  parseSupervisorModule,
  parseSessionId,
  parseJobId,
  parseStepId,
  parseStepResponse,
  parseMessageResponse,
  moduleForPhase,
} from "../workflow/moduleMap";

/**
 * Workflow session state.
 *
 * Three requirements drive this shape:
 *
 *  1. The supervisor decides which module runs. Nothing here assumes TxKG —
 *     activation always comes from a module key resolved out of an API
 *     response, and modules may activate out of pipeline order.
 *
 *  2. Nothing is ever lost when the workflow moves on. Each module keeps its
 *     own phase, job, step id, error and data; the conversation is a single
 *     append-only thread whose entries are tagged with the module they belong
 *     to. Navigating back to an earlier step changes which slice is *shown*,
 *     never what is stored.
 *
 *  3. Routing is the backend's decision, not the UI's. Hand-offs go through
 *     POST /sessions/{id}/steps and chat goes through
 *     POST /sessions/{id}/messages; the module that becomes active afterwards
 *     is read out of the response. The UI never infers a module from the text
 *     the user typed.
 */

const buildInitialSteps = () =>
  ALL_MODULES.reduce((acc, m) => {
    acc[m.key] = {
      key: m.key,
      index: m.index,
      label: m.label,
      visited: false,
      phase: null,
      jobId: null,
      stepId: null,
      error: null,
      data: {},
    };
    return acc;
  }, {});

const initialState = {
  sessionId: null,
  status: "idle", // idle | creating | ready | error
  error: null,
  /** The session's own title and status as the server reports them. */
  title: null,
  sessionStatus: null,
  /** Raw supervisor payload, kept for debugging an unresolved module. */
  lastSupervisorResponse: null,
  /** The module key the user is currently looking at. */
  activeKey: null,
  /** Per-module state. Never pruned. */
  steps: buildInitialSteps(),
  /** Order in which the supervisor activated modules. */
  activationOrder: [],
  /**
   * Append-only conversation. Each entry carries the module it belongs to, so
   * the thread can be sliced per step without ever dropping a message.
   */
  conversation: [],
  seq: 0,
  /** A message or hand-off is in flight — disables the composer. */
  pending: false,
};

const withStep = (state, key, patch) => ({
  ...state,
  steps: {
    ...state.steps,
    [key]: { ...state.steps[key], ...patch },
  },
});

function reducer(state, action) {
  switch (action.type) {
    case "SESSION_CREATING":
      return { ...state, status: "creating", error: null };

    case "SESSION_FAILED":
      return { ...state, status: "error", error: action.error };

    case "SESSION_READY": {
      const { sessionId, raw } = action;
      return {
        ...state,
        sessionId: sessionId ?? state.sessionId,
        status: "ready",
        error: null,
        lastSupervisorResponse: raw ?? state.lastSupervisorResponse,
        title: raw?.title ?? state.title,
        sessionStatus: raw?.status ?? state.sessionStatus,
      };
    }

    /** PATCH /sessions/{id} answered — keep its title/status. */
    case "SESSION_PATCHED":
      return {
        ...state,
        title: action.raw?.title ?? state.title,
        sessionStatus: action.raw?.status ?? state.sessionStatus,
      };

    /**
     * Fold a re-fetched GET /sessions/{id} into local state after a job
     * finishes.
     *
     * - Step ids and summaries come from the server's step list. The step that
     *   carries the module's current jobId wins, so a chat or rerun addresses
     *   the step the server actually recorded for that run (this is what
     *   resolves the @Module stepId uncertainty on POST /messages).
     * - The server's messages[] are merged, not replaced: anything already in
     *   the thread (the user's own turns, chat replies) is matched by role and
     *   text and skipped, so only the agent's write-ups that were never shown
     *   are appended — each under the module its step belongs to.
     */
    case "MERGE_SERVER_SESSION": {
      const { raw } = action;
      if (!raw || typeof raw !== "object") return state;

      let next = {
        ...state,
        title: raw.title ?? state.title,
        sessionStatus: raw.status ?? state.sessionStatus,
      };

      const serverSteps = Array.isArray(raw.steps) ? raw.steps : [];
      const byModule = {};
      serverSteps.forEach((step) => {
        const parsed = parseStepResponse(step);
        if (!parsed.moduleKey) return;
        (byModule[parsed.moduleKey] = byModule[parsed.moduleKey] || []).push({ step, parsed });
      });

      Object.entries(byModule).forEach(([key, list]) => {
        const local = next.steps[key];
        if (!local || !local.visited) return;

        const match =
          list.find((entry) => entry.parsed.jobId && entry.parsed.jobId === local.jobId) ??
          // No local job to match on: fall back to the latest step for the module.
          (local.jobId ? null : list[list.length - 1]);
        if (!match) return;

        const patch = {};
        if (match.parsed.stepId) patch.stepId = match.parsed.stepId;
        if (match.step?.summary) {
          patch.data = { ...local.data, summary: match.step.summary };
        }
        next = withStep(next, key, patch);
      });

      const serverMessages = Array.isArray(raw.messages) ? raw.messages : [];
      if (serverMessages.length) {
        const signature = (role, text) =>
          `${String(role || "").toLowerCase()}|${String(text ?? "").trim()}`;

        // Multiset of what is already on screen, so a question asked twice is
        // matched twice rather than collapsing into one.
        const onScreen = new Map();
        next.conversation.forEach((m) => {
          if (m.isError) return;
          const k = signature(m.role, m.text);
          onScreen.set(k, (onScreen.get(k) || 0) + 1);
        });

        const additions = [];
        serverMessages.forEach((m) => {
          if (!m?.content) return;
          const k = signature(m.role, m.content);
          const seen = onScreen.get(k) || 0;
          if (seen > 0) {
            onScreen.set(k, seen - 1);
            return;
          }
          const owner = serverSteps.find((s) => s.id === m.stepId);
          const key = owner ? parseStepResponse(owner).moduleKey : null;
          additions.push({
            role: m.role,
            text: m.content,
            agentName: m.agentName || null,
            stepId: m.stepId || null,
            moduleKey: key,
            stepIndex: key ? MODULE_BY_KEY[key]?.index ?? null : null,
          });
        });

        if (additions.length) {
          const stamped = additions.map((message, offset) => ({
            id: `m${next.seq + offset + 1}`,
            at: Date.now(),
            ...message,
          }));
          next = {
            ...next,
            conversation: [...next.conversation, ...stamped],
            seq: next.seq + stamped.length,
          };
        }
      }

      return next;
    }

    /**
     * Activate a module. This is the ONLY way a module becomes current, and it
     * is always driven by a resolved module key — never by an index guess.
     */
    case "ACTIVATE_MODULE": {
      const { key, phase, jobId, stepId } = action;
      const module = MODULE_BY_KEY[key];
      if (!module) return state;

      const existing = state.steps[key];

      const next = withStep(state, key, {
        visited: true,
        phase: phase ?? existing.phase ?? module.loadingPhase,
        // Only overwrite ids when new ones are supplied, so re-activating a
        // step the user navigated back to does not wipe its job.
        jobId: jobId !== undefined ? jobId : existing.jobId,
        stepId: stepId !== undefined ? stepId : existing.stepId,
        // A fresh job supersedes whatever went wrong last time.
        error: jobId !== undefined && jobId !== existing.jobId ? null : existing.error,
      });

      return {
        ...next,
        activeKey: key,
        activationOrder: state.activationOrder.includes(key)
          ? state.activationOrder
          : [...state.activationOrder, key],
      };
    }

    /**
     * Look at a module the user has already visited. Purely a view change —
     * no step state is touched.
     */
    case "GO_TO_MODULE": {
      const { key } = action;
      if (!state.steps[key]?.visited) return state;
      return { ...state, activeKey: key };
    }

    /** Set the phase of a specific module (defaults to the active one). */
    case "SET_PHASE": {
      const key = action.key ?? state.activeKey;
      if (!key || !state.steps[key]) return state;
      return withStep(state, key, { phase: action.phase });
    }

    /** Merge result data into a module without disturbing anything else. */
    case "SET_STEP_DATA": {
      const key = action.key ?? state.activeKey;
      if (!key || !state.steps[key]) return state;
      return withStep(state, key, {
        data: { ...state.steps[key].data, ...action.data },
      });
    }

    case "SET_STEP_JOB": {
      const key = action.key ?? state.activeKey;
      if (!key || !state.steps[key]) return state;
      return withStep(state, key, {
        jobId: action.jobId,
        error: null,
        ...(action.stepId !== undefined ? { stepId: action.stepId } : {}),
      });
    }

    /**
     * A step failed. Moves it to its own -error phase and records why, so the
     * screen can show the backend's reason and a retry instead of spinning.
     */
    case "SET_STEP_ERROR": {
      const key = action.key ?? state.activeKey;
      if (!key || !state.steps[key]) return state;
      const module = MODULE_BY_KEY[key];
      return withStep(state, key, {
        error: action.error,
        phase: module?.errorPhase ?? state.steps[key].phase,
      });
    }

    case "CLEAR_STEP_ERROR": {
      const key = action.key ?? state.activeKey;
      if (!key || !state.steps[key]) return state;
      return withStep(state, key, { error: null });
    }

    /** Append to the thread. Never replaces, never truncates. */
    case "APPEND_MESSAGES": {
      const key = action.key ?? state.activeKey;
      const module = MODULE_BY_KEY[key];
      // Said while the module's card was already on screen, i.e. typed in the
      // chat box underneath it. The timeline draws these AFTER the card; see
      // timelineBlocks in CompleteWorkflow.
      const afterCard = Boolean(key && state.steps[key]?.visited);
      const stamped = action.messages.map((message, offset) => ({
        id: `m${state.seq + offset + 1}`,
        moduleKey: key ?? null,
        stepIndex: module ? module.index : null,
        at: Date.now(),
        afterCard,
        ...message,
      }));

      return {
        ...state,
        conversation: [...state.conversation, ...stamped],
        seq: state.seq + stamped.length,
      };
    }

    /**
     * Replace the whole thread — used when reopening a session, where the
     * server's message list is the truth and the local one is empty.
     */
    case "REPLACE_CONVERSATION": {
      const stamped = action.messages.map((message, offset) => ({
        id: `m${offset + 1}`,
        at: Date.now(),
        ...message,
      }));
      return { ...state, conversation: stamped, seq: stamped.length };
    }

    case "SET_PENDING":
      return { ...state, pending: action.pending };

    case "RESET":
      return { ...initialState, steps: buildInitialSteps() };

    default:
      return state;
  }
}

const useWorkflowSession = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * The session id, readable synchronously.
   *
   * `state.sessionId` is a render away from being set, so a hand-off fired from
   * the same tick as session creation would read null. The ref is written at
   * the same moment as the dispatch.
   */
  const sessionIdRef = useRef(null);

  const activeStepState = state.activeKey ? state.steps[state.activeKey] : null;
  const activeModule = state.activeKey ? MODULE_BY_KEY[state.activeKey] : null;

  /**
   * Requirement 1: ask the supervisor, then activate whatever module it names.
   *
   * On an unresolvable module we surface an error with the raw payload rather
   * than quietly starting TxKG — a silently wrong module is the exact failure
   * this is meant to prevent.
   */
  const startSession = useCallback(async (payload) => {
    dispatch({ type: "SESSION_CREATING" });

    let raw;
    try {
      raw = await createSessionRequest(payload);
    } catch (err) {
      dispatch({
        type: "SESSION_FAILED",
        error: err?.userMessage || err?.message || "Could not start the session.",
      });
      return null;
    }

    const sessionId = parseSessionId(raw);
    const moduleKey = parseSupervisorModule(raw);

    sessionIdRef.current = sessionId;
    dispatch({ type: "SESSION_READY", sessionId, raw });

    // The supervisor echoes the user's query back as the first message; keeping
    // the server's copy rather than adding our own means the thread matches
    // what a later GET /sessions/{id} would return.
    if (Array.isArray(raw?.messages) && raw.messages.length) {
      dispatch({
        type: "REPLACE_CONVERSATION",
        messages: raw.messages.map((m) => ({
          role: m.role,
          text: m.content,
          agentName: m.agentName || null,
          stepId: m.stepId || null,
          moduleKey: moduleKey ?? null,
          stepIndex: moduleKey ? MODULE_BY_KEY[moduleKey]?.index ?? null : null,
        })),
      });
    }

    if (!moduleKey) {
      dispatch({
        type: "SESSION_FAILED",
        error:
          "The supervisor did not return a module this UI recognises. " +
          "Add its spelling to ALIASES in src/workflow/moduleMap.js. " +
          `Response keys: ${raw ? Object.keys(raw).join(", ") : "none"}`,
      });
      return null;
    }

    dispatch({
      type: "ACTIVATE_MODULE",
      key: moduleKey,
      phase: MODULE_BY_KEY[moduleKey].loadingPhase,
      jobId: parseJobId(raw),
      stepId: parseStepId(raw),
    });

    return { sessionId, moduleKey, raw };
  }, []);

  /**
   * Reopen an existing session. Rebuilds per-step state from the server's
   * `steps` array so a resumed session lands on the right screen.
   *
   * Sessions live in SQLite on /tmp on this deployment and are lost when the
   * app restarts, so a 404 here is expected rather than exceptional.
   */
  const resumeSession = useCallback(async (sessionId) => {
    dispatch({ type: "SESSION_CREATING" });

    let raw;
    try {
      raw = await getSessionRequest(sessionId);
    } catch (err) {
      dispatch({
        type: "SESSION_FAILED",
        error:
          err?.status === 404
            ? "That session is no longer on the server. Sessions are held in " +
              "temporary storage and are cleared when the backend restarts."
            : err?.userMessage || err?.message || "Could not reopen the session.",
      });
      return null;
    }

    sessionIdRef.current = parseSessionId(raw) ?? sessionId;
    dispatch({ type: "SESSION_READY", sessionId: sessionIdRef.current, raw });

    const steps = Array.isArray(raw?.steps) ? raw.steps : [];

    // Replay the steps in order so activationOrder and each step's own job,
    // phase and status are restored rather than guessed.
    steps.forEach((step) => {
      const parsed = parseStepResponse(step);
      if (!parsed.moduleKey) return;

      const module = MODULE_BY_KEY[parsed.moduleKey];
      const status = String(step?.status ?? "").toLowerCase();

      const phase =
        status === "completed"
          ? module.resultsPhase
          : status === "failed"
          ? module.errorPhase
          : module.loadingPhase;

      dispatch({
        type: "ACTIVATE_MODULE",
        key: parsed.moduleKey,
        phase,
        jobId: parsed.jobId,
        stepId: parsed.stepId,
      });

      if (step?.summary) {
        dispatch({
          type: "SET_STEP_DATA",
          key: parsed.moduleKey,
          data: { summary: step.summary, selections: step.selections ?? {} },
        });
      }
    });

    if (Array.isArray(raw?.messages)) {
      dispatch({
        type: "REPLACE_CONVERSATION",
        messages: raw.messages.map((m) => {
          const owner = steps.find((s) => s.id === m.stepId);
          const key = owner ? parseStepResponse(owner).moduleKey : null;
          return {
            role: m.role,
            text: m.content,
            agentName: m.agentName || null,
            stepId: m.stepId || null,
            moduleKey: key,
            stepIndex: key ? MODULE_BY_KEY[key]?.index ?? null : null,
          };
        }),
      });
    }

    return { sessionId: sessionIdRef.current, raw };
  }, []);

  /**
   * Re-read GET /sessions/{id} and merge it in. Called after each job
   * completes, which is when the backend has written the agent's message and
   * the step summary. A failure here is not worth an error screen — the
   * results themselves are already on the page — so it resolves to null.
   */
  const refreshSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return null;
    try {
      const raw = await getSessionRequest(sessionId);
      dispatch({ type: "MERGE_SERVER_SESSION", raw });
      return raw;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[session] could not re-read the session", err);
      return null;
    }
  }, []);

  /**
   * PATCH /sessions/{id} — rename, or mark Saved ("End Task"). Throws on
   * failure so the caller can show the reason.
   */
  const updateSession = useCallback(async (payload) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) throw new Error("There is no session to save.");
    const raw = await patchSessionRequest(sessionId, payload);
    dispatch({ type: "SESSION_PATCHED", raw: { ...payload, ...(raw || {}) } });
    return raw;
  }, []);

  /** Activate a module directly. */
  const activateModule = useCallback((key, opts = {}) => {
    dispatch({ type: "ACTIVATE_MODULE", key, ...opts });
  }, []);

  /** Requirement 2: navigate to an already-visited step without losing state. */
  const goToModule = useCallback((key) => {
    dispatch({ type: "GO_TO_MODULE", key });
  }, []);

  const goToIndex = useCallback((index) => {
    const module = MODULES.find((m) => m.index === index);
    if (module) dispatch({ type: "GO_TO_MODULE", key: module.key });
  }, []);

  const setPhase = useCallback((phase, key) => {
    dispatch({ type: "SET_PHASE", phase, key });
  }, []);

  const setStepData = useCallback((data, key) => {
    dispatch({ type: "SET_STEP_DATA", data, key });
  }, []);

  const setStepJob = useCallback((jobId, stepId, key) => {
    dispatch({ type: "SET_STEP_JOB", jobId, stepId, key });
  }, []);

  const setStepError = useCallback((error, key) => {
    dispatch({ type: "SET_STEP_ERROR", error, key });
  }, []);

  const appendMessages = useCallback((messages, key) => {
    const list = Array.isArray(messages) ? messages : [messages];
    if (!list.length) return;
    dispatch({ type: "APPEND_MESSAGES", messages: list, key });
  }, []);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  /**
   * Requirement 3, part one: hand the session to the next module.
   *
   * POST /sessions/{id}/steps carries the researcher's picks; build_params() on
   * the backend turns them into the next agent's parameters. The module that
   * becomes active is read back out of the response, so if the backend routes
   * somewhere other than where the button pointed, the UI follows the backend.
   *
   * @param {string} moduleKey  - internal key; translated to the API spelling
   * @param {object} selections - shaped by buildSelections() in selections.js
   * @param {string|null} fromStepId - set to an earlier step to branch
   */
  const handOff = useCallback(
    async (moduleKey, selections = {}, fromStepId = null) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        dispatch({
          type: "SET_STEP_ERROR",
          key: moduleKey,
          error: "There is no session to add a step to. Start a new research query.",
        });
        return null;
      }

      const module = apiModuleKey(moduleKey);
      if (!module) {
        dispatch({
          type: "SET_STEP_ERROR",
          key: moduleKey,
          error: `"${moduleKey}" is not a module this UI can hand off to.`,
        });
        return null;
      }

      // Show the target module's loading screen straight away — the POST plus
      // the first poll is long enough that an unchanged screen reads as a dead
      // button.
      dispatch({
        type: "ACTIVATE_MODULE",
        key: moduleKey,
        phase: MODULE_BY_KEY[moduleKey].loadingPhase,
      });
      dispatch({ type: "SET_PENDING", pending: true });

      let raw;
      try {
        raw = await createStepRequest(sessionId, { module, selections, fromStepId });
      } catch (err) {
        dispatch({
          type: "SET_STEP_ERROR",
          key: moduleKey,
          error: err?.userMessage || err?.message || `Could not start ${module}.`,
        });
        dispatch({ type: "SET_PENDING", pending: false });
        return null;
      }

      const parsed = parseStepResponse(raw);
      dispatch({ type: "SET_PENDING", pending: false });

      // Trust the response's module over the requested one.
      const landedKey = parsed.moduleKey ?? moduleKey;

      dispatch({
        type: "ACTIVATE_MODULE",
        key: landedKey,
        phase: MODULE_BY_KEY[landedKey].loadingPhase,
        jobId: parsed.jobId,
        stepId: parsed.stepId,
      });

      dispatch({
        type: "SET_STEP_DATA",
        key: landedKey,
        data: { selections: raw?.selections ?? selections },
      });

      return { ...parsed, moduleKey: landedKey };
    },
    []
  );

  /**
   * Requirement 3, part two: the chat bar.
   *
   * Every message goes to the backend. Normally the LLM answers from the step's
   * stored result and `jobId` comes back null. Only an explicit @Module starts
   * a fresh agent run — and then the response carries a jobId, which becomes
   * the active job for whichever module the response names.
   *
   * There is deliberately no keyword matching here. The UI guessing that
   * "show me the patents" means NovSearch is how a researcher ends up on a
   * screen the backend knows nothing about.
   */
  const sendMessage = useCallback(
    async (text) => {
      const message = String(text ?? "").trim();
      if (!message) return null;

      const sessionId = sessionIdRef.current;
      const originKey = state.activeKey;
      const stepId = originKey ? state.steps[originKey]?.stepId ?? null : null;

      // Show the user's own message immediately, attached to the step they
      // typed it into, so it stays put if the hand-off moves the view.
      dispatch({
        type: "APPEND_MESSAGES",
        key: originKey,
        messages: [{ role: "user", text: message }],
      });

      if (!sessionId) {
        dispatch({
          type: "APPEND_MESSAGES",
          key: originKey,
          messages: [
            {
              role: "agent",
              isError: true,
              text: "There is no active session, so this question could not be sent. Start a new research query.",
            },
          ],
        });
        return null;
      }

      dispatch({ type: "SET_PENDING", pending: true });

      let raw;
      try {
        raw = await postMessageRequest(sessionId, { message, stepId });
      } catch (err) {
        dispatch({
          type: "APPEND_MESSAGES",
          key: originKey,
          messages: [
            {
              role: "agent",
              isError: true,
              text: err?.userMessage || err?.message || "The question could not be answered.",
            },
          ],
        });
        dispatch({ type: "SET_PENDING", pending: false });
        return null;
      }

      const parsed = parseMessageResponse(raw);
      dispatch({ type: "SET_PENDING", pending: false });

      /**
       * W7 / defect B3: a reply is never dropped.
       *
       * This used to append only `if (parsed.content)`. When the backend
       * answered in a shape the parser did not recognise — which is what
       * happens when the answer is about a different disease and comes back
       * wrapped differently — the user saw nothing at all: no message, no
       * error, no spinner. The reply had arrived and been thrown away.
       *
       * A response that carries no readable text but did start a job is a
       * legitimate silent case: the job's own progress takes over from here.
       */
      if (parsed.content) {
        dispatch({
          type: "APPEND_MESSAGES",
          key: originKey,
          messages: [
            {
              role: parsed.role,
              text: parsed.content,
              agentName: parsed.agentName,
              stepId: parsed.stepId,
            },
          ],
        });
      } else if (!parsed.jobId) {
        // eslint-disable-next-line no-console
        console.warn(
          "[session] message response carried no readable content",
          parsed.raw
        );

        dispatch({
          type: "APPEND_MESSAGES",
          key: originKey,
          messages: [
            {
              role: "agent",
              isError: true,
              text:
                "The agent replied, but the answer could not be read. " +
                "This is a display problem rather than a failed run — the " +
                "raw response is in the browser console.",
            },
          ],
        });
      }

      // A jobId means an @Module started a real agent run.
      if (parsed.jobId) {
        const landedKey = parsed.moduleKey ?? originKey;
        if (landedKey && MODULE_BY_KEY[landedKey]) {
          dispatch({
            type: "ACTIVATE_MODULE",
            key: landedKey,
            phase: MODULE_BY_KEY[landedKey].loadingPhase,
            jobId: parsed.jobId,
            stepId: parsed.stepId ?? undefined,
          });
        }
      }

      return parsed;
    },
    [state.activeKey, state.steps]
  );

  /**
   * Run the active step again with different parameters. The original is kept;
   * the new step points back at it via rerunOfStepId.
   */
  const rerunStep = useCallback(
    async (moduleKey, params = {}) => {
      const sessionId = sessionIdRef.current;
      const key = moduleKey ?? state.activeKey;
      const stepId = key ? state.steps[key]?.stepId : null;

      if (!sessionId || !stepId) {
        dispatch({
          type: "SET_STEP_ERROR",
          key,
          error: "This step cannot be rerun — it has no step id on the server.",
        });
        return null;
      }

      dispatch({ type: "SET_PENDING", pending: true });

      let raw;
      try {
        raw = await rerunStepRequest(sessionId, stepId, { params });
      } catch (err) {
        dispatch({
          type: "SET_STEP_ERROR",
          key,
          error: err?.userMessage || err?.message || "The rerun could not be started.",
        });
        dispatch({ type: "SET_PENDING", pending: false });
        return null;
      }

      const parsed = parseStepResponse(raw);
      const landedKey = parsed.moduleKey ?? key;

      dispatch({ type: "SET_PENDING", pending: false });
      dispatch({
        type: "ACTIVATE_MODULE",
        key: landedKey,
        phase: MODULE_BY_KEY[landedKey].loadingPhase,
        jobId: parsed.jobId,
        stepId: parsed.stepId,
      });

      return { ...parsed, moduleKey: landedKey };
    },
    [state.activeKey, state.steps]
  );

  /** Rerun whichever step is on screen. */
  const rerunActiveStep = useCallback(
    (params = {}) => rerunStep(state.activeKey, params),
    [rerunStep, state.activeKey]
  );

  /**
   * The whole thread, always.
   *
   * W3 / defect B4: this used to slice the conversation to
   * `stepIndex <= activeModule.index`, so stepping back to an earlier module
   * hid everything discussed after it. In a single continuous conversation
   * that is exactly wrong — the thread is the record of the session, and
   * looking at an earlier result must not erase later turns.
   *
   * Per-module slicing has not gone away; `messagesForModule(key)` below still
   * provides it for anything that genuinely wants one module's messages.
   */
  const visibleConversation = state.conversation;

  const messagesForModule = useCallback(
    (key) => state.conversation.filter((m) => m.moduleKey === key),
    [state.conversation]
  );

  /**
   * Step descriptors for the left rail, in pipeline order.
   *
   * `isCompleted` is deliberately NOT "visited and not active". The rail used
   * to derive the tick from `visited` alone, so a module that had merely been
   * activated — including one whose run failed outright — showed a completed
   * tick as soon as the user looked at something else. A step is complete only
   * when it has reached its results phase without an error.
   */
  const rail = useMemo(
    () =>
      MODULES.map((m) => {
        const step = state.steps[m.key];
        const isActive = state.activeKey === m.key;
        const phase = step.phase ?? "";

        const isFailed = Boolean(step.error) || phase.endsWith("-error");
        // CurateX's second job (compound scoring) runs in "curatex-submitted",
        // which doesn't end in "-loading"; without it CurateX showed a
        // completed tick while scoring was still in flight.
        const isRunning = phase.endsWith("-loading") || phase === "curatex-submitted";
        const isCompleted =
          step.visited && !isFailed && !isRunning && Boolean(step.phase);

        return {
          ...m,
          visited: step.visited,
          isActive,
          isCompleted,
          isRunning,
          isFailed,
          // Visited but not the one being viewed — reachable by clicking.
          isNavigable: step.visited && !isActive,
          phase: step.phase,
          jobId: step.jobId,
          error: step.error,
        };
      }),
    [state.steps, state.activeKey]
  );

  return {
    // raw state
    sessionId: state.sessionId,
    status: state.status,
    error: state.error,
    lastSupervisorResponse: state.lastSupervisorResponse,
    steps: state.steps,
    activationOrder: state.activationOrder,
    conversation: state.conversation,
    pending: state.pending,
    title: state.title,
    sessionStatus: state.sessionStatus,

    // derived
    activeKey: state.activeKey,
    activeModule,
    activeStepState,
    activeIndex: activeModule ? activeModule.index : 0,
    activePhase: activeStepState?.phase ?? null,
    activeJobId: activeStepState?.jobId ?? null,
    activeStepId: activeStepState?.stepId ?? null,
    activeError: activeStepState?.error ?? null,
    visibleConversation,
    rail,

    // actions
    startSession,
    resumeSession,
    refreshSession,
    updateSession,
    activateModule,
    goToModule,
    goToIndex,
    setPhase,
    setStepData,
    setStepJob,
    setStepError,
    appendMessages,
    messagesForModule,
    handOff,
    sendMessage,
    rerunStep,
    rerunActiveStep,
    reset,

    // helpers
    moduleForPhase,
  };
};

export default useWorkflowSession;
