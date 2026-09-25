import { useState, useCallback, useRef } from "react";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Bookflow Reading Lens, a reading-only assistant.

Answer only from the passage provided by the user and the user's command with the highlighted, selected text area.
Use general knowledge or interesting facts about the related topic of the selected text if the users ask about it, and if there isn't anything interesting, find the info about it via the chatbot.

Support:
- summarize
- translate
- explain
- answer a short question about the passage

If the passage does not contain enough context, say so directly.
Be concise, calm, and useful. Return plain text or Markdown only.`;

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins

function checkLocalRateLimit() {
  try {
    const key = "bookflow:lens_quota";
    const now = Date.now();
    const records = JSON.parse(localStorage.getItem(key) || "[]").filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (records.length >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
    }
    records.push(now);
    localStorage.setItem(key, JSON.stringify(records));
    return { allowed: true, remaining: RATE_LIMIT_MAX - records.length };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }
}

export function useReadingLens({ currentParagraphText = "", selectedText = "" }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const abortControllerRef = useRef(null);

  const activePassage = (selectedText || currentParagraphText || "").trim();

  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    cancelQuery();
    setMessages([]);
    setError(null);
  }, [cancelQuery]);

  const askLens = useCallback(
    async (promptText, options = {}) => {
      const userPrompt = (promptText || "").trim();
      if (!userPrompt && !options.action) return;

      const passageContext = options.passage || activePassage;
      const effectivePrompt =
        options.action === "summarize"
          ? "Please provide a concise, insightful summary of this passage."
          : options.action === "explain"
          ? "Please explain the core concepts and meaning of this passage in clear, accessible terms."
          : options.action === "translate"
          ? `Please translate this passage accurately into ${options.targetLang || "Spanish"}.`
          : options.action === "trivia"
          ? "Share any fascinating historical, literary, or conceptual facts related to this passage."
          : userPrompt;

      const quota = checkLocalRateLimit();
      if (!quota.allowed) {
        setError("Rate limit reached (30 queries / 15m). Please wait a moment.");
        setIsExpanded(true);
        return;
      }

      setError(null);
      setIsLoading(true);
      setIsExpanded(true);

      const userMsg = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        text: effectivePrompt,
        passageSnippet: passageContext.slice(0, 140) + (passageContext.length > 140 ? "…" : ""),
      };

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantMsgId,
          role: "assistant",
          text: "",
          isStreaming: true,
        },
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let streamText = "";
        let usedDirectApi = false;

        // Try direct client SDK if API key is present in environment
        const apiKey =
          typeof process !== "undefined" && process.env?.GEMINI_API_KEY
            ? process.env.GEMINI_API_KEY
            : typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY
            ? import.meta.env.VITE_GEMINI_API_KEY
            : "";

        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const contents = [
              {
                role: "user",
                parts: [
                  {
                    text: `Context Passage:\n"""\n${passageContext}\n"""\n\nUser Request:\n${effectivePrompt}`,
                  },
                ],
              },
            ];

            const responseStream = await ai.models.generateContentStream({
              model: "gemini-2.5-flash",
              contents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
              },
            });

            for await (const chunk of responseStream) {
              if (controller.signal.aborted) break;
              const textChunk = chunk.text || "";
              streamText += textChunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, text: streamText, isStreaming: true }
                    : msg
                )
              );
            }
            usedDirectApi = true;
          } catch {
            usedDirectApi = false;
          }
        }

        // Fallback to backend proxy route /api/reading-lens
        if (!usedDirectApi && !controller.signal.aborted) {
          const res = await fetch("/api/reading-lens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: effectivePrompt,
              passage: passageContext,
              action: options.action,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error (${res.status})`);
          }

          if (res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              streamText += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, text: streamText, isStreaming: true }
                    : msg
                )
              );
            }
          } else {
            const data = await res.json();
            streamText = data.text || "No response received.";
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, text: streamText || "No response received.", isStreaming: false }
              : msg
          )
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to generate answer.");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    text: "Could not retrieve an answer at this time. Please try again.",
                    isStreaming: false,
                    isError: true,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [activePassage]
  );

  return {
    messages,
    isLoading,
    error,
    isExpanded,
    setIsExpanded,
    askLens,
    cancelQuery,
    clearMessages,
    activePassage,
  };
}
