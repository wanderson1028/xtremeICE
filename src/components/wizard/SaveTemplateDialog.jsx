import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bookmark, Loader2 } from "lucide-react";

const EMOJI_OPTIONS = ["📋", "🏢", "🏠", "🖥️", "🌐", "🏪", "🔒", "⚡", "🔧", "🛠️"];

export default function SaveTemplateDialog({ open, onClose, formData }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📋");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    // Strip project-specific fields, keep only design config
    const { name: _n, company_name: _c, status: _s, diagram_data: _d, eve_ng_script: _e, change_history: _h, ...templateFields } = formData;

    await base44.entities.NetworkTemplate.create({
      name: name.trim(),
      description: description.trim(),
      icon,
      category: "custom",
      template_data: JSON.stringify(templateFields),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setName("");
      setDescription("");
      setIcon("📋");
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" /> Save as Template
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Save the current network configuration as a reusable template for future designs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-sm">Template Name</Label>
            <Input
              placeholder="e.g. My Branch Office Config"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Description (optional)</Label>
            <Input
              placeholder="Brief description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 rounded-lg border text-lg flex items-center justify-center transition-all
                    ${icon === e ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/50"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "✓ Saved!" : <><Bookmark className="h-4 w-4" /> Save Template</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}