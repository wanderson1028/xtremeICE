import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Flame, Activity, Server, Cloud, DollarSign, Users, Clock,
  BookOpen, MessageSquare, Plus, TrendingUp, Zap, Shield,
  ArrowRight, Layers, Wifi, Monitor, HardDrive, Loader2
} from "lucide-react";
import AnimatedPage from "@/components/livefire/AnimatedPage";
import { CardSkeleton, StatCardSkeleton } from "@/components/livefire/LoadingSkeleton";

function StatCard({ icon: Icon, label, value, sub, color = "red", trend }) {
  const colors = {
    red: "from-red-600/20 to-red-800/10 border-red-700/30",
    blue: "from-blue-600/20 to-blue-800/10 border-blue-700/30",
    green: "from-green-600/20 to-green-800/10 border-green-700/30",
    yellow: "from-yellow-600/20 to-yellow-800/10 border-yellow-700/30",
    purple: "from-purple-600/20 to-purple-800/10 border-purple-700/30",
  };
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {sub && <p className="text-[10px] font-mono text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-black/30 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-gray-300" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className="h-3 w-3 text-green-400" />
          <span className="text-[10px] font-mono text-green-400">{trend}</span>
        </div>
      )}
    </motion.div>
  );
}

function ActivityItem({ icon: Icon, text, time, color = "gray" }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800/50 last:border-0">
      <div className={`h-7 w-7 rounded-lg bg-${color}-900/40 border border-${color}-700/30 flex items-center justify-center shrink-0`}>
        <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
        <p className="text-[10px] font-mono text-gray-600 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

export default function LiveFireDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  const { data: myLabs = [], isLoading: labsLoading } = useQuery({
    queryKey: ["livefire-labs", currentUser?.id],
    queryFn: () => base44.entities.LiveFireLab.list("-updated_date", 50),
    enabled: !!currentUser?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["livefire-templates"],
    queryFn: () => base44.entities.LiveFireTemplate.list("-updated_date", 20),
  });

  const { data: images = [] } = useQuery({
    queryKey: ["livefire-images"],
    queryFn: () => base44.entities.LiveFireImage.list("-updated_date", 20),
  });

  const activeLabs = myLabs.filter(l => l.status === "running" || l.status === "deploying");
  const runningDevices = activeLabs.reduce((sum, l) => sum + (l.device_count || 0), 0);
  const estCost = activeLabs.reduce((sum, l) => sum + (l.estimated_cost_hourly || 0), 0);
  const sharedLabs = myLabs.filter(l => l.visibility === "shared" || l.visibility === "public");
  const isLoading = labsLoading;

  const handleCreateLab = async () => {
    setCreating(true);
    try {
      const count = myLabs.length + 1;
      const newLab = await base44.entities.LiveFireLab.create({
        name: `New Lab ${count}`,
        cloud_provider: "aws",
        region: "us-west-2",
        category: "Custom",
        difficulty: "Intermediate",
        visibility: "private",
        status: "draft",
        topology_data: { devices: [], connections: [] },
        device_count: 0,
      });
      queryClient.invalidateQueries(["livefire-labs"]);
      navigate(`/lab-creation-wizard?lab=${newLab.id}`);
    } catch (err) {
      setCreating(false);
    }
  };

  const recentActivity = myLabs.slice(0, 8).map(l => ({
    icon: l.status === "running" ? Activity : l.status === "draft" ? BookOpen : Server,
    text: `${l.status === "running" ? "Lab running" : l.status === "draft" ? "Draft created" : "Lab updated"}: ${l.name}`,
    time: new Date(l.updated_date).toLocaleDateString(),
    color: l.status === "running" ? "green" : l.status === "draft" ? "yellow" : "blue",
  }));

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-orange-900/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-red-900/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Live Fire Dashboard</h1>
              <p className="text-sm text-gray-400 font-mono">Cloud-Native Cyber Range & Network Emulation</p>
            </div>
          </div>
          <button
            onClick={handleCreateLab}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:bg-red-800 disabled:cursor-wait text-white rounded-xl font-mono text-sm font-bold transition-colors shadow-lg shadow-red-900/30 min-w-[120px] justify-center"
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="h-4 w-4" /> New Lab</>
            )}
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard icon={Flame} label="Active Labs" value={activeLabs.length} sub={`${myLabs.length} total`} color="red" trend="+2 this week" />
              <StatCard icon={Server} label="Running Devices" value={runningDevices} sub="across all labs" color="blue" />
              <StatCard icon={Cloud} label="Cloud Utilization" value={`${Math.min(runningDevices * 5, 100)}%`} sub={`${runningDevices} instances`} color="purple" />
              <StatCard icon={DollarSign} label="Est. Cost/hr" value={`$${estCost.toFixed(2)}`} sub="USD" color="green" />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Labs Section */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-red-900/20">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-red-400" />
                  <h2 className="text-sm font-bold text-white">My Labs</h2>
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{myLabs.length}</span>
                </div>
                <Link to="/my-labs" className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-800/50">
                {labsLoading ? (
                  <div className="p-4 space-y-2">
                    <CardSkeleton /><CardSkeleton /><CardSkeleton />
                  </div>
                ) : myLabs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Flame className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs font-mono">No labs yet. Create your first lab.</p>
                  </div>
                ) : (
                  myLabs.slice(0, 5).map(lab => (
                    <motion.div
                      key={lab.id}
                      whileHover={{ backgroundColor: "rgba(127,29,29,0.05)", x: 3, transition: { duration: 0.15 } }}
                    >
                      <Link to={`/my-labs?lab=${lab.id}`} className="flex items-center justify-between px-5 py-3 transition-colors block">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${lab.status === "running" ? "bg-green-500 animate-pulse" : lab.status === "deploying" ? "bg-yellow-500 animate-pulse" : lab.status === "failed" ? "bg-red-500" : "bg-gray-600"}`} />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{lab.name}</p>
                            <p className="text-[10px] font-mono text-gray-500">{lab.category} · {lab.difficulty} · {lab.cloud_provider?.toUpperCase()}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                          lab.status === "running" ? "bg-green-900/30 text-green-400 border border-green-700/30" :
                          lab.status === "deploying" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30" :
                          lab.status === "failed" ? "bg-red-900/30 text-red-400 border border-red-700/30" :
                          "bg-gray-800 text-gray-500 border border-gray-700/30"
                        }`}>{lab.status}</span>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Shared Labs */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-red-900/20">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-white">Shared Labs</h2>
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{sharedLabs.length}</span>
                </div>
                <Link to="/shared-labs" className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-800/50">
                {sharedLabs.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="h-6 w-6 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs font-mono">No shared labs.</p>
                  </div>
                ) : (
                  sharedLabs.slice(0, 3).map(lab => (
                    <div key={lab.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        <div>
                          <p className="text-sm text-white">{lab.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{lab.visibility} · {lab.shared_with?.length || 0} members</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-900/20">
                <Clock className="h-4 w-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-white">Recent Activity</h2>
              </div>
              <div className="px-5 py-2">
                {recentActivity.length === 0 ? (
                  <div className="py-6 text-center">
                    <Clock className="h-6 w-6 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs font-mono">No recent activity.</p>
                  </div>
                ) : (
                  recentActivity.map((item, i) => (
                    <ActivityItem key={i} icon={item.icon} text={item.text} time={item.time} color={item.color} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "New Lab", icon: Plus, action: handleCreateLab, color: "red", loading: creating },
                  { label: "Templates", icon: BookOpen, path: "/lf-templates", color: "blue" },
                  { label: "Running Labs", icon: Activity, path: "/running-labs", color: "green" },
                  { label: "Images", icon: HardDrive, path: "/image-repository", color: "purple" },
                ].map((btn) => (
                  <motion.button
                    key={btn.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={btn.loading}
                    onClick={() => btn.action ? btn.action() : navigate(btn.path)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-${btn.color}-700/50 hover:bg-${btn.color}-950/20 transition-all text-center disabled:opacity-60`}
                  >
                    {btn.loading ? (
                      <Loader2 className={`h-5 w-5 text-${btn.color}-400 animate-spin`} />
                    ) : (
                      <btn.icon className={`h-5 w-5 text-${btn.color}-400`} />
                    )}
                    <span className="text-[10px] font-mono text-gray-300">{btn.loading ? "Creating..." : btn.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Lab Templates */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-red-900/20">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-white">Lab Templates</h2>
                </div>
                <Link to="/lf-templates" className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  Browse <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-800/50">
                {templates.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="h-6 w-6 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs font-mono">No templates yet.</p>
                  </div>
                ) : (
                  templates.slice(0, 4).map(t => (
                    <motion.div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-red-950/10 transition-colors cursor-pointer"
                      whileHover={{ x: 2, transition: { duration: 0.15 } }}>
                      <div>
                        <p className="text-sm text-white">{t.name}</p>
                        <p className="text-[10px] font-mono text-gray-500">{t.category} · {t.difficulty}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">{t.usage_count || 0} uses</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Team Collaboration */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-900/20">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Team Collaboration</h2>
              </div>
              <div className="p-5 text-center">
                <div className="h-12 w-12 rounded-full bg-purple-900/20 border border-purple-700/30 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs text-gray-400 mb-2">Real-time collaborative lab editing</p>
                <p className="text-[10px] font-mono text-gray-600 mb-4">Share a lab to enable collaboration</p>
                <Link
                  to="/shared-labs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-900/40 border border-purple-700/40 text-purple-300 hover:text-purple-200 rounded-lg text-[11px] font-mono transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Start Collaborating
                </Link>
              </div>
            </div>

            {/* Cloud Resources */}
            {isAdmin && (
              <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-red-900/20">
                  <div className="flex items-center gap-2.5">
                    <Cloud className="h-4 w-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Cloud Resources</h2>
                  </div>
                  <Link to="/cloud-resources" className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                    Manage <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-mono">AWS us-east-1</span>
                    <span className="text-green-400 font-mono">Active</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: "35%" }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>0 of 50 instances</span>
                    <span>0 of 100 vCPUs</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}