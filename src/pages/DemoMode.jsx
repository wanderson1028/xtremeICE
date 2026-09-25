import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Activity, CheckCircle2, ChevronRight, CircleDot, Cloud, GraduationCap,
  Monitor, Play, RotateCcw, Router, Server, Shield, ShieldAlert, Terminal,
  Users, XCircle, Zap
} from "lucide-react";

const steps = [
  { id: "overview", label: "Range overview", icon: GraduationCap },
  { id: "topology", label: "Interactive topology", icon: Router },
  { id: "response", label: "SOC response", icon: ShieldAlert },
  { id: "results", label: "Readiness results", icon: Activity },
];

const devices = [
  { id: "learner", name: "Analyst Workstation", ip: "192.168.1.50", icon: Monitor, role: "Assigned learner console", detail: "The learner investigates alerts and runs approved commands from this workstation.", console: true, x: "8%", y: "48%" },
  { id: "firewall", name: "Edge Firewall", ip: "10.0.0.1", icon: Shield, role: "Traffic enforcement", detail: "Controls inbound and outbound traffic and records security events.", x: "34%", y: "16%" },
  { id: "server", name: "Business Server", ip: "192.168.1.20", icon: Server, role: "Protected business service", detail: "Hosts the fictional organization’s internal application and generated demo data.", x: "65%", y: "16%" },
  { id: "cloud", name: "Cloud Service", ip: "10.20.0.10", icon: Cloud, role: "Connected cloud workload", detail: "Represents cloud-hosted services included in the training scenario.", x: "65%", y: "70%" },
  { id: "attacker", name: "Threat Simulator", ip: "203.0.113.25", icon: Zap, role: "Controlled attack source", detail: "Produces safe, scripted activity for the learner to detect and contain.", x: "34%", y: "70%" },
];

