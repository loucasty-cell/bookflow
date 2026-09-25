import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './capsule.css';

export function VariableRewardCapsule({ chapterTitle }) {
  const [show, setShow] = useState(false);
  const reduceMotion = useReducedMotion();

  const teaser = "In the next chapter, the cognitive load theory will finally meet its match in the chaotic reality of modern web design.";
  const serendipity = "This chapter's pacing echoes the deliberate staccato of a Chopin nocturne—a pause before the crescendo.";

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), reduceMotion ? 0 : 800);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="variable-reward-capsule"
          initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.95 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="capsule-header">
            <Sparkles size={16} aria-hidden="true" />
            <span>Chapter Complete: {chapterTitle}</span>
          </div>
          
          <div className="capsule-content">
            <motion.div
              className="serendipitous-insight"
              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.3 }}
            >

              <p>"{serendipity}"</p>
            </motion.div>
            
            <motion.div
              className="flow-sparkline"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.5 }}
            >

              <span className="sparkline-label">Flow Velocity</span>
              <svg viewBox="0 0 100 20" className="sparkline-svg">
                <motion.path
                  d="M0 10 Q 10 5, 20 12 T 40 8 T 60 15 T 80 5 T 100 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={reduceMotion ? { pathLength: 1 } : { pathLength: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 1.5, ease: "easeInOut", delay: 0.8 }}
                />

              </svg>
            </motion.div>
            
            <motion.div
              className="horizon-teaser"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 1.1 }}
            >

              <ArrowRight size={14} className="teaser-icon" aria-hidden="true" />
              <p>{teaser}</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
