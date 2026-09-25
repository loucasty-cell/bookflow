import { useRef } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useModalFocus } from '../shared/lib/index.js';
import './intervention.css';

export function InterventionModal({ onDismiss, bookTitle }) {
  const cardRef = useRef(null);
  const closeButtonRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useModalFocus({
    open: true,
    containerRef: cardRef,
    onClose: onDismiss,
    initialFocusRef: closeButtonRef,
  });

  return (
    <motion.div
      className="intervention-overlay"
      role="presentation"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        ref={cardRef}
        className="intervention-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intervention-title"
        tabIndex={-1}
        initial={reduceMotion ? false : { scale: 0.9, y: 20, opacity: 0 }}
        animate={reduceMotion ? { scale: 1, y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 1 } : { scale: 0.95, y: -10, opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeButtonRef} type="button" className="intervention-close" onClick={onDismiss} aria-label="Close reminder">
          <X size={20} aria-hidden="true" />
        </button>
        <div className="intervention-header">
          <Sparkles size={20} className="intervention-icon" aria-hidden="true" />
          <span id="intervention-title">Before you go...</span>
        </div>

        <div className="intervention-body">
          <p className="intervention-hook">
            You&apos;re just 3 pages away from the moment where everything in <i>{bookTitle || 'this chapter'}</i> flips on its head.
          </p>
          <div className="curiosity-gap">
            <p>Will the protagonist make the impossible choice, or repeat the fatal mistake?</p>
          </div>
          <p className="loss-aversion">
            If you leave now, your flow state might take 23 minutes to rebuild when you return.
          </p>
        </div>

        <div className="intervention-actions">
          <button type="button" className="btn-stay" onClick={onDismiss}>
            Keep Reading (Reveal the twist) <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="btn-leave" onClick={onDismiss}>
            I&apos;ll stop here for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
