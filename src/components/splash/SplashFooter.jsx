import React from "react";
import { ArrowUp } from "lucide-react";

export default function SplashFooter() {
  return (
    <div className="mt-11 flex justify-center">
      <button
        type="button"
        className="splash-ghost"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp strokeWidth={2} />
        Back to top
      </button>
    </div>
  );
}