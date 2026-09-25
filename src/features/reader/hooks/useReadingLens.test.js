import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { removeStorageItem } from "../../../shared/lib/index.js";

const harness = vi.hoisted(() => ({
  slots: [],
  effectSlots: [],
  cursor: 0,
  pending: [],
  cleanups: [],
  result: undefined,
  hookFn: null,
  props: undefined,
  busy: false,
  dirty: false,
  rendering: false,
}));

function depsEqual(previous, next) {
  if (previous === undefined || next === undefined) return false;
  if (previous.length !== next.length) return false;
  return previous.every((value, index) => Object.is(value, next[index]));
}

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useState: (initial) => {
      const index = harness.cursor++;
      if (!(index in harness.slots)) {
        harness.slots[index] = typeof initial === "function" ? initial() : initial;
      }
      const setState = (next) => {
        const value = typeof next === "function" ? next(harness.slots[index]) : next;
        if (Object.is(value, harness.slots[index])) return;
        harness.slots[index] = value;
        if (harness.rendering) {
          harness.dirty = true;
          return;
        }
        rerender();
      };
      return [harness.slots[index], setState];
    },
    useRef: (initial) => {
      const index = harness.cursor++;
      if (!(index in harness.slots)) harness.slots[index] = { current: initial };
      return harness.slots[index];
    },
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useEffect: (effect, deps) => {
      const index = harness.cursor++;
      const slot = harness.effectSlots[index];
      const changed = !depsEqual(slot?.deps, deps);
      harness.effectSlots[index] = { deps, cleanup: null };
      if (!changed) return;
      if (slot?.cleanup) slot.cleanup();
      harness.pending.push(() => {
        const cleanup = effect();
        harness.effectSlots[index].cleanup = typeof cleanup === "function" ? cleanup : null;
      });
    },
  };
});

import {
  LENS_ACTIONS,
  LENS_QUOTA_KEY,
  LENS_STATUS,
  buildLensRequestBody,
  buildLocalLensReply,
  composeLensPassage,
  createLensStreamParser,
  describeLensStatus,
  extractLensText,
  readLensResponse,
  resolveLensPrompt,
  useReadingLens,
} from "./useReadingLens.js";

function renderOnce() {
  harness.cursor = 0;
  harness.pending = [];
  harness.dirty = false;
  harness.rendering = true;
  try {
    harness.result = harness.hookFn(harness.props);
  } finally {
    harness.rendering = false;
  }
  const effects = harness.pending;
  harness.pending = [];
  for (const effect of effects) effect();
}

function rerender() {
  if (harness.busy) {
    harness.dirty = true;
    return;
  }
  harness.busy = true;
  try {
    let guard = 0;
    do {
      harness.dirty = false;
      renderOnce();
    } while (harness.dirty && ++guard < 25);
  } finally {
    harness.busy = false;
  }
}

function renderHook(hookFn, props = {}) {
  harness.slots = [];
  harness.effectSlots = [];
  harness.cleanups = [];
  harness.hookFn = hookFn;
  harness.props = props;
  rerender();
  return {
    get result() {
      return harness.result;
    },
    rerender(nextProps) {
      if (nextProps) harness.props = nextProps;
      rerender();
    },
    unmount() {
      const effects = harness.effectSlots.filter(Boolean).reverse();
      harness.effectSlots = [];
      for (const slot of effects) slot.cleanup?.();
    },
  };
}

function headers(map) {
  return { get: (key) => map[key.toLowerCase()] ?? null };
}

function jsonResponse(body, { status = 200, headerMap = {} } = {}) {
  const map = { "content-type": "application/json", ...headerMap };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(map),
    body: null,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
  };
}

function sseResponse(payload, { chunkSize = 16 } = {}) {
  const bytes = new TextEncoder().encode(payload);
  let offset = 0;
  return {
    ok: true,
    status: 200,
    headers: headers({ "content-type": "text/event-stream" }),
    body: {
      getReader: () => ({
        read: async () => {
          if (offset >= bytes.length) return { done: true, value: undefined };
          const slice = bytes.slice(offset, offset + chunkSize);
          offset += chunkSize;
          return { done: false, value: slice };
        },
        releaseLock() {},
      }),
    },
    text: async () => payload,
    json: async () => ({}),
  };
}

