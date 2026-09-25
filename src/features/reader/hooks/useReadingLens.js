import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getStorageItem,
  setStorageItem,
  splitSentences,
  wordCount,
} from "../../../shared/lib/index.js";

export const LENS_ENDPOINT = "/api/reading-lens";
export const LENS_QUOTA_KEY = "bookflow:lens_quota";
export const LENS_POSITION_STORAGE_KEY = "bookflow:lens_position";
export const LENS_MAX_PASSAGE_CHARS = 24000;
export const LENS_MAX_SELECTION_CHARS = 4000;
export const LENS_MAX_CHAPTER_CHARS = 12000;
export const LENS_RATE_LIMIT_MAX = 40;
export const LENS_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const LENS_WINDOW_MARGIN = 12;
export const LENS_KEYBOARD_STEP = 24;
export const LENS_KEYBOARD_STEP_LARGE = 72;

export const LENS_STATUS = {
  idle: "idle",
  local: "local",
  requesting: "requesting",
  streaming: "streaming",
  complete: "complete",
  empty: "empty",
  stale: "stale",
  aborted: "aborted",
  rateLimited: "rate-limited",
  blocked: "blocked",
  error: "error",
};

export const LENS_ACTIONS = [
  { id: "summarize", label: "Summarize", icon: "align-left" },
  { id: "explain", label: "Explain", icon: "lightbulb" },
  { id: "translate", label: "Translate", icon: "languages" },
  { id: "trivia", label: "Context", icon: "landmark" },
];

const ACTION_PROMPTS = {
  summarize: "Summarize this passage in three concise sentences.",
  explain: "Explain the core ideas of this passage in plain language.",
  translate: (language) => `Translate this passage into ${language}.`,
  trivia:
    "Give the historical, literary, or conceptual background that makes this passage easier to read.",
};

export function resolveLensPrompt(promptText, options = {}) {
  const custom = String(promptText ?? "").trim();
  if (options.action === "translate") {
    return ACTION_PROMPTS.translate(options.targetLang || "Spanish");
  }
  if (options.action && ACTION_PROMPTS[options.action]) {
    return ACTION_PROMPTS[options.action];
  }
  return custom;
}

function clip(value, max) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function composeLensPassage({
  selection,
  includeChapterContext = false,
  chapterTitle = "",
  chapterText = "",
}) {
  const passage = clip(String(selection ?? "").trim(), LENS_MAX_SELECTION_CHARS);
  const chapter = String(chapterText ?? "").trim();
  if (!includeChapterContext || !chapter) return passage;
  const heading = chapterTitle ? `[Chapter: ${String(chapterTitle).trim()}]` : "[Chapter context]";
  return clip(
    `${passage}\n\n${heading}\n${clip(chapter, LENS_MAX_CHAPTER_CHARS)}`,
    LENS_MAX_PASSAGE_CHARS,
  );
}

export function buildLensRequestBody({
  prompt,
  passage,
  action = null,
  consent = true,
}) {
  return {
    prompt: String(prompt ?? ""),
    passage: String(passage ?? ""),
    action: action || null,
    consent: Boolean(consent),
  };
}

export function extractLensText(payload, { trim = true } = {}) {
  if (typeof payload === "string") return trim ? payload.trim() : payload;
  if (!payload || typeof payload !== "object") return "";
  const keys = ["text", "answer", "output", "content", "response", "result"];
  for (const key of keys) {
    if (typeof payload[key] === "string" && payload[key].trim()) {
      return trim ? payload[key].trim() : payload[key];
    }
  }
  if (payload.data && typeof payload.data === "object") return extractLensText(payload.data, { trim });
  if (typeof payload.message === "string" && payload.message.trim()) {
    return trim ? payload.message.trim() : payload.message;
  }
  return "";
}

export function extractLensError(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload.trim();
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail.trim();
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
  if (payload.error && typeof payload.error === "object") {
    return extractLensError(payload.error);
  }
  return "";
}

function lensProviderSource(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.data && typeof payload.data === "object") return payload.data;
  return payload;
}

export function pickLensProvider(payload) {
  const source = lensProviderSource(payload);
  if (!source) return "";
  return String(source.provider || source.model || "").trim();
}

export function pickLensFallback(payload) {
  const source = lensProviderSource(payload);
  if (!source) return false;
  return (
    source.fallback === true ||
    source.usedFallback === true ||
    source.fallbackUsed === true
  );
}

export function pickLensAttempts(payload) {
  if (!payload || typeof payload !== "object") return [];
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  return attempts.filter((entry) => typeof entry === "string" && entry.trim());
}

