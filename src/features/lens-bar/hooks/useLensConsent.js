import { useCallback, useEffect, useRef, useState } from 'react';

export const LENS_CONSENT_CHOICES = ['once', 'always', 'local'];

/**
 * Consent adapter over the reader's single shared Reading Lens instance.
 *
 * The underlying hook stores one boolean, so "send once" is that boolean
 * granted for a single request and then revoked, and "keep local" never grants
 * it. The decision is session scoped, which is the existing hook's own
 * behaviour: nothing is written to storage, so a reload starts local again.
 */
export function useLensConsent({ lens }) {
  const [choice, setChoice] = useState(null);
  const pendingRef = useRef([]);

  const settle = useCallback((value) => {
    const waiting = pendingRef.current;
    pendingRef.current = [];
    for (const resolve of waiting) resolve(value);
  }, []);

  useEffect(() => () => settle(false), [settle]);

  const choose = useCallback(
    (next) => {
      if (!LENS_CONSENT_CHOICES.includes(next)) return;
      setChoice(next);
      lens?.setConsentGranted?.(next !== 'local');
      settle(next !== 'local');
    },
    [lens, settle],
  );

  /** Called after a "once" request finishes so consent does not outlive it. */
  const consumeOnce = useCallback(() => {
    setChoice((current) => {
      if (current === 'once') lens?.setConsentGranted?.(false);
      return current === 'once' ? 'local' : current;
    });
  }, [lens]);

  const ensure = useCallback(() => {
    if (choice === 'always') return Promise.resolve(true);
    if (choice === 'once') return Promise.resolve(true);
    if (choice === 'local') return Promise.resolve(false);
    return new Promise((resolve) => {
      pendingRef.current.push(resolve);
    });
  }, [choice]);

  const allowed = useCallback(() => choice === 'always', [choice]);

  return {
    choice,
    needsDecision: choice === null,
    choose,
    consumeOnce,
    ensure,
    allowed,
  };
}