function toSse(events) {
  return events
    .map((event) => `${event.event ? `event: ${event.event}\n` : ""}data: ${event.data}\n\n`)
    .join("");
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

beforeEach(() => {
  removeStorageItem(LENS_QUOTA_KEY);
});

describe("reading lens prompt and request contract", () => {
  it("maps quick actions to prompts and keeps custom questions", () => {
    expect(resolveLensPrompt("", { action: "summarize" })).toContain("Summarize");
    expect(resolveLensPrompt("", { action: "translate", targetLang: "Japanese" })).toContain(
      "Japanese",
    );
    expect(resolveLensPrompt("  what does this mean?  ", {})).toBe("what does this mean?");
    expect(LENS_ACTIONS.map((action) => action.id)).toEqual([
      "summarize",
      "explain",
      "translate",
      "trivia",
    ]);
  });

  it("sends only the fields the backend contract accepts", () => {
    const body = buildLensRequestBody({
      prompt: "explain",
      passage: "Selected words.",
      action: "explain",
    });
    expect(Object.keys(body).sort()).toEqual(["action", "consent", "passage", "prompt"]);
    expect(body.consent).toBe(true);
    expect(body.passage).toBe("Selected words.");
  });

  it("keeps the request selection-scoped unless chapter context is opted in", () => {
    const selectionOnly = composeLensPassage({
      selection: "Selected words.",
      chapterTitle: "I",
      chapterText: "Chapter body",
    });
    expect(selectionOnly).toBe("Selected words.");

    const withChapter = composeLensPassage({
      selection: "Selected words.",
      includeChapterContext: true,
      chapterTitle: "I",
      chapterText: "Chapter body",
    });
    expect(withChapter).toContain("Selected words.");
    expect(withChapter).toContain("[Chapter: I]");
    expect(withChapter).toContain("Chapter body");
  });

  it("clips oversized passages instead of shipping them whole", () => {
    const body = composeLensPassage({
      selection: "x".repeat(9000),
      includeChapterContext: true,
      chapterText: "y".repeat(40000),
    });
    expect(body.length).toBeLessThanOrEqual(24000);
    expect(body.length).toBeGreaterThan(16000);
  });
});

describe("reading lens response parsing", () => {
  it("parses the backend JSON contract and reports the provider", async () => {
    const handlers = { onProvider: vi.fn() };
    const text = await readLensResponse(
      jsonResponse({ text: "A calm answer.", provider: "gemini-2.5-flash" }),
      handlers,
    );
    expect(text).toBe("A calm answer.");
    expect(handlers.onProvider).toHaveBeenCalledWith("gemini-2.5-flash", false);
  });

  it("falls back to raw text when the response is not JSON", async () => {
    const text = await readLensResponse(
      jsonResponse("plain streamed text", { headerMap: { "content-type": "text/plain" } }),
    );
    expect(text).toBe("plain streamed text");
  });

  it("parses the documented start, delta, and completed SSE contract", async () => {
    const handlers = {
      onProvider: vi.fn(),
      onCandidates: vi.fn(),
      onAttempts: vi.fn(),
      onDone: vi.fn(),
      onText: vi.fn(),
    };
    const text = await readLensResponse(
      sseResponse(
        toSse([
          {
            event: "start",
            data: JSON.stringify({
              status: "streaming",
              action: "explain",
              consent: true,
              candidates: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            }),
          },
          { event: "delta", data: JSON.stringify({ text: "Call me " }) },
          { event: "delta", data: JSON.stringify({ text: "Ishmael." }) },
          {
            event: "completed",
            data: JSON.stringify({
              text: "Call me Ishmael.",
              model: "gemini-2.5-flash",
              fallbackUsed: false,
              attempts: ["gemini-2.5-flash"],
              finishReason: "STOP",
            }),
          },
        ]),
      ),
      handlers,
    );
    expect(text).toBe("Call me Ishmael.");
    expect(handlers.onCandidates).toHaveBeenCalledWith([
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ]);
    expect(handlers.onProvider).toHaveBeenCalledWith("gemini-2.5-flash", false);
    expect(handlers.onAttempts).toHaveBeenCalledWith(["gemini-2.5-flash"]);
    expect(handlers.onDone).toHaveBeenCalled();
  });

  it("reports a fallback provider from the completed event", async () => {
    const handlers = { onProvider: vi.fn() };
    const text = await readLensResponse(
      sseResponse(
        toSse([
          { event: "delta", data: JSON.stringify({ text: "A whale." }) },
          {
            event: "completed",
            data: JSON.stringify({
              text: "A whale.",
              model: "gemini-2.5-flash-lite",
              fallbackUsed: true,
              attempts: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            }),
          },
        ]),
      ),
      handlers,
    );
    expect(text).toBe("A whale.");
    expect(handlers.onProvider).toHaveBeenCalledWith("gemini-2.5-flash-lite", true);
  });

  it("surfaces the documented error event instead of inventing an answer", () => {
    const errors = [];
    const parser = createLensStreamParser({ onError: (message) => errors.push(message) });
    parser.push(
      'event: error\ndata: {"error": "The reading lens provider is unavailable.", "code": "provider_unavailable"}\n\n',
    );
    parser.flush();
    expect(errors).toEqual(["The reading lens provider is unavailable."]);
    expect(parser.getText()).toBe("");
  });

  it("still accepts a plain JSON answer for older backends", async () => {
    const handlers = { onProvider: vi.fn() };
    const text = await readLensResponse(
      jsonResponse({ text: "A calm answer.", provider: "gemini-2.5-flash" }),
      handlers,
    );
    expect(text).toBe("A calm answer.");
    expect(handlers.onProvider).toHaveBeenCalledWith("gemini-2.5-flash", false);
  });

  it("falls back to raw text when the response is not JSON", async () => {
    const text = await readLensResponse(
      jsonResponse("plain streamed text", { headerMap: { "content-type": "text/plain" } }),
    );
    expect(text).toBe("plain streamed text");
  });

  it("reads alternative JSON answer keys", () => {
    expect(extractLensText({ answer: "Keyed answer." })).toBe("Keyed answer.");
    expect(extractLensText({ data: { text: "Nested answer." } })).toBe("Nested answer.");
    expect(extractLensText({})).toBe("");
  });
});

describe("reading lens local and status states", () => {
  it("produces a local-only answer that admits nothing was sent", () => {
    const reply = buildLocalLensReply("Call me Ishmael. I thought I would sail about a little.", {
      action: "summarize",
    });
    expect(reply).toContain("Local only");
    expect(reply).toContain("No request was sent");
    expect(reply).toContain("Call me Ishmael.");
  });

  it("describes consent, streaming, provider, and fallback states", () => {
    expect(describeLensStatus(LENS_STATUS.idle, { consentGranted: false })).toContain("Local only");
    expect(
      describeLensStatus(LENS_STATUS.streaming, { attempts: ["gemini-2.5-flash", "lite"] }),
    ).toContain("gemini-2.5-flash then lite");
    expect(
      describeLensStatus(LENS_STATUS.streaming, { provider: "gemini-2.5-flash" }),
    ).toContain("responding");
    expect(
      describeLensStatus(LENS_STATUS.complete, { provider: "lite", usedFallback: true }),
    ).toContain("fallback model");
    expect(describeLensStatus(LENS_STATUS.stale)).toContain("discarded");
  });
});

describe("useReadingLens consent gating", () => {
  it("stays local and never calls the network before consent", async () => {
    const fetchImpl = vi.fn();
    const view = renderHook(() =>
      useReadingLens({ selectedText: "Call me Ishmael.", fetchImpl }),
    );

    expect(view.result.consentGranted).toBe(false);
    expect(view.result.canIncludeChapterContext).toBe(false);

    const outcome = await view.result.askAction("summarize");

    expect(outcome).toMatchObject({ ok: false, reason: LENS_STATUS.local });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(view.result.status).toBe(LENS_STATUS.local);
    const assistant = view.result.messages.find((message) => message.role === "assistant");
    expect(assistant.isLocal).toBe(true);
    expect(assistant.text).toContain("Local only");
    expect(assistant.passage).toBe("Call me Ishmael.");
  });

  it("cancels an in-flight request when consent is revoked", async () => {
    const fetchImpl = vi.fn(
      (url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(abortError()));
        }),
    );
    const view = renderHook(() => useReadingLens({ selectedText: "Passage.", fetchImpl }));
    view.result.setConsentGranted(true);
    const pending = view.result.ask("why?");
    expect(view.result.isLoading).toBe(true);

    view.result.setConsentGranted(false);
    await pending;

    expect(view.result.status).not.toBe(LENS_STATUS.requesting);
    expect(view.result.messages.some((message) => message.isStreaming)).toBe(false);
  });
});

