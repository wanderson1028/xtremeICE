import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Users, ShieldCheck, BookOpen, TrendingUp, Award } from "lucide-react";
import { format, subDays, parseISO, isAfter } from "date-fns";

const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const StatCard = ({ icon: IconComp, label, value, sub, color = "text-blue-600" }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3 shadow-sm">
    <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <IconComp className={`h-4 w-4 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-blue-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function UserStats({ users = [] }) {
  const { data: attempts = [] } = useQuery({
    queryKey: ["all-attempts"],
    queryFn: () => base44.entities.LabAttempt.list("-created_date", 500),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["user-services"],
    queryFn: () => base44.entities.UserService.list(),
  });

  const { data: socSessions = [] } = useQuery({
    queryKey: ["soc-sessions"],
    queryFn: () => base44.entities.SOCSession.list("-created_date", 500),
  });

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "admin").length;
    const activeRecently = users.filter((u) =>
      u.updated_date && isAfter(parseISO(u.updated_date), subDays(new Date(), 30))
    ).length;

    // Registrations per day (last 14 days)
    const regByDay = {};
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      regByDay[d] = 0;
    }
    users.forEach((u) => {
      if (!u.created_date) return;
      const d = format(parseISO(u.created_date), "MMM d");
      if (d in regByDay) regByDay[d]++;
    });
    const registrationsChart = Object.entries(regByDay).map(([date, count]) => ({ date, count }));

    // Role distribution
    const roleCounts = users.reduce((acc, u) => {
      const r = u.role || "user";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
    const roleChart = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));

    // Service assignment distribution
    const svcCounts = assignments.reduce((acc, a) => {
      acc[a.service_key] = (acc[a.service_key] || 0) + 1;
      return acc;
    }, {});
    const serviceLabels = {
      network_design_wizard: "Net Wizard",
      visual_design_editor: "Visual Editor",
      cyber_range: "Cyber Range",
      soc_training: "SOC Training",
      soc_assessments: "SOC Assess.",
      lab_scenarios: "Lab Scenarios",
    };
    const serviceChart = Object.entries(svcCounts).map(([key, count]) => ({
      name: serviceLabels[key] || key,
      count,
    }));

    // Lab completions per user (top 8)
    const completionByUser = {};
    attempts.forEach((a) => {
      if (a.status === "completed") {
        completionByUser[a.user_email] = (completionByUser[a.user_email] || 0) + 1;
      }
    });
    const topUsers = Object.entries(completionByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([email, completions]) => ({
        email: email.split("@")[0],
        completions,
      }));

    // Avg score across completed attempts
    const completed = attempts.filter((a) => a.status === "completed" && a.score != null);
    const avgScore = completed.length
      ? Math.round(completed.reduce((s, a) => s + a.score, 0) / completed.length)
      : null;

    const passRate = completed.length
      ? Math.round((completed.filter((a) => a.passed).length / completed.length) * 100)
      : null;

    // SOC sessions by mode
    const socByMode = socSessions.reduce((acc, s) => {
      acc[s.mode || "training"] = (acc[s.mode || "training"] || 0) + 1;
      return acc;
    }, {});
    const socChart = Object.entries(socByMode).map(([name, value]) => ({ name, value }));

    return {
      totalUsers, adminCount, activeRecently,
      registrationsChart, roleChart, serviceChart, topUsers,
      avgScore, passRate, totalAttempts: attempts.length,
      completedAttempts: completed.length, socChart,
    };
  }, [users, attempts, assignments, socSessions]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="text-blue-600" />
        <StatCard icon={ShieldCheck} label="Admins" value={stats.adminCount} color="text-purple-600" />
        <StatCard icon={TrendingUp} label="Active (30d)" value={stats.activeRecently} color="text-green-600" />
        <StatCard
          icon={Award}
          label="Avg Lab Score"
          value={stats.avgScore != null ? `${stats.avgScore}%` : "—"}
          sub={stats.passRate != null ? `${stats.passRate}% pass rate` : null}
          color="text-yellow-600"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registrations over time */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">New Registrations (14 days)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.registrationsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} labelStyle={{ color: "#374151" }} />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Role distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">Users by Role</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stats.roleChart} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                {stats.roleChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service assignments */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">Feature Assignments</p>
          {stats.serviceChart.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No features assigned yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.serviceChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} width={80} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top lab completions */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">Top Lab Completions (by user)</p>
          {stats.topUsers.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No lab completions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.topUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="email" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} />
                <Bar dataKey="completions" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SOC sessions */}
      {stats.socChart.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-3 pb-3 border-b border-gray-200">SOC Sessions by Mode</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.socChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lab attempt summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xl font-bold text-gray-900">{stats.totalAttempts}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Lab Attempts</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xl font-bold text-green-600">{stats.completedAttempts}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xl font-bold text-blue-600">{socSessions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">SOC Sessions Run</p>
        </div>
      </div>
    </div>
  );
}