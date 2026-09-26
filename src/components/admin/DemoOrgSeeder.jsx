import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Users, UserPlus, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { demoUserByEmail } from "@/components/ttx/demoUsers";

/**
 * Demo organizations & users derived from the TTX DEMO_PROFILES.
 * Seeding creates Organization records (visible under Admin > Organizations)
 * and invites demo users per org. User records cannot be created directly —
 * users join via invite, then are assigned to their org in the Users tab.
 */
const DEMO_ORGS = [
  {
    name: "Harborview Regional Bank",
    slug: "harborview-regional-bank-demo",
    description: "Demo organization — Financial Services (TTX sample). Fictional profile for demonstration only.",
    primary_color: "#1e40af",
    plan: "enterprise",
    status: "active",
    contact_email: "contact@harborview-regional-bank.example",
    owner_email: "ciso@harborview-regional-bank.example",
    users: [
      { full_name: "Sarah Chen", email: "sarah.chen@harborview-regional-bank.example", org_role: "org_admin" },
      { full_name: "Marcus Lee", email: "marcus.lee@harborview-regional-bank.example", org_role: "member" },
      { full_name: "Jennifer Park", email: "jennifer.park@harborview-regional-bank.example", org_role: "member" },
    ],
  },
  {
    name: "Piedmont Health Network",
    slug: "piedmont-health-network-demo",
    description: "Demo organization — Healthcare (TTX sample). Fictional profile for demonstration only.",
    primary_color: "#0d9488",
    plan: "enterprise",
    status: "active",
    contact_email: "contact@piedmont-health-network.example",
    owner_email: "ciso@piedmont-health-network.example",
    users: [
      { full_name: "David Kim", email: "david.kim@piedmont-health-network.example", org_role: "org_admin" },
      { full_name: "Lisa Morales", email: "lisa.morales@piedmont-health-network.example", org_role: "member" },
      { full_name: "Robert Johnson", email: "robert.johnson@piedmont-health-network.example", org_role: "member" },
    ],
  },
  {
    name: "Southeastern Precision Manufacturing",
    slug: "southeastern-precision-mfg-demo",
    description: "Demo organization — Manufacturing (TTX sample). Fictional profile for demonstration only.",
    primary_color: "#b45309",
    plan: "pro",
    status: "active",
    contact_email: "contact@southeastern-precision-mfg.example",
    owner_email: "plant.manager@southeastern-precision-mfg.example",
    users: [
      { full_name: "Thomas Weber", email: "thomas.weber@southeastern-precision-mfg.example", org_role: "org_admin" },
      { full_name: "Maria Garcia", email: "maria.garcia@southeastern-precision-mfg.example", org_role: "member" },
      { full_name: "James Brown", email: "james.brown@southeastern-precision-mfg.example", org_role: "member" },
    ],
  },
];

