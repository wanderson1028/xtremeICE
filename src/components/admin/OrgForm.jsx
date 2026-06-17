import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Upload, Building2 } from "lucide-react";

export default function OrgForm({ org, onSaved, onCancel }) {
  const isEdit = !!org;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: org?.name || "",
    slug: org?.slug || "",
    logo_url: org?.logo_url || "",
    primary_color: org?.primary_color || "#0ea5e9",
    description: org?.description || "",
    contact_email: org?.contact_email || "",
    owner_email: org?.owner_email || "",
    status: org?.status || "active",
    plan: org?.plan || "free",
    max_users: org?.max_users ?? 0,
  });

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const autoSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.Organization.update(org.id, data)
        : base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onSaved();
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo_url", file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, max_users: Number(form.max_users) };
    if (!payload.slug && payload.name) payload.slug = autoSlug(payload.name);
    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "Edit Organization" : "New Organization"}
            </h2>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Organization Name *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!isEdit) set("slug", autoSlug(e.target.value));
              }}
              placeholder="Acme Corporation"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label>Slug (URL identifier)</Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", autoSlug(e.target.value))}
              placeholder="acme-corporation"
            />
          </div>

          {/* Logo */}
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-12 w-12 rounded-lg object-contain bg-secondary border border-border"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: form.primary_color }}
                >
                  {form.name.charAt(0)?.toUpperCase() || "O"}
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload Logo"}
                </div>
              </label>
              {form.logo_url && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => set("logo_url", "")}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Brand Color */}
          <div className="space-y-1.5">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => set("primary_color", e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent"
              />
              <span className="text-sm text-muted-foreground font-mono">{form.primary_color}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description of the organization"
            />
          </div>

          {/* Contact + Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder="contact@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Email</Label>
              <Input
                type="email"
                value={form.owner_email}
                onChange={(e) => set("owner_email", e.target.value)}
                placeholder="owner@acme.com"
              />
            </div>
          </div>

          {/* Plan + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Max Users */}
          <div className="space-y-1.5">
            <Label>Max Users (0 = unlimited)</Label>
            <Input
              type="number"
              min={0}
              value={form.max_users}
              onChange={(e) => set("max_users", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Organization"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}