describe("useReadingLens remote request", () => {
  it("sends only the selection, then reports the provider and answer", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ text: "A whale, not a porpoise.", provider: "gemini-2.5-flash" }),
    );
    const view = renderHook(() =>
      useReadingLens({
        currentParagraphText: "Full focused paragraph text.",
        selectedText: "Call me Ishmael.",
        chapterText: "Chapter body",
        fetchImpl,
      }),
    );
    view.result.setConsentGranted(true);

    const outcome = await view.result.askAction("explain");

    expect(outcome.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/reading-lens");
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(["action", "consent", "passage", "prompt"]);
    expect(body.passage).toBe("Call me Ishmael.");
    expect(body.consent).toBe(true);
    expect(body.action).toBe("explain");
    expect(init.signal).toBeDefined();
    expect(view.result.provider).toBe("gemini-2.5-flash");
    expect(view.result.status).toBe(LENS_STATUS.complete);
    const assistant = view.result.messages.find((message) => message.role === "assistant");
    expect(assistant.text).toBe("A whale, not a porpoise.");
    expect(assistant.isStreaming).toBe(false);
  });

  it("streams the documented SSE contract into the transcript", async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse(
        toSse([
          {
            event: "start",
            data: JSON.stringify({
              status: "streaming",
              candidates: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            }),
          },
          { event: "delta", data: JSON.stringify({ text: "It is a " }) },
          { event: "delta", data: JSON.stringify({ text: "sailing ship." }) },
          {
            event: "completed",
            data: JSON.stringify({
              text: "It is a sailing ship.",
              model: "gemini-2.5-flash",
              fallbackUsed: true,
              attempts: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            }),
          },
        ]),
      ),
    );
    const view = renderHook(() => useReadingLens({ selectedText: "Passage.", fetchImpl }));
    view.result.setConsentGranted(true);

    const outcome = await view.result.ask("summarize this");

    expect(outcome.text).toBe("It is a sailing ship.");
    expect(view.result.status).toBe(LENS_STATUS.complete);
    expect(view.result.provider).toBe("gemini-2.5-flash");
    expect(view.result.usedFallback).toBe(true);
    expect(view.result.attempts).toEqual(["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
    expect(view.result.statusLabel).toContain("fallback model");
  });

  it("reports an interrupted stream as an error, not as an answer", async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse(
        toSse([
          { event: "delta", data: JSON.stringify({ text: "Partial" }) },
          {
            event: "error",
            data: JSON.stringify({
              error: "The reading lens answer was interrupted. Please try again.",
              code: "stream_interrupted",
            }),
          },
        ]),
      ),
    );
    const view = renderHook(() => useReadingLens({ selectedText: "Passage.", fetchImpl }));
    view.result.setConsentGranted(true);

    const outcome = await view.result.ask("keep reading");

    expect(outcome.reason).toBe(LENS_STATUS.error);
    expect(view.result.error).toContain("interrupted");
    const assistant = view.result.messages.find((message) => message.role === "assistant");
    expect(assistant.isError).toBe(true);
  });

  it("refuses to run when the server reports no consent", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ detail: "Explicit consent is required." }, { status: 403 }),
    );
    const view = renderHook(() => useReadingLens({ selectedText: "Passage.", fetchImpl }));
    view.result.setConsentGranted(true);

    const outcome = await view.result.ask("question");

    expect(outcome).toMatchObject({ ok: false, reason: LENS_STATUS.blocked });
    expect(view.result.status).toBe(LENS_STATUS.blocked);
    expect(view.result.messages.some((message) => message.isStreaming)).toBe(false);
  });

  it("surfaces an unconfigured lens service honestly", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ detail: "Reading lens is not configured on this server." }, { status: 503 }),
    );
    const view = renderHook(() => useReadingLens({ selectedText: "Passage.", fetchImpl }));
    view.result.setConsentGranted(true);

    await view.result.ask("question");

    expect(view.result.status).toBe(LENS_STATUS.error);
    expect(view.result.error).toContain("not configured");
  });

  it("only sends chapter text after the explicit opt-in toggle", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ text: "ok" }));
    const view = renderHook(() =>
      useReadingLens({
        selectedText: "Passage.",
        chapterTitle: "Loomings",
        chapterText: "Call me Ishmael.",
        fetchImpl,
      }),
    );
    view.result.setConsentGranted(true);
    expect(view.result.canIncludeChapterContext).toBe(true);

    await view.result.askAction("trivia");
    const withoutChapter = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(withoutChapter.passage).toBe("Passage.");

    view.result.setIncludeChapterContext(true);
    await view.result.askAction("trivia");
    const withChapter = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(withChapter.passage).toContain("Passage.");
    expect(withChapter.passage).toContain("[Chapter: Loomings]");
    expect(withChapter.passage).toContain("Call me Ishmael.");
  });

  it("refuses to send when there is no passage", async () => {
    const fetchImpl = vi.fn();
    const view = renderHook(() =>
      useReadingLens({ currentParagraphText: "   ", selectedText: "", fetchImpl }),
    );
    view.result.setConsentGranted(true);

    const outcome = await view.result.ask("what is this?");

    expect(outcome).toMatchObject({ ok: false, reason: LENS_STATUS.empty });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(view.result.status).toBe(LENS_STATUS.empty);
  });

  it("reports a server rate limit without keeping a fake answer", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "Rate limit reached." }, { status: 429 }));
    const view = renderHook(() =>
      useReadingLens({ selectedText: "Passage.", fetchImpl }),
    );
    view.result.setConsentGranted(true);

    const outcome = await view.result.ask("question");

    expect(outcome.reason).toBe(LENS_STATUS.rateLimited);
    expect(view.result.status).toBe(LENS_STATUS.rateLimited);
    expect(view.result.error).toContain("Rate limit");
    expect(view.result.messages.some((message) => message.isStreaming)).toBe(false);
  });

  it("surfaces provider failures honestly", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "Gemini API error" }, { status: 502 }));
    const view = renderHook(() =>
      useReadingLens({ selectedText: "Passage.", fetchImpl }),
    );
    view.result.setConsentGranted(true);

    await view.result.ask("question");

    expect(view.result.status).toBe(LENS_STATUS.error);
    expect(view.result.error).toBe("Gemini API error");
    const assistant = view.result.messages.find((message) => message.role === "assistant");
    expect(assistant.isError).toBe(true);
  });
});

