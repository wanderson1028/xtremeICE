import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import StudentOverviewStats from "../components/lab/student/StudentOverviewStats";
import StudentScenarioCard from "../components/lab/student/StudentScenarioCard";
import StudentProgressCharts from "../components/lab/student/StudentProgressCharts";
import TaskWorkspaceModal from "../components/lab/student/TaskWorkspaceModal";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTask, setActiveTask] = useState(null); // { task, taskProgress, attempt }
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

  const { data: allAttempts = [] } = useQuery({
    queryKey: ["my_attempts", user?.email],
    queryFn: () => base44.entities.LabAttempt.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["lab_scenarios_published"],
    queryFn: () => base44.entities.LabScenario.filter({ status: "published" }),
    enabled: !!user,
  });

  const { data: allTaskProgress = [] } = useQuery({
    queryKey: ["my_task_progress", user?.email],
    queryFn: () => base44.entities.TaskProgress.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["lab_tasks_all"],
    queryFn: () => base44.entities.LabTask.list("order"),
    enabled: !!user,
  });

  const invalidateProgress = () => {
    queryClient.invalidateQueries({ queryKey: ["my_task_progress", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["my_attempts", user?.email] });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <GraduationCap className="h-14 w-14 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Please log in to view your progress.</p>
        </div>
      </div>
    );
  }

  // Map latest attempt per scenario
  const latestAttemptByScenario = {};
  allAttempts.forEach(a => {
    if (!latestAttemptByScenario[a.scenario_id] || a.attempt_number > latestAttemptByScenario[a.scenario_id].attempt_number) {
      latestAttemptByScenario[a.scenario_id] = a;
    }
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Lab Progress</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.full_name || user.email}</p>
          </div>
        </div>

        {/* Overview Stats */}
        <StudentOverviewStats
          attempts={allAttempts}
          scenarios={scenarios}
          taskProgress={allTaskProgress}
        />

        {/* Charts */}
        {allAttempts.length > 0 && (
          <StudentProgressCharts
            attempts={allAttempts}
            scenarios={scenarios}
            taskProgress={allTaskProgress}
          />
        )}

        {/* Scenario Cards */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Assigned Scenarios</h2>
          {scenarios.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No scenarios assigned yet</p>
              <p className="text-sm mt-1">Check back later for assigned lab scenarios.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.map(scenario => {
                const scenarioTasks = allTasks.filter(t => t.scenario_id === scenario.id);
                return (
                  <StudentScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    attempt={latestAttemptByScenario[scenario.id] || null}
                    taskProgress={allTaskProgress.filter(tp => tp.scenario_id === scenario.id)}
                    allAttempts={allAttempts.filter(a => a.scenario_id === scenario.id)}
                    tasks={scenarioTasks}
                    onOpenTask={(task) => setActiveTask({
                      task,
                      taskProgress: allTaskProgress.find(tp => tp.task_id === task.id) || null,
                      attempt: latestAttemptByScenario[scenario.id] || null,
                    })}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Workspace Modal */}
      {activeTask && (
        <TaskWorkspaceModal
          task={activeTask.task}
          taskProgress={activeTask.taskProgress}
          attempt={activeTask.attempt}
          onClose={() => setActiveTask(null)}
          onProgressSaved={invalidateProgress}
        />
      )}
    </div>
  );
}