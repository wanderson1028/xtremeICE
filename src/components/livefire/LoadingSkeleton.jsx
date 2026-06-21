import React from "react";
import { motion } from "framer-motion";

const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 1.8, repeat: Infinity, ease: "linear" },
  },
};

function Block({ className = "" }) {
  return (
    <motion.div
      variants={shimmer}
      animate="animate"
      className={`rounded-lg bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-gray-900/80 border border-red-900/20 rounded-xl overflow-hidden p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Block className="h-4 w-3/5" />
          <Block className="h-3 w-2/5" />
        </div>
        <Block className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Block className="h-4 w-16 rounded" />
        <Block className="h-4 w-12 rounded" />
        <Block className="h-4 w-20 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
        <Block className="h-3 w-24" />
        <Block className="h-3 w-16" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gray-900/80 border border-red-900/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Block className="h-3 w-16" />
          <Block className="h-6 w-12" />
        </div>
        <Block className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}