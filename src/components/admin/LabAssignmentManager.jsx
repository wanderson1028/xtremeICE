import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LAB_COURSES, VIRTUAL_LABS } from "@/lib/labCatalog";
import { SCENARIOS } from "@/components/soc/socData";
import { Info } from "lucide-react";

const SOC_TRAINING_ITEMS = SCENARIOS
  .filter(s => s.difficulty === "Beginner")
  .map(s => ({ id: s.id, label: s.name, meta: s.difficulty, type: "soc_scenario" }));

const SOC_ASSESSMENT_ITEMS = SCENARIOS
  .filter(s => s.difficulty !== "Beginner")
  .map(s => ({ id: s.id, label: s.name, meta: s.difficulty, type: "soc_scenario" }));

const STATIC_LAB_ITEMS = LAB_COURSES.map(l => ({
  id: l.id, label: l.title, meta: l.difficulty, type: "lab_course",
}));

const VIRTUAL_LAB_ITEMS = VIRTUAL_LABS.map(l => ({
  id: l.id, label: l.title, meta: l.difficulty, type: "virtual_lab",
}));

const SECTION_CONFIG = {
  soc_training:    { label: "SOC Training Scenarios",      color: "text-green-400" },
  soc_assessments: { label: "SOC Assessment Scenarios",    color: "text-orange-400" },
  lab_scenarios:   { label: "Lab Courses & Virtual Labs",  color: "text-violet-400" },
};

export default function LabAssignmentManager({ user, enabledServiceKeys }) {
  const qc = useQueryClient();

  const { data: labAssignments = [] } = useQuery({
    queryKey: ["lab-assignments-admin", user.email],
    queryFn: () => base44.entities.UserLabAssignment.filter({ user_email: user.email }),
  });

  const { data: dbScenarios = [] } = useQuery({
    queryKey: ["lab-scenarios-catalog"],
    queryFn: () => base44.entities.LabScenario.filter({ status: "published" }),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.UserLabAssignment.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-assignments-admin", user.email] }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.UserLabAssignment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-assignments-admin", user.email] }),
  });

  const getAssignment = (labId, serviceKey) =>
    labAssignments.find(a => a.lab_id === labId && a.service_key === serviceKey);

  const handleToggle = (item, serviceKey, isOn) => {
    if (isOn) {
      assignMutation.mutate({
        user_email: user.email,
        lab_id: item.id,
        lab_type: item.type,
        service_key: serviceKey,
      });
    } else {
      const existing = getAssignment(item.id, serviceKey);
      if (existing) revokeMutation.mutate(existing.id);
    }
  };

  const getItemsForService = (serviceKey) => {
    if (serviceKey === "soc_training") return SOC_TRAINING_ITEMS;
    if (serviceKey === "soc_assessments") return SOC_ASSESSMENT_ITEMS;
    if (serviceKey === "lab_scenarios") {
      const dbItems = dbScenarios.map(s => ({
        id: s.id, label: s.title, meta: s.difficulty, type: "lab_course",
      }));
      return [...STATIC_LAB_ITEMS, ...VIRTUAL_LAB_ITEMS, ...dbItems];
    }
    return [];
  };

  const trainableServices = enabledServiceKeys.filter(k => SECTION_CONFIG[k]);

  if (trainableServices.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        Enable a training service for this user to manage lab assignments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          If no labs are checked for a section, the user sees <strong>all</strong> available items in that section.
          Checking specific labs restricts access to only those items.
        </span>
      </div>

      {trainableServices.map(serviceKey => {
        const config = SECTION_CONFIG[serviceKey];
        const items = getItemsForService(serviceKey);
        const sectionCount = labAssignments.filter(a => a.service_key === serviceKey).length;

        return (
          <div key={serviceKey}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
              <span className="text-xs text-gray-500">
                {sectionCount === 0 ? "all access" : `${sectionCount}/${items.length} selected`}
              </span>
            </div>
            <div className="space-y-1.5">
              {items.map(item => {
                const isOn = !!getAssignment(item.id, serviceKey);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-800 hover:border-gray-600 bg-gray-900/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isOn}
                      onCheckedChange={(val) => handleToggle(item, serviceKey, !!val)}
                    />
                    <span className="flex-1 text-sm text-gray-200">{item.label}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{item.meta}</Badge>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}