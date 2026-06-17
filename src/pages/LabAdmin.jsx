import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import ScenarioManager from "../components/lab/ScenarioManager";
import TaskManager from "../components/lab/TaskManager";
import AttemptTracker from "../components/lab/AttemptTracker";
import LabAnalytics from "../components/lab/LabAnalytics";

export default function LabAdmin() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">Admin access is required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Lab Scenario Admin</h1>
          </div>
          <p className="text-muted-foreground">
            Manage NICE Framework lab scenarios, tasks, and track user progress.
          </p>
        </div>

        <Tabs defaultValue="scenarios">
          <TabsList className="mb-6 bg-secondary">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="attempts">Attempt Tracker</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios">
            <ScenarioManager
              onSelectScenario={setSelectedScenarioId}
              selectedScenarioId={selectedScenarioId}
            />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskManager selectedScenarioId={selectedScenarioId} />
          </TabsContent>

          <TabsContent value="attempts">
            <AttemptTracker />
          </TabsContent>

          <TabsContent value="analytics">
            <LabAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}