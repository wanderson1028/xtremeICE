import React from "react";
import { Flame } from "lucide-react";

export default function LiveFire() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/3 left-1/3 w-[700px] h-[600px] bg-orange-900/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-red-900/8 rounded-full blur-3xl" />
      </div>
      <div className="text-center space-y-4 relative z-10">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center mx-auto shadow-lg">
          <Flame className="h-8 w-8 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">Live Fire</h1>
        <p className="text-muted-foreground text-lg">Coming soon</p>
      </div>
    </div>
  );
}