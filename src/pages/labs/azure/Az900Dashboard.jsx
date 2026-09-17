import React from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, Clock, BarChart2, ChevronRight, BookOpen, Target, Zap, TrendingUp, Award, Play, Server, Layers, ShieldCheck } from "lucide-react";
import CloudConceptsCanvas from "@/components/labs/azure/CloudConceptsCanvas";

const AZURE = "#0078D4";
const AZURE_LIGHT = "#50A0E0";
const AZURE_DARK = "#005A9E";

const DOMAINS = [
  {
    num: 1,
    title: "Cloud Concepts",
    path: "/labs/az900-domain1",
    difficulty: "Beginner",
    duration: 40,
    topics: ["Deployment Models", "IaaS/PaaS/SaaS", "Cloud Benefits", "Pricing & TCO"],
    icon: Cloud,
    color: AZURE,
  },
  {
    num: 2,
    title: "Azure Core Services",
    path: "/labs/az900-domain2",
    difficulty: "Beginner",
    duration: 50,
    topics: ["Virtual Machines", "VNet", "Storage", "SQL", "App Service", "AKS"],
    icon: Server,
    color: AZURE_LIGHT,
  },
  {
    num: 3,
    title: "Architecture & Solutions",
    path: "/labs/az900-domain3",
    difficulty: "Intermediate",
    duration: 50,
    topics: ["Regions & Zones", "Load Balancing", "VNet Peering", "DR & Backup"],
    icon: Layers,
    color: AZURE_DARK,
  },
  {
    num: 4,
    title: "Management & Governance",
    path: "/labs/az900-domain4",
    difficulty: "Intermediate",
    duration: 55,
    topics: ["Cost Management", "RBAC", "Policy", "Monitoring", "ARM"],
    icon: TrendingUp,
    color: AZURE,
  },
  {
    num: 5,
    title: "Security & Compliance",
    path: "/labs/az900-domain5",
    difficulty: "Intermediate",
    duration: 55,
    topics: ["Defender for Cloud", "Entra ID", "NSGs", "Key Vault", "Compliance"],
    icon: ShieldCheck,
    color: AZURE_LIGHT,
  },
];

const diffStyle = {
  Beginner: "text-green-400 border-green-600/50 bg-green-900/20",
  Intermediate: "text-yellow-400 border-yellow-600/50 bg-yellow-900/20",
  Advanced: "text-orange-400 border-orange-600/50 bg-orange-900/20",
};

function StatWidget({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-3 card-3d">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold text-white font-mono leading-tight">{value}</div>
        <div className="text-[10px] text-gray-500 uppercase font-mono">{label}</div>
      </div>
    </div>
  );
}

function DomainWidget({ domain, onStart }) {
  const Icon = domain.icon;
  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-blue-600/50 transition-all cursor-pointer card-3d-hover group"
      style={{ borderTopColor: domain.color, borderTopWidth: 2 }}
      onClick={() => onStart(domain.path)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${domain.color}22`, border: `1px solid ${domain.color}55` }}>
            <Icon className="h-4.5 w-4.5" style={{ color: domain.color }} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-500">DOMAIN {domain.num}</div>
            <div className="text-sm font-bold text-white leading-tight">{domain.title}</div>
          </div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono font-semibold ${diffStyle[domain.difficulty]}`}>
          {domain.difficulty}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {domain.topics.map(t => (
          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono border border-gray-700">{t}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{domain.duration} min</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono font-bold" style={{ color: domain.color }}>
          <span>Start</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

export default function Az900Dashboard() {
  const navigate = useNavigate();
  const [canvasComplete, setCanvasComplete] = React.useState(false);

  const totalDuration = DOMAINS.reduce((sum, d) => sum + d.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20">
      {/* Azure blue header */}
      <div className="border-b border-gray-800 bg-black/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/InteractiveVirtualLabs")}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors"
              >
                ← Training Labs
              </button>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${AZURE}22`, border: `1px solid ${AZURE}55` }}>
                  <Cloud className="h-4.5 w-4.5" style={{ color: AZURE }} />
                </div>
                <div>
                  <div className="text-white font-mono font-bold text-sm leading-tight">AZ-900 Dashboard</div>
                  <div className="text-[10px] text-gray-500 font-mono">Microsoft Azure Fundamentals</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold text-blue-400 border-blue-600/50 bg-blue-900/20">
                AZ-900
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero banner */}
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${AZURE_DARK}, ${AZURE})` }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-white" />
              <span className="text-xs font-mono text-blue-100 uppercase">Certification Track</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Microsoft Azure Fundamentals (AZ-900)</h1>
            <p className="text-sm text-blue-100 max-w-2xl">
              Master cloud concepts, Azure core services, architecture, governance, and security through interactive
              GUI-based labs with Azure Portal simulations, dashboards, and drag-and-drop exercises.
            </p>
          </div>
        </div>

        {/* Stat widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatWidget icon={BookOpen} label="Domains" value="5" color={AZURE} />
          <StatWidget icon={Clock} label="Total Time" value={`${totalDuration}m`} color={AZURE_LIGHT} />
          <StatWidget icon={Target} label="Lab Types" value="4" color={AZURE_DARK} />
          <StatWidget icon={Zap} label="Interactive" value="100%" color={AZURE} />
        </div>

        {/* Domain widgets */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4" style={{ color: AZURE }} />
            <h2 className="text-sm font-bold text-white font-mono">Certification Domains</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map(d => (
              <DomainWidget key={d.num} domain={d} onStart={(path) => navigate(path)} />
            ))}
          </div>
        </div>

        {/* Drag-and-drop canvas widget */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${AZURE}22`, border: `1px solid ${AZURE}55` }}>
                <Cloud className="h-4 w-4" style={{ color: AZURE }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Cloud Concepts Canvas</h2>
                <p className="text-[10px] text-gray-500 font-mono">Drag each concept to the correct category</p>
              </div>
            </div>
            {canvasComplete && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
                <Award className="h-3.5 w-3.5" /> Completed
              </span>
            )}
          </div>
          <CloudConceptsCanvas onComplete={() => setCanvasComplete(true)} />
        </div>

        {/* Quick start CTA */}
        <div className="flex justify-center pb-6">
          <button
            onClick={() => navigate("/labs/az900-domain1")}
            className="flex items-center gap-2 px-8 py-3 text-white rounded-xl font-mono font-bold text-sm transition-all shadow-lg hover:scale-105"
            style={{ backgroundColor: AZURE, boxShadow: `0 4px 12px rgba(0,120,212,0.3)` }}
          >
            <Play className="h-4 w-4" />
            Start Domain 1: Cloud Concepts
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}