export function pickLensCandidates(payload) {
  if (!payload || typeof payload !== "object") return [];
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  return candidates.filter((entry) => typeof entry === "string" && entry.trim());
}

function parseStreamBlock(block, handlers) {
  let eventName = "message";
  const dataLines = [];
  for (const line of String(block).split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) eventName = line.slice(6).trim() || "message";
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  const raw = dataLines.join("\n");
  if (!raw.trim()) return "";

  if (raw.trim() === "[DONE]") {
    handlers.onDone?.();
    return "";
  }

  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { text: raw };
  }

  if (eventName === "error") {
    handlers.onError?.(
      extractLensError(payload) || "Reading Lens request failed.",
      payload,
    );
    return "";
  }
  if (eventName === "done") {
    handlers.onDone?.();
    return "";
  }
  if (eventName === "start") {
    if (typeof payload?.status === "string") handlers.onStatus?.(payload.status);
    handlers.onCandidates?.(pickLensCandidates(payload));
    return "";
  }
  if (eventName === "completed") {
    const provider = pickLensProvider(payload);
    if (provider) handlers.onProvider?.(provider, pickLensFallback(payload));
    const attempts = pickLensAttempts(payload);
    if (attempts.length) handlers.onAttempts?.(attempts);
    if (typeof payload?.status === "string") handlers.onStatus?.(payload.status);
    handlers.onDone?.();
    return "";
  }
  if (eventName === "status" || eventName === "provider" || eventName === "fallback") {
    const provider = pickLensProvider(payload) || handlers.provider || "";
    handlers.onStatus?.(typeof payload?.status === "string" ? payload.status : "");
    if (provider) handlers.onProvider?.(provider, eventName === "fallback" || pickLensFallback(payload));
    return "";
  }

  const provider = pickLensProvider(payload);
  if (provider) handlers.onProvider?.(provider, pickLensFallback(payload));
  const status = typeof payload?.status === "string" ? payload.status : "";
  if (status) handlers.onStatus?.(status);
  return extractLensText(payload, { trim: false });
}

export function createLensStreamParser(handlers = {}) {
  let buffer = "";
  let text = "";
  const drain = (final) => {
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const delta = parseStreamBlock(block, handlers);
      if (delta) {
        text += delta;
        handlers.onText?.(delta, text);
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (final && buffer.trim()) {
      const delta = parseStreamBlock(buffer, handlers);
      buffer = "";
      if (delta) {
        text += delta;
        handlers.onText?.(delta, text);
      }
    }
  };
  return {
    push(chunk) {
      buffer += String(chunk ?? "");
      drain(false);
    },
    flush() {
      drain(true);
      return text;
    },
    getText() {
      return text;
    },
  };
}

export async function readLensResponse(response, handlers = {}) {
  const contentType =
    typeof response?.headers?.get === "function"
      ? String(response.headers.get("content-type") || "").toLowerCase()
      : "";

  if (contentType.includes("text/event-stream") && response.body) {
    const parser = createLensStreamParser(handlers);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = typeof value === "string" ? value : decoder.decode(value, { stream: true });
        parser.push(chunk);
      }
    } finally {
      reader.releaseLock?.();
    }
    return parser.flush();
  }

  const raw = await response.text();
  if (!raw || !raw.trim()) return "";
  try {
    const payload = JSON.parse(raw);
    const provider = pickLensProvider(payload);
    if (provider) handlers.onProvider?.(provider, pickLensFallback(payload));
    if (typeof payload?.status === "string") handlers.onStatus?.(payload.status);
    return extractLensText(payload);
  } catch {
    return raw;
  }
}

export function describeLensAttempts(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return "";
  if (attempts.length === 1) return attempts[0];
  return attempts.join(" then ");
}

export function readLensQuota(now = Date.now()) {
  let records = [];
  try {
    const parsed = JSON.parse(getStorageItem(LENS_QUOTA_KEY) || "[]");
    if (Array.isArray(parsed)) records = parsed;
  } catch {
    records = [];
  }
  const recent = records.filter(
    (stamp) => Number.isFinite(stamp) && now - stamp < LENS_RATE_LIMIT_WINDOW_MS,
  );
  return {
    allowed: recent.length < LENS_RATE_LIMIT_MAX,
    remaining: Math.max(0, LENS_RATE_LIMIT_MAX - recent.length),
    recent,
  };
}

export function consumeLensQuota(now = Date.now()) {
  const { allowed, remaining, recent } = readLensQuota(now);
  if (!allowed) return { allowed: false, remaining: 0 };
  try {
    setStorageItem(LENS_QUOTA_KEY, JSON.stringify([...recent, now]));
  } catch {
    /* storage is optional */
  }
  return { allowed: true, remaining: Math.max(0, remaining - 1) };
}

