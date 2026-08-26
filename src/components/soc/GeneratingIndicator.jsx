import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

const PHASES = [
  "Analyzing CVE details...",
  "Mapping MITRE ATT&CK tactics...",
  "Generating SIEM alerts...",
  "Building EDR detections...",
  "Compromising endpoints...",
  "Finalizing scenario...",
];

export default function GeneratingIndicator() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through phases every ~2.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIdx(prev => (prev + 1) % PHASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Animate progress toward ~92% (never reaching 100% until the backend returns)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        // Ease out — slows down as it approaches 92
        const remaining = 92 - prev;
        return prev + Math.max(0.5, remaining * 0.08);
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Animated progress bar with shimmer */}
      <div className="relative h-2 w-full bg-secondary/60 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: -50 }}
          animate={{ x: "calc(100% + 50px)" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Cycling phase text with pulsing icon */}
      <div className="flex items-center justify-center gap-2">
        <motion.span
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400/30" />
        </motion.span>
        <AnimatePresence mode="wait">
          <motion.span
            key={phaseIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-semibold text-primary"
          >
            {PHASES[phaseIdx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}