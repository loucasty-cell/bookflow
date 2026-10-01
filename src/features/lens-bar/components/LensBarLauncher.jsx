import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useLensBarStore } from '../store/lensBarStore.js';

export function LensBarLauncher() {
  const setOpen = useLensBarStore((state) => state.setOpen);
  const setCollapsed = useLensBarStore((state) => state.setCollapsed);

  return (
    <button
      type="button"
      className="icon-button lens-bar-launcher"
      aria-label="Open assistant"
      aria-haspopup="dialog"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        setOpen(true);
        setCollapsed(false);
      }}
    >
      <MessageSquarePlus size={19} aria-hidden="true" />
    </button>
  );
}
