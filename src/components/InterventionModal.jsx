import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './intervention.css';

export function InterventionModal({ onDismiss, bookTitle }) {
  return (
    <motion.div 
      className="intervention-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="intervention-card"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: -10, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <button className="intervention-close" onClick={onDismiss}>
          <X size={20} />
        </button>
        <div className="intervention-header">
          <Sparkles size={20} className="intervention-icon" />
          <span>Before you go...</span>
        </div>
        
        <div className="intervention-body">
          <p className="intervention-hook">
            You're just 3 pages away from the moment where everything in <i>{bookTitle || 'this chapter'}</i> flips on its head.
          </p>
          <div className="curiosity-gap">
            <p>Will the protagonist make the impossible choice, or repeat the fatal mistake?</p>
          </div>
          <p className="loss-aversion">
            If you leave now, your flow state might take 23 minutes to rebuild when you return.
          </p>
        </div>
        
        <div className="intervention-actions">
          <button className="btn-stay" onClick={onDismiss}>
            Keep Reading (Reveal the twist) <ArrowRight size={16} />
          </button>
          <button className="btn-leave" onClick={onDismiss}>
            I'll stop here for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
