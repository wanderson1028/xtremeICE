import React from "react";
import { ArrowUp } from "lucide-react";

export default function SplashFooter() {
  return (
    <div className="mt-12 flex justify-center">
      <button
        type="button"
        className="splash-ghost"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp className="h-4 w-4" />
        Back to top
      </button>
    </div>
  );
}