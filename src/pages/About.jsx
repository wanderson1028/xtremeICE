import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Network, Wrench, ScanLine, Shield, Crosshair, FlaskConical,
  GraduationCap, ArrowRight, Info, Layers, Users, Lock, BookOpen
} from "lucide-react";

const MODULES = [
  { icon: Wrench, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", title: "Network Design Wizard", desc: "Design enterprise network topologies with automated CLI script generation and visual editing." },
  { icon: ScanLine, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", title: "Visual Design Editor", desc: "Drag-and-drop canvas for building, annotating, and simulating network diagrams." },
  { icon: Shield, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", title: "Live Fire Cyber Range", desc: "Deploy real cloud-based labs with routers, firewalls, and servers across AWS, Azure, or GCP." },
  { icon: Crosshair, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "SOC Training", desc: "Interactive SOC analyst simulations with SIEM, EDR, and incident response scenarios." },
  { icon: FlaskConical, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", title: "SOC Assessments", desc: "Generate role-based candidate assessments and scorecards aligned to the NICE Framework." },
  { icon: GraduationCap, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20", title: "Interactive Virtual Labs", desc: "Hands-on labs for Linux, Windows, cryptography, forensics, SIEM, and more." },
];

const STEPS = [
  { icon: Users, title: "Get Assigned", desc: "Administrators assign you services (Training, Live Fire, Assessments) that unlock the relevant modules in your navigation." },
  { icon: Layers, title: "Pick a Module", desc: "Use the top navigation bar to jump between Design, Training, Collaboration, and Special Features based on your access." },
  { icon: BookOpen, title: "Learn by Doing", desc: "Launch interactive labs, build network designs, run SOC simulations, or deploy live cloud ranges — all from one workspace." },
];

export default function About() {
  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-red-950/15 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-red-900/20 border border-red-700/30 shadow-lg shadow-red-900/10 mx-auto mb-6">
              <Info className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">About Xtreme I.C.E.</h1>
            <p className="mt-2 text-sm font-semibold text-red-400 tracking-[0.15em] uppercase">
              Cybersecurity Training & Intelligence Platform
            </p>
          </div>

          {/* Purpose */}
          <section className="mt-10 p-6 rounded-xl bg-black/40 border border-red-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Purpose</h2>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Xtreme I.C.E. is an enterprise-grade cybersecurity training and live-fire range platform. It brings
              together network topology design, cloud-based lab orchestration, SOC analyst training, candidate
              assessments, and interactive virtual labs into a single multi-tenant workspace. Whether you are
              designing a secure network, running a red-vs-blue exercise, or assessing a candidate's incident
              response skills, the platform provides the tools to build, deploy, and evaluate — all aligned to the
              NICE Cybersecurity Framework.
            </p>
          </section>

          {/* How to use */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono">How to Use</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-black/40 border border-red-900/20 backdrop-blur-sm text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-white block">{s.title}</span>
                  <span className="text-xs text-gray-500 mt-1 block">{s.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Modules */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono">Core Modules</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-red-900/20 backdrop-blur-sm text-left hover:border-red-800/40 transition-all duration-200"
                >
                  <div className={`h-8 w-8 rounded-lg ${f.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${f.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white block">{f.title}</span>
                    <span className="text-xs text-gray-500">{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security note */}
          <section className="mt-10 p-6 rounded-xl bg-black/40 border border-red-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Access & Security</h2>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              The platform is multi-tenant with row-level security. Your navigation and available modules are
              determined by your assigned services and role. Administrators manage users, organizations, feature
              flags, and lab assignments from the Admin Panel.
            </p>
          </section>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 mt-10">
            <Link
              to="/EnvironmentHub"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm px-10 py-4 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-red-800/40 hover:-translate-y-0.5"
            >
              Enter Platform
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}