describe("useReadingLens abort and stale selection", () => {
  it("aborts an in-flight request and drops the pending bubble", async () => {
    const fetchImpl = vi.fn(
      (url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(abortError()));
        }),
    );
    const view = renderHook(() =>
      useReadingLens({ selectedText: "Passage.", fetchImpl }),
    );
    view.result.setConsentGranted(true);
    const pending = view.result.ask("keep going");
    expect(view.result.isLoading).toBe(true);
    expect(view.result.messages.some((message) => message.isStreaming)).toBe(true);

    view.result.cancel();
    const outcome = await pending;

    expect(outcome).toMatchObject({ ok: false, reason: LENS_STATUS.aborted });
    expect(view.result.status).toBe(LENS_STATUS.aborted);
    expect(view.result.isLoading).toBe(false);
    expect(view.result.messages.some((message) => message.isStreaming)).toBe(false);
    expect(view.result.messages.some((message) => message.text.includes("keep going") && message.role === "user")).toBe(true);
  });

  it("discards an answer when the passage changes mid-request", async () => {
    let resolveFetch;
    const fetchImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const view = renderHook(
      (props) => useReadingLens({ selectedText: props.selectedText, fetchImpl }),
      { selectedText: "First passage." },
    );
    view.result.setConsentGranted(true);
    const pending = view.result.ask("first question");

    view.rerender({ selectedText: "Second passage." });
    resolveFetch(jsonResponse({ text: "Answer for the stale passage." }));
    const outcome = await pending;

    expect(outcome).toMatchObject({ ok: false, reason: LENS_STATUS.stale });
    expect(view.result.status).toBe(LENS_STATUS.stale);
    expect(
      view.result.messages.some((message) => message.text === "Answer for the stale passage."),
    ).toBe(false);
  });

  it("clears the transcript and stops pending work", async () => {
    const fetchImpl = vi.fn(
      (url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(abortError()));
        }),
    );
    const view = renderHook(() =>
      useReadingLens({ selectedText: "Passage.", fetchImpl }),
    );
    view.result.setConsentGranted(true);
    const pending = view.result.ask("question");
    view.result.clear();
    await pending;

    expect(view.result.messages).toEqual([]);
    expect(view.result.status).toBe(LENS_STATUS.idle);
  });
});

describe("reading lens privacy contract", () => {
  it("keeps provider credentials and direct client SDKs out of the reader", () => {
    const source = readFileSync(new URL("./useReadingLens.js", import.meta.url), "utf8");
    expect(source).not.toMatch(/@google\/genai/);
    expect(source).not.toMatch(/GEMINI_API_KEY|VITE_GEMINI_API_KEY/);
    expect(source).not.toMatch(/import\.meta\.env/);
    expect(source).toContain('LENS_ENDPOINT = "/api/reading-lens"');
  });
});
