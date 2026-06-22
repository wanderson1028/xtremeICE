import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Environment" },
  { id: 2, label: "Content" },
  { id: 3, label: "NICE Mapping" },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, idx) => {
        const isComplete = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                  isComplete
                    ? "bg-red-600 border-red-600 text-white"
                    : isActive
                    ? "bg-red-950/40 border-red-500 text-red-300"
                    : "bg-gray-900 border-gray-700 text-gray-500"
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : step.id + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-red-300" : isComplete ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-px w-8 sm:w-16 ${
                  step.id < currentStep ? "bg-red-600" : "bg-gray-700"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}