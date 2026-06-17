import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight, Trash2 } from "lucide-react";
import LabStatusBadge from "./LabStatusBadge";

const DIFF_COLORS = {
  Beginner:     "bg-green-900/40 text-green-300",
  Intermediate: "bg-blue-900/40 text-blue-300",
  Advanced:     "bg-orange-900/40 text-orange-300",
  Expert:       "bg-red-900/40 text-red-300",
};

export default function LabCard({ template, onDelete }) {
  return (
    <Card className="bg-gray-900 border border-red-900/20 hover:border-red-900/50 transition-all h-full">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-sm leading-snug">{template.title}</h3>
          <LabStatusBadge status={template.status} />
        </div>
        {template.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2 flex-1">{template.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {template.nice_category && (
            <Badge className="bg-red-950/60 text-red-300 text-xs border-0">{template.nice_category}</Badge>
          )}
          <Badge className={`text-xs border-0 ${DIFF_COLORS[template.difficulty] || DIFF_COLORS.Beginner}`}>
            {template.difficulty}
          </Badge>
          {template.estimated_duration_minutes > 0 && (
            <Badge className="bg-gray-800 text-gray-300 text-xs border-0 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />{template.estimated_duration_minutes}m
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <Link to={`/LabBuilder?id=${template.id}`} className="flex-1">
            <Button size="sm" className="w-full bg-red-900/40 hover:bg-red-800/60 text-red-200 border-0 text-xs">
              Edit <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
          {onDelete && (
            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-red-400 px-2"
              onClick={() => onDelete(template.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}