import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  "Basics",
  "Topology",
  "Security",
  "Services",
  "IP & Devices",
  "Config Scripts"
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? "hsl(199 89% 48%)"
                    : isCurrent
                    ? "hsl(199 89% 48% / 0.15)"
                    : "hsl(222 47% 14%)",
                }}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                  ${isCompleted ? "border-primary text-primary-foreground" : isCurrent ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
              </motion.div>
              <span className={`text-[10px] sm:text-xs font-medium hidden sm:block
                ${isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px w-6 sm:w-12 mb-4 sm:mb-5 transition-colors ${isCompleted ? "bg-primary" : "bg-border"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}