export function describePassageLocally(passage) {
  const text = String(passage ?? "").trim();
  const sentences = splitSentences(text);
  return {
    characters: text.length,
    words: wordCount(text),
    sentences: sentences.length,
    opening: sentences[0] || text,
  };
}

export function buildLocalLensReply(passage, options = {}) {
  const stats = describePassageLocally(passage);
  const opening =
    stats.opening.length > 180 ? `${stats.opening.slice(0, 179)}…` : stats.opening;
  const intent = LENS_ACTIONS.find((action) => action.id === options.action)?.label;
  const tail = intent
    ? `No request was sent. Allow "Send passage to Lens" to ask ${intent} remotely.`
    : 'No request was sent. Allow "Send passage to Lens" to ask remotely.';
  return `Local only. Passage stayed on this device: ${stats.words} words, ${stats.sentences} sentences, ${stats.characters} characters. Opening line: "${opening}". ${tail}`;
}

export function describeLensStatus(
  status,
  { consentGranted = false, provider = "", usedFallback = false, attempts = [] } = {},
) {
  const chain = describeLensAttempts(attempts);
  switch (status) {
    case LENS_STATUS.local:
      return "Local only. Nothing left this device.";
    case LENS_STATUS.requesting:
      return "Sending only the selected passage to your Reading Lens service.";
    case LENS_STATUS.streaming:
      return chain
        ? `Reading Lens is trying ${chain}.`
        : "Reading Lens is responding.";
    case LENS_STATUS.complete:
      if (usedFallback && provider) return `Answered by the fallback model ${provider}.`;
      if (provider) return `Answered by ${provider}.`;
      return "Answer ready.";
    case LENS_STATUS.empty:
      return "Select a passage in the reader first.";
    case LENS_STATUS.stale:
      return "Passage changed, so the previous answer was discarded.";
    case LENS_STATUS.aborted:
      return "Request stopped.";
    case LENS_STATUS.blocked:
      return "The server refused the request because consent was not recorded.";
    case LENS_STATUS.rateLimited:
      return `Rate limit reached (${LENS_RATE_LIMIT_MAX} requests per 15 minutes). Try again shortly.`;
    case LENS_STATUS.error:
      return "Reading Lens is unavailable right now.";
    default:
      return consentGranted
        ? "Ready. Text stays on this device unless you ask."
        : "Local only until you allow the passage to be sent.";
  }
}

export function lensStateAttribute(status) {
  if (status === LENS_STATUS.requesting || status === LENS_STATUS.streaming) return "running";
  return status || "idle";
}

export function quickActionStatus({ status, activeAction, actionId, consentGranted }) {
  if (status === LENS_STATUS.requesting || status === LENS_STATUS.streaming) {
    return activeAction === actionId ? "Running" : "Queued";
  }
  if (status === LENS_STATUS.error || status === LENS_STATUS.rateLimited) return "Retry";
  if (status === LENS_STATUS.complete) return "Done";
  if (status === LENS_STATUS.local) return "Local";
  if (status === LENS_STATUS.stale) return "Stale";
  if (status === LENS_STATUS.aborted) return "Stopped";
  if (status === LENS_STATUS.empty) return "No passage";
  return consentGranted ? "Ready" : "Local";
}

export function clampLensPosition({
  left,
  top,
  width,
  height,
  viewportWidth,
  viewportHeight,
  margin = LENS_WINDOW_MARGIN,
}) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  const maxLeft = Math.max(margin, viewportWidth - safeWidth - margin);
  const maxTop = Math.max(margin, viewportHeight - safeHeight - margin);
  const safeLeft = Number.isFinite(left) ? left : margin;
  const safeTop = Number.isFinite(top) ? top : margin;
  return {
    left: Math.min(Math.max(safeLeft, margin), maxLeft),
    top: Math.min(Math.max(safeTop, margin), maxTop),
  };
}

export function lensKeyboardDelta(key, step = LENS_KEYBOARD_STEP) {
  const amount = Number.isFinite(step) && step > 0 ? step : LENS_KEYBOARD_STEP;
  if (key === "ArrowLeft") return { x: -amount, y: 0 };
  if (key === "ArrowRight") return { x: amount, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -amount };
  if (key === "ArrowDown") return { x: 0, y: amount };
  return null;
}

export function serializeLensPosition(position) {
  if (!position) return "";
  const { left, top } = position;
  if (!Number.isFinite(left) || !Number.isFinite(top)) return "";
  return `${Math.round(left * 100) / 100},${Math.round(top * 100) / 100}`;
}