export default function DemoMode() {
  const [active, setActive] = useState("overview");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [alertState, setAlertState] = useState("new");
  const [completed, setCompleted] = useState([]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = user?.role === "admin";
  const { data: assignments = [], isLoading: accessLoading } = useQuery({
    queryKey: ["demo-mode-access", user?.email],
    queryFn: () => base44.entities.UserService.filter({ user_email: user.email, service_key: "demo_mode" }),
    enabled: !!user?.email && !isAdmin,
    staleTime: 60_000,
  });

  const allowed = isAdmin || assignments.length > 0;
  const currentIndex = steps.findIndex((step) => step.id === active);
  const progress = Math.round(((completed.length + (completed.includes(active) ? 0 : 0.5)) / steps.length) * 100);
  const status = useMemo(() => alertState === "contained"
    ? { label: "Contained", tone: "text-emerald-300", icon: CheckCircle2 }
    : alertState === "investigating"
      ? { label: "Investigating", tone: "text-amber-300", icon: Activity }
      : { label: "New alert", tone: "text-red-300", icon: ShieldAlert }, [alertState]);

  const finishStep = (id, next) => {
    setCompleted((items) => items.includes(id) ? items : [...items, id]);
    if (next) setActive(next);
  };
  const reset = () => {
    setActive("overview");
    setSelectedDevice(null);
    setConsoleOpen(false);
    setAlertState("new");
    setCompleted([]);
  };

  if (userLoading || accessLoading) return <div className="min-h-[70vh] grid place-items-center bg-[#050914] text-cyan-300"><Activity className="h-8 w-8 animate-pulse" /></div>;
  if (!allowed) return <div className="min-h-[70vh] grid place-items-center bg-[#050914] p-6 text-white"><div className="max-w-md rounded-2xl border border-red-500/30 bg-slate-950 p-8 text-center"><Shield className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-4 text-2xl font-bold">Demo access required</h1><p className="mt-2 text-sm leading-6 text-slate-400">An administrator must assign the Xtreme I.C.E. Demo feature to your account.</p></div></div>;

  return <div className="min-h-screen bg-[#050914] text-white">
    <div className="border-b border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,.18),transparent_35%),linear-gradient(135deg,#07111f,#050914)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-cyan-300"><CircleDot className="h-4 w-4" /> Guided demonstration</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Xtreme I.C.E. Cyber Range</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">A controlled, fictional walkthrough of hands-on training, network visualization, threat response, and measurable workforce readiness.</p>
          </div>
          <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400 hover:text-white"><RotateCcw className="h-4 w-4" /> Reset demo</button>
        </div>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.max(12, progress)}%` }} /></div>
      </div>
    </div>

    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px,1fr]">
      <aside className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const done = completed.includes(step.id);
          return <button key={step.id} onClick={() => setActive(step.id)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active === step.id ? "border-cyan-400 bg-cyan-950/40 text-white" : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600"}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-cyan-300"}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
            <span><span className="block text-[10px] uppercase tracking-wider text-slate-500">Step {index + 1}</span><span className="text-sm font-semibold">{step.label}</span></span>
          </button>;
        })}
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-xs leading-5 text-slate-400"><b className="text-emerald-300">Demo-safe environment</b><br />This experience uses fictional data and does not change operational records.</div>
      </aside>

      <main className="min-w-0">
        {active === "overview" && <section className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-7"><div className="text-xs uppercase tracking-[.2em] text-cyan-300">The experience</div><h2 className="mt-2 text-3xl font-bold">Train. Simulate. Measure.</h2><p className="mt-3 max-w-3xl leading-7 text-slate-300">Xtreme I.C.E. places learners inside realistic cyber situations. They explore a visual network, work from an assigned device, respond to controlled threats, and receive evidence-based performance results.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[["Hands-on learning","Practice commands and decisions in a guided environment.",Terminal],["Realistic simulation","Observe attacker behavior and defensive controls in context.",ShieldAlert],["Measurable readiness","Translate learner actions into clear performance outcomes.",Activity]].map(([title,copy,Icon])=><div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><Icon className="h-7 w-7 text-cyan-300" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p></div>)}
          </div>
          <button onClick={() => finishStep("overview","topology")} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300"><Play className="h-4 w-4" /> Start interactive walkthrough</button>
        </section>}

        {active === "topology" && <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-cyan-300">Interactive topology</div><h2 className="mt-1 text-2xl font-bold">Select a device to understand its role</h2><p className="mt-2 text-sm text-slate-400">Only the assigned learner workstation can open a console. Other devices provide informational views.</p></div><div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">5 devices online</div></div>
            <div className="relative mt-6 h-[430px] overflow-hidden rounded-xl border border-slate-800 bg-[linear-gradient(rgba(30,41,59,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,.35)_1px,transparent_1px)] bg-[size:30px_30px]">
              <svg className="absolute inset-0 h-full w-full opacity-60"><line x1="16%" y1="55%" x2="42%" y2="23%" stroke="#22d3ee" strokeWidth="2"/><line x1="42%" y1="23%" x2="73%" y2="23%" stroke="#22d3ee" strokeWidth="2"/><line x1="42%" y1="23%" x2="42%" y2="77%" stroke="#f87171" strokeWidth="2" strokeDasharray="7 7"/><line x1="42%" y1="77%" x2="73%" y2="77%" stroke="#a78bfa" strokeWidth="2"/><line x1="73%" y1="23%" x2="73%" y2="77%" stroke="#22d3ee" strokeWidth="2"/></svg>
              {devices.map((device)=>{const Icon=device.icon;return <button key={device.id} onClick={()=>{setSelectedDevice(device);if(!device.console)setConsoleOpen(false)}} style={{left:device.x,top:device.y}} className={`absolute w-36 -translate-y-1/2 rounded-xl border p-3 text-left shadow-xl transition hover:-translate-y-[52%] ${selectedDevice?.id===device.id?"border-cyan-300 bg-cyan-950":"border-slate-700 bg-slate-950"}`}><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-cyan-300"/><span className="h-2 w-2 rounded-full bg-emerald-400"/></div><div className="mt-2 text-xs font-bold">{device.name}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{device.ip}</div></button>})}
            </div>
          </div>
          {selectedDevice && <div className="rounded-2xl border border-cyan-500/25 bg-slate-950 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-cyan-300">{selectedDevice.role}</div><h3 className="mt-1 text-xl font-bold">{selectedDevice.name}</h3><p className="mt-2 text-sm text-slate-400">{selectedDevice.detail}</p></div>{selectedDevice.console?<button onClick={()=>setConsoleOpen(true)} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 font-bold text-slate-950"><Terminal className="h-4 w-4"/> Enter console</button>:<span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">Information only</span>}</div></div>}
          {consoleOpen && <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-black"><div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400"><span>Analyst Console · 192.168.1.50</span><button onClick={()=>setConsoleOpen(false)}><XCircle className="h-4 w-4"/></button></div><div className="h-36 p-4 font-mono text-sm text-cyan-300">analyst@xtreme-demo:~$ <span className="animate-pulse">_</span><div className="mt-3 text-xs text-slate-500">Suggested command: netctl topology --status</div></div></div>}
          <button onClick={() => finishStep("topology","response")} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">Continue to SOC response <ChevronRight className="h-4 w-4"/></button>
        </section>}

        {active === "response" && <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6"><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-red-300">Live training scenario</div><h2 className="mt-1 text-2xl font-bold">Suspicious sign-in and lateral movement</h2></div>{React.createElement(status.icon,{className:`h-8 w-8 ${status.tone}`})}</div><p className="mt-3 text-sm leading-6 text-slate-400">A fictional user account authenticated from an unusual location and then attempted to reach a protected business server.</p></div>
          <div className="grid gap-4 md:grid-cols-3">{[["1. Review evidence","Compare identity, endpoint, and network signals.",alertState!=="new"],["2. Investigate","Determine whether the behavior is authorized.",alertState==="contained"],["3. Contain","Block the session and preserve evidence.",alertState==="contained"]].map(([title,copy,done])=><div key={title} className={`rounded-2xl border p-5 ${done?"border-emerald-500/30 bg-emerald-950/10":"border-slate-800 bg-slate-900/60"}`}><div className="flex items-center gap-2">{done?<CheckCircle2 className="h-5 w-5 text-emerald-300"/>:<CircleDot className="h-5 w-5 text-slate-500"/>}<h3 className="font-bold">{title}</h3></div><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p></div>)}</div>
          <div className="flex flex-wrap gap-3">{alertState==="new"&&<button onClick={()=>setAlertState("investigating")} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950">Begin investigation</button>}{alertState==="investigating"&&<button onClick={()=>setAlertState("contained")} className="rounded-xl bg-red-400 px-5 py-3 font-bold text-slate-950">Contain simulated threat</button>}{alertState==="contained"&&<button onClick={() => finishStep("response","results")} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950">View readiness results <ChevronRight className="h-4 w-4"/></button>}</div>
        </section>}

        {active === "results" && <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-7"><div className="flex items-center gap-3"><CheckCircle2 className="h-9 w-9 text-emerald-300"/><div><div className="text-xs uppercase tracking-wider text-emerald-300">Scenario complete</div><h2 className="text-2xl font-bold">Learner readiness summary</h2></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">The learner identified the suspicious activity, investigated the available evidence, and contained the simulated threat without affecting production systems.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["92%","Overall performance"],["4:18","Response time"],["100%","Required evidence reviewed"],["0","Critical steps missed"]].map(([value,label])=><div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="text-3xl font-black text-cyan-300">{value}</div><div className="mt-2 text-xs uppercase tracking-wider text-slate-500">{label}</div></div>)}</div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6"><h3 className="font-bold">Executive takeaway</h3><p className="mt-2 text-sm leading-6 text-slate-300">Xtreme I.C.E. provides leaders with a clear view of workforce readiness while giving learners practical experience in a safe, repeatable environment. Training can be aligned to certification objectives, job roles, and organization-specific scenarios.</p></div>
          <button onClick={()=>{finishStep("results");reset()}} className="flex items-center gap-2 rounded-xl border border-cyan-400 px-5 py-3 font-bold text-cyan-300 hover:bg-cyan-950/30"><RotateCcw className="h-4 w-4"/> Run demo again</button>
        </section>}
      </main>
    </div>
  </div>;
}
