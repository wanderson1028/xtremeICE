import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Globe, MapPin } from "lucide-react";

export default function StepBasics({ data, onChange }) {
  const handleSiteNamesChange = (value) => {
    const names = value.split(",").map(s => s.trim());
    onChange({ site_names: names });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Basic Information</h2>
        <p className="text-muted-foreground mt-1">Tell us about your enterprise network</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <Building2 className="h-4 w-4 text-primary" /> Project Name
          </Label>
          <Input
            placeholder="e.g. Corporate HQ Network"
            value={data.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            className="bg-secondary border-border focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <Globe className="h-4 w-4 text-primary" /> Company Name
          </Label>
          <Input
            placeholder="e.g. Acme Corp"
            value={data.company_name || ""}
            onChange={(e) => onChange({ company_name: e.target.value })}
            className="bg-secondary border-border focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Number of Sites
          </Label>
          <Input
            type="number"
            min={1}
            max={20}
            placeholder="e.g. 3"
            value={data.num_sites || ""}
            onChange={(e) => onChange({ num_sites: parseInt(e.target.value) || 0 })}
            className="bg-secondary border-border focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Site Names
          </Label>
          <Input
            placeholder="HQ, Branch-1, Branch-2 (comma-separated)"
            value={(data.site_names || []).join(", ")}
            onChange={(e) => handleSiteNamesChange(e.target.value)}
            className="bg-secondary border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">Separate multiple sites with commas</p>
        </div>
      </div>
    </div>
  );
}