const roleBadge = {
  org_admin: "bg-yellow-100 text-yellow-700 border-yellow-300",
  member: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function DemoOrgSeeder() {
  const qc = useQueryClient();
  const [notice, setNotice] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [inviting, setInviting] = useState({}); // key -> bool
  const [emails, setEmails] = useState({}); // key -> overridden email

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const findDemoOrg = (slug) => orgs.find((o) => o.slug === slug);
  const emailFor = (org, u) => emails[`${org.slug}__${u.email}`] ?? u.email;
  const isAlreadyInvited = (email) => users.some((u) => u.email === email);

  const flash = (type, text) => setNotice({ type, text });

  const handleSeedOrgs = async () => {
    setSeeding(true);
    setNotice(null);
    let created = 0;
    let skipped = 0;
    try {
      for (const org of DEMO_ORGS) {
        if (findDemoOrg(org.slug)) {
          skipped++;
          continue;
        }
        await base44.entities.Organization.create({
          name: org.name,
          slug: org.slug,
          description: org.description,
          primary_color: org.primary_color,
          plan: org.plan,
          status: org.status,
          contact_email: org.contact_email,
          owner_email: org.owner_email,
          max_users: 0,
        });
        created++;
      }
      flash("success", `Seeded ${created} demo organization${created !== 1 ? "s" : ""}.${skipped ? ` ${skipped} already existed.` : ""}`);
      qc.invalidateQueries({ queryKey: ["organizations"] });
    } catch (e) {
      flash("error", e?.message || "Failed to seed demo organizations.");
    } finally {
      setSeeding(false);
    }
  };

  const handleInvite = async (org, u) => {
    const key = `${org.slug}__${u.email}`;
    const email = emailFor(org, u);
    setInviting((p) => ({ ...p, [key]: true }));
    try {
      await base44.users.inviteUser(email, "user");
      flash("success", `Invited ${u.full_name} (${email}). They'll appear under Users after they accept.`);
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (e) {
      flash("error", `Failed to invite ${email}: ${e?.message || "unknown error"}`);
    } finally {
      setInviting((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
    }
  };

  const handleInviteAll = async (org) => {
    for (const u of org.users) {
      // eslint-disable-next-line no-await-in-loop
      await handleInvite(org, u);
    }
  };

  const allOrgsSeeded = DEMO_ORGS.every((o) => findDemoOrg(o.slug));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Demo Organizations & Users</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Populate demo organizations derived from the TTX sample profiles. They appear under Admin &gt; Organizations. Demo users are added by invite — edit each email to a real address before sending.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {notice && (
          <div className={"flex items-start gap-2.5 rounded-xl border p-3.5 text-sm " + (notice.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800")}>
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Seed orgs action */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex-1 min-w-48">
            <p className="text-sm font-semibold text-indigo-950">Demo organizations</p>
            <p className="text-xs text-indigo-900/70 mt-0.5">
              {orgsLoading ? "Checking…" : allOrgsSeeded ? `All ${DEMO_ORGS.length} demo organizations already exist.` : `${DEMO_ORGS.filter((o) => !findDemoOrg(o.slug)).length} of ${DEMO_ORGS.length} not yet created.`}
            </p>
          </div>
          <Button onClick={handleSeedOrgs} disabled={seeding || orgsLoading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {allOrgsSeeded ? "Re-check Demo Organizations" : "Seed Demo Organizations"}
          </Button>
        </div>

        {/* Per-org user invite panels */}
        <div className="space-y-4">
          {DEMO_ORGS.map((org) => {
            const existing = findDemoOrg(org.slug);
            return (
              <div key={org.slug} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: org.primary_color }}>
                    {org.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.description}</p>
                  </div>
                  <Badge variant="outline" className={existing ? "bg-green-50 text-green-700 border-green-300" : "bg-gray-100 text-gray-500 border-gray-300"}>
                    {existing ? "Created" : "Not created"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={!existing}
                    onClick={() => handleInviteAll(org)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite All
                  </Button>
                </div>

                <div className="divide-y divide-gray-100">
                  {org.users.map((u) => {
                    const key = `${org.slug}__${u.email}`;
                    const email = emailFor(org, u);
                    const already = isAlreadyInvited(email);
                    const isInv = !!inviting[key];
                    return (
                      <div key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-40">
                          <div className="flex items-center gap-2">
                            <img src={demoUserByEmail(u.email)?.avatar_url} alt={u.full_name} className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 shrink-0"/>
                            <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                          </div>
                          <Badge variant="outline" className={roleBadge[u.org_role] + " mt-1 text-[10px]"}>
                            {u.org_role === "org_admin" ? "Org Admin" : "Member"}
                          </Badge>
                        </div>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmails((p) => ({ ...p, [key]: e.target.value }))}
                          className="flex-1 min-w-48 h-8 text-xs"
                          placeholder={u.email}
                        />
                        <div className="flex items-center gap-2">
                          {already ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Invited
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8"
                              disabled={isInv || !existing}
                              onClick={() => handleInvite(org, u)}
                            >
                              {isInv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                              Invite
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Invited users must accept their email invite before they appear under Users. After they join, assign each user to their organization and set the org role (Org Admin / Member) in the Users tab. Demo emails use a sample domain — replace with real addresses before inviting.
          </p>
        </div>
      </div>
    </div>
  );
}