import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import UserDashboard from "@/components/hub/UserDashboard";
import PlatformNarrative from "@/components/hub/PlatformNarrative";
import LabLeaderboard from "@/components/labs/LabLeaderboard";
import { useTranslation } from "react-i18next";

export default function EnvironmentHub() {
  const { t } = useTranslation();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-services", currentUser?.email],
    queryFn: () => base44.entities.UserService.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const isAdmin = currentUser?.role === "admin";
  const assignedKeys = assignments.map((a) => a.service_key);

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-red-900/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[300px] bg-red-950/10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 pb-6 border-b border-red-900/30"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("hub.welcome")}{currentUser?.full_name ? `, ${currentUser.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-gray-400 text-sm">
            {isAdmin ? t("hub.admin_subtitle") : t("hub.user_subtitle")}
          </p>
        </motion.div>

        {/* Platform narrative overview */}
        <PlatformNarrative assignedKeys={assignedKeys} isAdmin={isAdmin} />

        {/* Leaderboard */}
        <div className="mb-8">
          <LabLeaderboard />
        </div>

        {/* Personal dashboard — always shown */}
        {currentUser?.email && (
          <UserDashboard
            userEmail={currentUser.email}
            assignedKeys={assignedKeys}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}