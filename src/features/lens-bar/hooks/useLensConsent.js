import { useRef, useState } from 'react';

export const LENS_CONSENT_CHOICES = ['once', 'always', 'local'];

export function useLensConsent({ lens }) {
  const [choice, setChoice] = useState(null);
  const onceRef = useRef(null);

  const choose = (next, passage) => {
    if (next !== null && !LENS_CONSENT_CHOICES.includes(next)) return;
    onceRef.current = next === 'once' ? String(passage || '').trim() : null;
    setChoice(next);
    lens?.setConsentGranted?.(next === 'always');
  };

  const take = (passage) => {
    if (onceRef.current !== null) {
      const permission = passage.trim() === onceRef.current ? 'once' : 'local';
      onceRef.current = null;
      setChoice(null);
      return permission;
    }
    return choice === 'always' && lens?.consentGranted ? 'always' : 'local';
  };

  return {
    choice,
    needsDecision: choice === null || (choice === 'always' && !lens?.consentGranted),
    choose,
    take,
  };
}
