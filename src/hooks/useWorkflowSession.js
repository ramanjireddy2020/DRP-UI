import { useCallback, useMemo, useReducer } from "react";
import { createSession as createSessionRequest } from "../services/api/sessions";
import {
  MODULES,
  MODULE_BY_KEY,
  parseSupervisorModule,
  parseSessionId,
  parseJobId,
  parseStepId,
  moduleForPhase,
} from "../workflow/moduleMap";

/**
 * Workflow session state.
 *
 * Two requirements drive this shape:
 *
 *  1. The supervisor decides which module runs. Nothing here assumes TxKG —
 *     activation always comes from a module key resolved out of the API
 *     response, and modules may activate out of pipeline order.
 *
 *  2. Nothing is ever lost when the workflow moves on. Each module keeps its
 *     own phase, job, and data; the conversation is a single append-only thread
 *     whose entries are tagged with the module they belong to. Navigating back
 *     to an earlier step changes which slice is *shown*, never what is stored.
 */

const buildInitialSteps = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = {
      key: m.key,
      index: m.index,
      label: m.label,
      visited: false,
      phase: null,
      jobId: null,
      stepId: null,
      data: {},
    };
    return acc;
  }, {});

const initialState = {
  sessionId: null,
  status: "idle", // idle | creating | ready | error
  error: null,
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
      };
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
        ...(action.stepId !== undefined ? { stepId: action.stepId } : {}),
      });
    }

    /** Append to the thread. Never replaces, never truncates. */
    case "APPEND_MESSAGES": {
      const key = action.key ?? state.activeKey;
      const module = MODULE_BY_KEY[key];
      const stamped = action.messages.map((message, offset) => ({
        id: `m${state.seq + offset + 1}`,
        moduleKey: key ?? null,
        stepIndex: module ? module.index : null,
        at: Date.now(),
        ...message,
      }));

      return {
        ...state,
        conversation: [...state.conversation, ...stamped],
        seq: state.seq + stamped.length,
      };
    }

    case "RESET":
      return { ...initialState, steps: buildInitialSteps() };

    default:
      return state;
  }
}

const useWorkflowSession = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

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

    dispatch({ type: "SESSION_READY", sessionId, raw });

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

  /** Activate a module directly — used when a step hands off to the next one. */
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

  const appendMessages = useCallback((messages, key) => {
    const list = Array.isArray(messages) ? messages : [messages];
    if (!list.length) return;
    dispatch({ type: "APPEND_MESSAGES", messages: list, key });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  /**
   * The thread as the active step should see it: everything up to and including
   * this step. Navigating back shows the history that existed at that point,
   * while the full thread stays in `conversation`.
   */
  const visibleConversation = useMemo(() => {
    if (!activeModule) return state.conversation;
    return state.conversation.filter(
      (m) => m.stepIndex == null || m.stepIndex <= activeModule.index
    );
  }, [state.conversation, activeModule]);

  const messagesForModule = useCallback(
    (key) => state.conversation.filter((m) => m.moduleKey === key),
    [state.conversation]
  );

  /** Step descriptors for the left rail, in pipeline order. */
  const rail = useMemo(
    () =>
      MODULES.map((m) => {
        const step = state.steps[m.key];
        return {
          ...m,
          visited: step.visited,
          isActive: state.activeKey === m.key,
          // Visited but not the one being viewed — reachable by clicking.
          isNavigable: step.visited && state.activeKey !== m.key,
          phase: step.phase,
          jobId: step.jobId,
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

    // derived
    activeKey: state.activeKey,
    activeModule,
    activeStepState,
    activeIndex: activeModule ? activeModule.index : 0,
    activePhase: activeStepState?.phase ?? null,
    activeJobId: activeStepState?.jobId ?? null,
    visibleConversation,
    rail,

    // actions
    startSession,
    activateModule,
    goToModule,
    goToIndex,
    setPhase,
    setStepData,
    setStepJob,
    appendMessages,
    messagesForModule,
    reset,

    // helpers
    moduleForPhase,
  };
};

export default useWorkflowSession;
