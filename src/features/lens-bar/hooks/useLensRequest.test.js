import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_CONTEXT,
  MAX_QUESTION,
  MODE_ACTIONS,
  buildLensCall,
  toLensStatus,
} from './useLensRequest.js';

describe('toLensStatus', () => {
  it('maps the running states to loading', () => {
    expect(toLensStatus('requesting')).toBe('loading');
    expect(toLensStatus('streaming')).toBe('loading');
  });

  it('maps a completed and a local answer to done', () => {
    expect(toLensStatus('complete')).toBe('done');
    expect(toLensStatus('local')).toBe('done');
  });

  it('maps an empty passage to needs-context', () => {
    expect(toLensStatus('empty')).toBe('needs-context');
  });

  it('maps the refusal and failure states to error', () => {
    expect(toLensStatus('error')).toBe('error');
    expect(toLensStatus('rate-limited')).toBe('error');
    expect(toLensStatus('blocked')).toBe('error');
  });

  it('maps everything else to idle', () => {
    for (const status of ['idle', 'stale', 'aborted', '', undefined, null, 'nonsense']) {
      expect(toLensStatus(status)).toBe('idle');
    }
  });
});

describe('buildLensCall', () => {
  it('maps chat.md modes onto the Reading Lens action vocabulary', () => {
    expect(MODE_ACTIONS.summarize).toBe('summarize');
    expect(MODE_ACTIONS.explain).toBe('explain');
    expect(MODE_ACTIONS.translate).toBe('translate');
    expect(MODE_ACTIONS.smart).toBeNull();
    expect(MODE_ACTIONS.ask).toBeNull();
    expect(MODE_ACTIONS.define).toBeNull();
  });

  it('declares no action for define, because none exists on the hook', () => {
    expect(MODE_ACTIONS).not.toHaveProperty('define.thanks');
    expect(MODE_ACTIONS.define).toBeNull();
  });

  it('passes the passage through, clamped to the context limit', () => {
    const { options } = buildLensCall({ mode: 'ask', question: 'why?', context: 'x'.repeat(MAX_CONTEXT + 500) });
    expect(options.passage).toHaveLength(MAX_CONTEXT);
  });

  it('passes the target language for translate', () => {
    const { options } = buildLensCall({ mode: 'translate', question: '', context: 'hi', language: 'Japanese' });
    expect(options.action).toBe('translate');
    expect(options.targetLang).toBe('Japanese');
  });

  it('defaults the target language rather than sending an empty one', () => {
    const { options } = buildLensCall({ mode: 'translate', question: '', context: 'hi' });
    expect(options.targetLang).toBe('English');
  });

  it('uses the typed question as the prompt when there is one', () => {
    const { prompt } = buildLensCall({ mode: 'ask', question: '  What changed?  ', context: 'x' });
    expect(prompt).toBe('What changed?');
  });

  it('falls back to a default prompt so smart and define never send an empty ask', () => {
    expect(buildLensCall({ mode: 'smart', question: '', context: 'x' }).prompt).not.toBe('');
    expect(buildLensCall({ mode: 'define', question: '', context: 'x' }).prompt).not.toBe('');
  });

  it('leaves the prompt empty for ask, which the caller gates on the input', () => {
    expect(buildLensCall({ mode: 'ask', question: '', context: 'x' }).prompt).toBe('');
  });

  it('caps a hostile question at the question limit', () => {
    const { prompt } = buildLensCall({ mode: 'ask', question: 'q'.repeat(MAX_QUESTION + 100), context: 'x' });
    expect(prompt).toHaveLength(MAX_QUESTION);
  });

  it('survives a fully hostile call payload', () => {
    const call = buildLensCall({ mode: 'nonsense', question: null, context: undefined, language: null });
    expect(call.options.passage).toBe('');
    expect(call.options.action).toBeNull();
    expect(call.options.targetLang).toBe('English');
  });

  it('treats a non-string context as empty rather than the word undefined', () => {
    expect(buildLensCall({ mode: 'ask', question: 'a', context: 42 }).options.passage).toBe('42');
    expect(buildLensCall({ mode: 'ask', question: 'a', context: {} }).options.passage).toBe('[object Object]');
  });
});

describe('the adapter never opens a second connection', () => {
  it('contains no fetch, EventSource or endpoint of its own', () => {
    const source = readFileSync(new URL('./useLensRequest.js', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/EventSource/);
    expect(source).not.toMatch(/reading-lens/);
    expect(source).toContain('lens.ask');
  });
});