export function parseLensPosition(value) {
  const parts = String(value ?? "").split(",");
  if (parts.length !== 2) return null;
  const left = Number.parseFloat(parts[0]);
  const top = Number.parseFloat(parts[1]);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { left, top };
}

let messageSequence = 0;

function nextMessageId(role) {
  messageSequence += 1;
  return `lens-${role}-${messageSequence}`;
}

export function useReadingLens({
  selectedText = "",
  chapterTitle = "",
  chapterText = "",
  endpoint = LENS_ENDPOINT,
  fetchImpl,
} = {}) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(LENS_STATUS.idle);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [consentGranted, setConsentGrantedState] = useState(false);
  const [includeChapterContext, setIncludeChapterContext] = useState(false);

  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const activePassage = useMemo(
    () => String(selectedText ?? "").trim(),
    [selectedText],
  );
  const passageRef = useRef(activePassage);
  const consentRef = useRef(consentGranted);
  const chapterContextRef = useRef(includeChapterContext);

  useEffect(() => {
    passageRef.current = activePassage;
  }, [activePassage]);

  useEffect(() => {
    consentRef.current = consentGranted;
  }, [consentGranted]);

  useEffect(() => {
    chapterContextRef.current = includeChapterContext;
  }, [includeChapterContext]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setStatus((current) =>
      current === LENS_STATUS.requesting || current === LENS_STATUS.streaming
        ? LENS_STATUS.aborted
        : current,
    );
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setMessages([]);
    setError(null);
    setStatus(LENS_STATUS.idle);
  }, []);

  const setConsentGranted = useCallback(
    (next) => {
      const granted = Boolean(next);
      setConsentGrantedState(granted);
      consentRef.current = granted;
      if (!granted) {
        requestIdRef.current += 1;
        if (controllerRef.current) {
          controllerRef.current.abort();
          controllerRef.current = null;
        }
      }
      setStatus(granted ? LENS_STATUS.idle : LENS_STATUS.local);
    },
    [],
  );

  const ask = useCallback(
    async (promptText, options = {}) => {
      const prompt = resolveLensPrompt(promptText, options);
      const passage = String(options.passage ?? passageRef.current ?? "").trim();
      const action = options.action || null;

      if (!passage) {
        setError("Select a passage in the reader first.");
        setStatus(LENS_STATUS.empty);
        return { ok: false, reason: LENS_STATUS.empty };
      }

      if (!consentRef.current) {
        const reply = buildLocalLensReply(passage, { action, prompt });
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId("user"),
            role: "user",
            text: prompt,
            action,
            isLocal: true,
          },
          {
            id: nextMessageId("assistant"),
            role: "assistant",
            text: reply,
            action,
            passage,
            isLocal: true,
            isStreaming: false,
          },
        ]);
        setError(null);
        setStatus(LENS_STATUS.local);
        setIsExpanded(true);
        return { ok: false, reason: LENS_STATUS.local, text: reply };
      }

      if (!prompt) {
        setError("Type a question about the selected passage.");
        setStatus(LENS_STATUS.empty);
        return { ok: false, reason: "prompt" };
      }

      const quota = consumeLensQuota();
      if (!quota.allowed) {
        setError(describeLensStatus(LENS_STATUS.rateLimited));
        setStatus(LENS_STATUS.rateLimited);
        setIsExpanded(true);
        return { ok: false, reason: LENS_STATUS.rateLimited };
      }

      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      const capturedPassage = passage;
      const requestPassage = composeLensPassage({
        selection: capturedPassage,
        includeChapterContext: chapterContextRef.current,
        chapterTitle,
        chapterText,
      });
      const controller = new AbortController();
      controllerRef.current = controller;

      const assistantId = nextMessageId("assistant");
      setError(null);
      setStatus(LENS_STATUS.requesting);
      setIsExpanded(true);
      setProvider("");
      setAttempts([]);
      setUsedFallback(false);
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId("user"), role: "user", text: prompt, action },
        {
          id: assistantId,
          role: "assistant",
          text: "",
          action,
          passage: capturedPassage,
          isStreaming: true,
        },
      ]);

      const isStale = () =>
        requestIdRef.current !== requestId || passageRef.current !== capturedPassage;

      const appendText = (text) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, text: message.text + text, isStreaming: true }
              : message,
          ),
        );
      };

      const finishMessage = (patch) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, isStreaming: false, ...patch }
              : message,
          ),
        );
      };

      try {
        const request = (fetchImpl || globalThis.fetch)(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              buildLensRequestBody({
                prompt,
                passage: requestPassage,
                action,
                consent: true,
              }),
            ),
            signal: controller.signal,
          },
        );

        const response = await request;

        if (isStale()) {
          controller.abort();
          if (mountedRef.current) {
            setStatus(LENS_STATUS.stale);
            setMessages((prev) => prev.filter((message) => message.id !== assistantId));
          }
          return { ok: false, reason: LENS_STATUS.stale };
        }

        if (response.status === 429) {
          const detail = extractLensError(await response.json().catch(() => null));
          const message = detail || describeLensStatus(LENS_STATUS.rateLimited);
          if (mountedRef.current) {
            setError(message);
            setStatus(LENS_STATUS.rateLimited);
            setMessages((prev) => prev.filter((item) => item.id !== assistantId));
          }
          return { ok: false, reason: LENS_STATUS.rateLimited };
        }

        if (response.status === 403) {
          const detail = extractLensError(await response.json().catch(() => null));
          if (mountedRef.current) {
            setError(detail || "The server refused the request because consent was not recorded.");
            setStatus(LENS_STATUS.blocked);
            setMessages((prev) => prev.filter((item) => item.id !== assistantId));
          }
          return { ok: false, reason: LENS_STATUS.blocked };
        }

        if (!response.ok) {
          const detail = extractLensError(await response.json().catch(() => null));
          throw new Error(detail || `Reading Lens request failed (${response.status}).`);
        }

        setStatus(LENS_STATUS.streaming);

        let text = "";
        let streamError = "";
        text = await readLensResponse(response, {
          onText: (delta) => {
            if (isStale()) return;
            if (mountedRef.current) {
              setStatus(LENS_STATUS.streaming);
              appendText(delta);
            }
          },
          onProvider: (name, isFallback) => {
            if (!mountedRef.current) return;
            setProvider(name);
            if (isFallback) setUsedFallback(true);
          },
          onCandidates: (candidates) => {
            if (!mountedRef.current || !candidates.length) return;
            setAttempts(candidates);
          },
          onAttempts: (candidates) => {
            if (!mountedRef.current || !candidates.length) return;
            setAttempts(candidates);
          },
          onStatus: (value) => {
            if (!mountedRef.current || isStale()) return;
            if (value) setStatus(value === "complete" ? LENS_STATUS.complete : LENS_STATUS.streaming);
          },
          onError: (message) => {
            streamError = message;
          },
        });

        if (isStale()) {
          controller.abort();
          if (mountedRef.current) {
            setStatus(LENS_STATUS.stale);
            setMessages((prev) => prev.filter((message) => message.id !== assistantId));
          }
          return { ok: false, reason: LENS_STATUS.stale };
        }

        if (streamError) throw new Error(streamError);

        const answer = text.trim();
        if (!answer) {
          throw new Error("Reading Lens returned an empty answer.");
        }

        finishMessage({ text: answer });
        setStatus(LENS_STATUS.complete);
        return { ok: true, text: answer };
      } catch (caught) {
        const aborted = caught?.name === "AbortError" || controller.signal.aborted;
        if (!mountedRef.current) return { ok: false, reason: "unmounted" };
        if (aborted) {
          setMessages((prev) => prev.filter((message) => message.id !== assistantId));
          if (requestIdRef.current === requestId) setStatus(LENS_STATUS.aborted);
          return { ok: false, reason: LENS_STATUS.aborted };
        }
        const message = caught?.message || "Reading Lens request failed.";
        setError(message);
        setStatus(LENS_STATUS.error);
        finishMessage({
          text: "The Reading Lens answer failed. Nothing was changed in your document.",
          isError: true,
        });
        return { ok: false, reason: LENS_STATUS.error, error: message };
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [chapterText, chapterTitle, endpoint, fetchImpl],
  );

  const askAction = useCallback(
    (action) => ask("", { action }),
    [ask],
  );

  const isLoading = status === LENS_STATUS.requesting || status === LENS_STATUS.streaming;
  const canIncludeChapterContext = Boolean(String(chapterText ?? "").trim());
  const statusLabel = describeLensStatus(status, {
    consentGranted,
    provider,
    usedFallback,
    attempts,
  });

  return {
    messages,
    status,
    statusLabel,
    isLoading,
    error,
    provider,
    attempts,
    usedFallback,
    isExpanded,
    setIsExpanded,
    activePassage,
    hasSelection: Boolean(String(selectedText ?? "").trim()),
    consentGranted,
    setConsentGranted,
    includeChapterContext,
    setIncludeChapterContext,
    canIncludeChapterContext,
    ask,
    askAction,
    cancel,
    clear,
  };
}
