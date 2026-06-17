import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Layers, Settings, FileText, Globe, Download, Network, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { name: "Lab Templates", icon: BookOpen, path: "/LabTemplates", desc: "Browse and manage reusable lab templates" },
  { name: "Lab Builder", icon: Layers, path: "/LabBuilder", desc: "Create new lab courses with a 5-step wizard" },
  { name: "Lab Instances", icon: Settings, path: "/LabInstances", desc: "Monitor and manage deployed lab sessions" },
  { name: "Environments", icon: Globe, path: "/LabEnvironments", desc: "Configure Kasm workspace environments" },
  { name: "Exports", icon: Download, path: "/LabExports", desc: "Export lab configurations and bundles" },
  { name: "NICE Mapping", icon: FileText, path: "/NiceMapping", desc: "Map labs to NICE Framework work roles" },
  { name: "Quick Build", icon: Zap, path: "/QuickBuild", desc: "AI-assisted rapid lab scenario generation" },
  { name: "Network Lab Designer", icon: Network, path: "/NetworkLabDesigner", desc: "Design network-based lab topologies" },
];

export default function LabBuilderDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Course Lab Builder</h1>
          <p className="text-gray-400">Build, manage, and deploy interactive cybersecurity lab courses aligned to the NICE Framework.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <Link key={mod.name} to={mod.path}>
              <Card className="bg-gray-900 border border-red-900/30 hover:border-red-500/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex flex-col gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-950/60 flex items-center justify-center">
                    <mod.icon className="h-5 w-5 text-red-400 group-hover:text-red-300 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{mod.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{mod.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}