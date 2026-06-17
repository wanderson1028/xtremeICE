import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";

export default function Step2Environment({ form, updateForm }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["environment-profiles"],
    queryFn: () => base44.entities.EnvironmentProfile.list(),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-white">Lab Environment</h2>
      <p className="text-gray-400 text-sm">Select the Kasm workspace image for this lab. <span className="text-gray-500">(Optional)</span></p>

      {isLoading && <p className="text-gray-500 text-sm animate-pulse">Loading environments...</p>}

      {!isLoading && profiles.length === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">No environments configured yet.</p>
          <a href="/LabEnvironments" target="_blank" rel="noopener noreferrer"
            className="text-red-400 text-sm underline">Manage environments →</a>
        </div>
      )}

      <div className="space-y-2">
        {/* None option */}
        <div
          onClick={() => updateForm({ environment_profile_id: "" })}
          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
            !form.environment_profile_id ? "border-red-500 bg-red-950/20" : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${!form.environment_profile_id ? "border-red-400" : "border-gray-600"}`}>
            {!form.environment_profile_id && <div className="h-2 w-2 rounded-full bg-red-400" />}
          </div>
          <span className="text-gray-300 text-sm">No environment / configure later</span>
        </div>

        {profiles.map(p => (
          <div key={p.id}
            onClick={() => updateForm({ environment_profile_id: p.id })}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              form.environment_profile_id === p.id ? "border-red-500 bg-red-950/20" : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className={`h-4 w-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${form.environment_profile_id === p.id ? "border-red-400" : "border-gray-600"}`}>
              {form.environment_profile_id === p.id && <div className="h-2 w-2 rounded-full bg-red-400" />}
            </div>
            <div className="flex-1">
              <Label className="text-white font-medium cursor-pointer text-sm">{p.name}</Label>
              {p.description && <p className="text-gray-400 text-xs mt-0.5">{p.description}</p>}
              <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{p.cpu_cores || 2} vCPU</span>
                <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{p.memory_mb || 4096}MB</span>
                <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{p.storage_gb || 20}GB</span>
                <span>{p.os_type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}