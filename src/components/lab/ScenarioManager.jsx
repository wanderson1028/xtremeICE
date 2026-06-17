import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, BookOpen, Clock, Star } from "lucide-react";
import ScenarioFormDialog from "./ScenarioFormDialog";

const NICE_CATEGORY_COLORS = {
  "Securely Provision": "bg-blue-500/20 text-blue-300",
  "Operate and Maintain": "bg-green-500/20 text-green-300",
  "Oversee and Govern": "bg-purple-500/20 text-purple-300",
  "Protect and Defend": "bg-red-500/20 text-red-300",
  "Analyze": "bg-yellow-500/20 text-yellow-300",
  "Collect and Operate": "bg-orange-500/20 text-orange-300",
  "Investigate": "bg-pink-500/20 text-pink-300",
};

const DIFFICULTY_COLORS = {
  Beginner: "bg-emerald-500/20 text-emerald-300",
  Intermediate: "bg-yellow-500/20 text-yellow-300",
  Advanced: "bg-orange-500/20 text-orange-300",
  Expert: "bg-red-500/20 text-red-300",
};

export default function ScenarioManager({ onSelectScenario, selectedScenarioId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const queryClient = useQueryClient();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["lab_scenarios"],
    queryFn: () => base44.entities.LabScenario.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LabScenario.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab_scenarios"] }),
  });

  const categories = ["all", ...Object.keys(NICE_CATEGORY_COLORS)];
  const filtered = filterCategory === "all" ? scenarios : scenarios.filter(s => s.nice_category === filterCategory);

  const handleEdit = (s) => { setEditingScenario(s); setDialogOpen(true); };
  const handleNew = () => { setEditingScenario(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <Button
              key={c}
              size="sm"
              variant={filterCategory === c ? "default" : "outline"}
              onClick={() => setFilterCategory(c)}
              className="text-xs"
            >
              {c === "all" ? "All Categories" : c}
            </Button>
          ))}
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Scenario
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No scenarios yet</p>
            <p className="text-sm">Create your first lab scenario to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(s => (
            <Card
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`bg-card border cursor-pointer transition-all hover:border-primary/50 ${selectedScenarioId === s.id ? "border-primary" : "border-border"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{s.title}</CardTitle>
                  <Badge className={`text-xs shrink-0 ${s.status === "published" ? "bg-green-500/20 text-green-300" : "bg-muted text-muted-foreground"}`}>
                    {s.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge className={`text-xs ${NICE_CATEGORY_COLORS[s.nice_category]}`}>{s.nice_category}</Badge>
                  <Badge className={`text-xs ${DIFFICULTY_COLORS[s.difficulty]}`}>{s.difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                {s.nice_work_role && <p className="text-xs text-primary/80 font-medium">{s.nice_work_role}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {s.estimated_duration_minutes && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.estimated_duration_minutes} min</span>
                  )}
                  {s.passing_score && (
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" />Pass: {s.passing_score}%</span>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(s); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScenarioFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        scenario={editingScenario}
      />
    </div>
  );
}