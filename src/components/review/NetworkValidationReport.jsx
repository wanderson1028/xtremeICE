import React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const issueConfig = {
  error: {
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    badgeColor: "bg-destructive/20 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    badgeColor: "bg-yellow-500/20 text-yellow-600",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    badgeColor: "bg-blue-500/20 text-blue-600",
  },
};

function IssueGroup({ level, category, issues, expanded, onToggle }) {
  const config = issueConfig[level];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg overflow-hidden ${config.borderColor}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 ${config.bgColor} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className="font-semibold text-sm text-foreground">{category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}>
            {issues.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2 bg-card border-t border-border">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`h-1.5 w-1.5 rounded-full ${config.color} shrink-0 mt-1`}></span>
              <span className="text-muted-foreground leading-relaxed">{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkValidationReport({ validation, onClose, canExport }) {
  const [expandedGroups, setExpandedGroups] = React.useState(new Set());

  const toggleGroup = (key) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedGroups(newSet);
  };

  // Group issues by category and level
  const groupedIssues = {};
  const allItems = [...(validation.issues || []), ...(validation.warnings || []), ...(validation.info || [])];
  
  allItems.forEach((item) => {
    const key = `${item.level}-${item.category}`;
    if (!groupedIssues[key]) {
      groupedIssues[key] = {
        level: item.level,
        category: item.category,
        issues: [],
      };
    }
    groupedIssues[key].issues.push(item);
  });

  const sortOrder = { error: 0, warning: 1, info: 2 };
  const sortedGroups = Object.values(groupedIssues).sort(
    (a, b) => sortOrder[a.level] - sortOrder[b.level]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {validation.isValid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" /> Validation Passed
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" /> Validation Issues Found
                </>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {validation.summary.errorCount} error{validation.summary.errorCount !== 1 ? "s" : ""} •{" "}
              {validation.summary.warningCount} warning{validation.summary.warningCount !== 1 ? "s" : ""} •{" "}
              {validation.summary.infoCount} info
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3">
          {sortedGroups.map((group) => (
            <IssueGroup
              key={`${group.level}-${group.category}`}
              level={group.level}
              category={group.category}
              issues={group.issues}
              expanded={expandedGroups.has(`${group.level}-${group.category}`)}
              onToggle={() => toggleGroup(`${group.level}-${group.category}`)}
            />
          ))}

          {sortedGroups.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No issues found</p>
              <p className="text-xs text-muted-foreground mt-1">Your design is ready to export</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-secondary border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={onClose}
            disabled={!canExport}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {canExport ? "Proceed to Export" : "Fix Issues to Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}