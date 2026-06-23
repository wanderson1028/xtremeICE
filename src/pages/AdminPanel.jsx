import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrgList from "@/components/admin/OrgList";
import OrgForm from "@/components/admin/OrgForm";
import UserManager from "@/components/admin/UserManager";
import ServiceManager from "@/components/admin/ServiceManager";
import UserStats from "@/components/admin/UserStats";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, ShieldCheck, Crown, KeyRound, Flag, Database } from "lucide-react";
import FeatureFlagManager from "@/components/admin/FeatureFlagManager";
import NiceDatasetManager from "@/components/admin/NiceDatasetManager";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const isPlatformAdmin = currentUser?.role === "admin";
  const isOrgAdmin = currentUser?.org_role === "org_admin" && currentUser?.organization_id;

  // Guard: must be platform admin OR org admin
  if (!isPlatformAdmin && !isOrgAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800">Access Restricted</h2>
          <p className="text-gray-500">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  // Org admins are locked to their own org
  const lockedOrgId = isOrgAdmin && !isPlatformAdmin ? currentUser.organization_id : null;

  const handleEditOrg = (org) => {
    setEditingOrg(org);
    setShowOrgForm(true);
  };

  const handleManageUsers = (orgId) => {
    setSelectedOrgId(orgId);
    setActiveTab("users");
  };

  const handleOrgSaved = () => {
    setShowOrgForm(false);
    setEditingOrg(null);
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {isPlatformAdmin
                ? <ShieldCheck className="h-6 w-6 text-blue-600" />
                : <Crown className="h-6 w-6 text-yellow-500" />
              }
              {isPlatformAdmin ? "Platform Admin" : "Organization Admin"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isPlatformAdmin
                ? "Manage all organizations, users, and platform-wide settings."
                : "Manage your organization's users and settings."
              }
            </p>
          </div>
          {/* Only platform admins can create new orgs */}
          {isPlatformAdmin && activeTab === "organizations" && (
            <Button
              onClick={() => { setEditingOrg(null); setShowOrgForm(true); }}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          )}
        </div>

        {/* Org Form Modal */}
        {showOrgForm && (
          <OrgForm
            org={editingOrg}
            onSaved={handleOrgSaved}
            onCancel={() => { setShowOrgForm(false); setEditingOrg(null); }}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-200">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              <KeyRound className="h-4 w-4" />
              Features
            </TabsTrigger>
            {/* Org tab: platform admins see all orgs, org admins see only their org settings */}
            <TabsTrigger value="organizations" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              <Building2 className="h-4 w-4" />
              {isPlatformAdmin ? "Organizations" : "Org Settings"}
            </TabsTrigger>
            {isPlatformAdmin && (
              <TabsTrigger value="flags" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
                <Flag className="h-4 w-4" />
                Feature Flags
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="nice" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
                <Database className="h-4 w-4" />
                NICE Dataset
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-6">
            <UserStats users={allUsers} />
            <UserManager
              selectedOrgId={lockedOrgId || selectedOrgId}
              onOrgChange={isPlatformAdmin ? setSelectedOrgId : undefined}
              isPlatformAdmin={isPlatformAdmin}
              currentUser={currentUser}
            />
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <ServiceManager />
            </div>
          </TabsContent>

          {isPlatformAdmin && (
            <TabsContent value="flags" className="mt-4">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <FeatureFlagManager />
              </div>
            </TabsContent>
          )}

          {isPlatformAdmin && (
            <TabsContent value="nice" className="mt-4">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <NiceDatasetManager />
              </div>
            </TabsContent>
          )}

          <TabsContent value="organizations" className="mt-4">
            <OrgList
              onEdit={handleEditOrg}
              onManageUsers={handleManageUsers}
              isPlatformAdmin={isPlatformAdmin}
              lockedOrgId={lockedOrgId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}