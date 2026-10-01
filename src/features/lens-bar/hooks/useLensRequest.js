import { useCallback, useMemo } from 'react';
import { toPlain } from '../lib/plain.js';

export const MAX_CONTEXT = 6000;
export const MAX_QUESTION = 500;

const IDLE = { status: 'idle', text: '', source: 'local', trimmed: false };

/**
 * chat.md's mode vocabulary mapped onto the Reading Lens action vocabulary.
 * `define` has no native action, so it degrades to a custom prompt.
 */
export const MODE_ACTIONS = {
  smart: null,
  summarize: 'summarize',
  explain: 'explain',
  translate: 'translate',
  define: null,
  ask: null,
};

const DEFAULT_PROMPTS = {
  smart: 'Answer the reader question about this passage.',
  define: 'Define the key terms used in this passage.',
  ask: '',
};

const LENS_RUNNING = new Set(['requesting', 'streaming']);
const LENS_FAILED = new Set(['error', 'rate-limited', 'blocked']);

/** Pure, so the mapping can be tested without a hook or a DOM. */
export function toLensStatus(status) {
  if (LENS_RUNNING.has(status)) return 'loading';
  if (status === 'complete') return 'done';
  if (status === 'local') return 'done';
  if (status === 'empty') return 'needs-context';
  if (LENS_FAILED.has(status)) return 'error';
  return 'idle';
}

export function buildLensCall({ mode, question, context, language }) {
  const action = MODE_ACTIONS[mode] ?? null;
  const typed = String(question ?? '').trim().slice(0, MAX_QUESTION);
  const prompt = typed || DEFAULT_PROMPTS[mode] || '';
  return {
    prompt,
    options: {
      passage: String(context ?? '').slice(0, MAX_CONTEXT),
      action,
      targetLang: String(language || 'English'),
    },
  };
}

/**
 * A thin adapter over the reader's single shared useReadingLens instance.
 *
 * It never opens a second connection, never keeps a second answer buffer and
 * never writes anything: the text is read back out of the hook's own messages
 * so both the focus card and this bar show one conversation.
 */
export function useLensRequest({ lens }) {
  const latest = useMemo(() => {
    const messages = lens?.messages;
    if (!Array.isArray(messages)) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return messages[i];
    }
    return null;
  }, [lens?.messages]);

  const rawStatus = lens?.status;
  // A "done" state with no assistant message would render an empty answer under
  // a source label, so only a real message can complete the bar.
  const status = latest
    ? toLensStatus(rawStatus)
    : rawStatus === 'requesting' || rawStatus === 'streaming'
      ? 'loading'
      : 'idle';

  const trimmed = Boolean(latest?.passage && latest.passage.length >= MAX_CONTEXT);

  const send = useCallback(
    async ({ mode, question, context, language }) => {
      if (!lens?.ask) return { ok: false, reason: 'unavailable' };
      const { prompt, options } = buildLensCall({ mode, question, context, language });
      return lens.ask(prompt, options);
    },
    [lens],
  );

  const clear = useCallback(() => {
    lens?.clear?.();
  }, [lens]);

  const cancel = useCallback(() => {
    lens?.cancel?.();
  }, [lens]);

  return {
    status,
    text: toPlain(latest?.text),
    // Only claim a cloud source when a message positively says so. Anything
    // unknown is reported as local, because overstating egress is the one
    // mistake this label must never make.
    source: latest?.isLocal === false ? 'cloud' : 'local',
    trimmed,
    send,
    clear,
    cancel,
  };
}
