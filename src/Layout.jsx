import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAccessFromKeys, ADMIN_ACCESS } from "@/lib/featureConfig";
import { useFeatureFlags, isFlagOn } from "@/hooks/useFeatureFlags";

const NAV_ACTIVE = "text-red-500 border-b-2 border-red-500 rounded-none";
const NAV_IDLE = "text-gray-200 hover:text-white hover:text-red-400";

function useNavAccess(currentUser) {
  const isAdmin = currentUser?.role === "admin";

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-services-nav", currentUser?.email],
    queryFn: () => base44.entities.UserService.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email && !isAdmin,
    staleTime: 60_000,
  });

  const { flags } = useFeatureFlags(isAdmin);

  if (isAdmin) return ADMIN_ACCESS;

  // Gate assigned service keys by feature flags
  const rawKeys = assignments.map((a) => a.service_key);
  const keys = rawKeys.filter((k) => isFlagOn(flags, k));
  return getAccessFromKeys(keys);
}

function DesignDropdown({ currentPageName, access }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = ["NetworkWizard", "ReviewDesign"].includes(currentPageName);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!access.hasDesign) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
      >
        <span>{t("nav.design")}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-gray-950 border border-red-900/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          <Link to={createPageUrl("NetworkWizard")} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors">
            {t("nav.newDesign")}
          </Link>
          <Link to={createPageUrl("ReviewDesign")} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors">
            {t("nav.reviewDesign")}
          </Link>
        </div>
      )}
    </div>
  );
}

function CollaborationDropdown({ currentPageName, access }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [liveFireOpen, setLiveFireOpen] = useState(false);
  const ref = useRef(null);
  const isActive = ["CyberEventBuilder", "LiveFire", "LiveFireDashboard", "MyLabs", "SharedLabs", "LFTemplates", "RunningLabs", "ImageRepository", "MarketplacePage", "CloudResources", "LFAdministration", "LabCreationWizard"].includes(currentPageName);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!access.hasCollaboration) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
      >
        <span>{t("nav.collaboration")}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-950 border border-red-900/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          <Link to={createPageUrl("CyberEventBuilder")} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors">
            {t("nav.redVsBlue")}
          </Link>
          <div className="border-t border-red-900/30" />
          <button
            onClick={() => setLiveFireOpen(v => !v)}
            className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors"
          >
            <span>{t("nav.liveFire")}</span>
            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${liveFireOpen ? "rotate-180" : ""}`} />
          </button>
          {liveFireOpen && (
            <>
              <Link to="/LiveFireDashboard" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Live Fire Dashboard
              </Link>
              <Link to="/my-labs" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                My Labs
              </Link>
              <Link to="/shared-labs" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Shared Labs
              </Link>
              <Link to="/lf-templates" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Templates
              </Link>
              <Link to="/running-labs" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Running Labs
              </Link>
              <Link to="/image-repository" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Image Repository
              </Link>
              <Link to="/marketplace" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Marketplace
              </Link>
              <Link to="/cloud-resources" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Cloud Resources
              </Link>
              <Link to="/lf-administration" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                Administration
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TrainingDropdown({ currentPageName, access }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [socOpen, setSocOpen] = useState(false);
  const ref = useRef(null);
  const isActive = ["Labs", "VirtualLabs", "SOCSimulation", "SOCTraining", "SOCAssessments", "InteractiveVirtualLabs", "LabCourses"].includes(currentPageName);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!access.hasTraining) return null;

  const showSocSub = access.hasSocTraining || access.hasSocAssessments;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
      >
        <span>{t("nav.training")}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-950 border border-red-900/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {access.hasLabScenarios && (
            <>
              <button
                onClick={() => setSimOpen(v => !v)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors"
              >
                <span>{t("nav.trainingSims")}</span>
                <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${simOpen ? "rotate-180" : ""}`} />
              </button>
              {simOpen && (
                <>
                  <Link to="/InteractiveVirtualLabs" onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                    Active Labs
                  </Link>

                </>
              )}
            </>
          )}
          {showSocSub && (
            <>
              {access.hasLabScenarios && <div className="border-t border-red-900/30" />}
              <button
                onClick={() => setSocOpen(v => !v)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors"
              >
                <span>{t("nav.socSimulations")}</span>
                <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${socOpen ? "rotate-180" : ""}`} />
              </button>
              {socOpen && (
                <>
                  {access.hasSocTraining && (
                    <Link to="/soc-training" onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                      {t("nav.socTraining")}
                    </Link>
                  )}
                  {access.hasSocAssessments && (
                    <Link to="/soc-assessments" onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 pl-8 pr-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-950/50 transition-colors">
                      {t("nav.socAssessments")}
                    </Link>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SpecialFeaturesDropdown({ currentPageName, access }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = ["LabBuilderDashboard", "LabTemplates", "LabBuilder", "LabInstances", "LabEnvironments", "LabExports", "NiceMapping", "QuickBuild", "NetworkLabDesigner"].includes(currentPageName);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!access.hasLabBuilder) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
      >
        <span>Special Features</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-950 border border-red-900/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          <Link to="/LabBuilderDashboard" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors">
            Course Lab Builder
          </Link>
          <div className="border-t border-red-900/30" />
          <Link to="/CandidateAssessments" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-red-950/50 transition-colors">
            Candidate Assessments
          </Link>
        </div>
      )}
    </div>
  );
}

function OrgBranding({ orgId }) {
  const { data: org } = useQuery({
    queryKey: ["org-brand", orgId],
    queryFn: () => base44.entities.Organization.filter({ id: orgId }).then(r => r[0]),
    enabled: !!orgId,
  });

  if (!org) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-border/50 bg-secondary/50">
      {org.logo_url ? (
        <img src={org.logo_url} alt={org.name} className="h-6 w-auto object-contain max-w-16" />
      ) : (
        <div className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: org.primary_color || "#0ea5e9" }}>
          {org.name.charAt(0)}
        </div>
      )}
      <span className="text-xs font-medium text-foreground hidden sm:inline">{org.name}</span>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const isEmbedded = new URLSearchParams(window.location.search).get("embedded") === "true";

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const access = useNavAccess(currentUser);

  const showDesignSep = access.hasDesign;
  const showCollabSep = access.hasCollaboration;
  const showTrainingSep = access.hasTraining;

  return (
    <div className="min-h-screen bg-background">
      <header className={`fixed top-0 left-0 right-0 z-50 border-b border-red-900/40 bg-gray-900/90 backdrop-blur-sm shadow-lg ${isEmbedded ? "hidden" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group pr-6 border-r border-red-900/40">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/6a3fbf99a_XtremeICED52aR00aP01ZL-Hoover.png"
                alt="Xtreme I.C.E. Logo"
                className="h-16 w-auto object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              />
              <span className="text-lg font-semibold tracking-tight text-white hidden sm:block">Xtreme I.C.E.</span>
            </Link>

            <nav className="flex items-center gap-0.5">
              {currentUser?.organization_id && (
                <OrgBranding orgId={currentUser.organization_id} />
              )}

              {/* Dashboard — always visible */}
              <Link
                to="/EnvironmentHub"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentPageName === "EnvironmentHub" ? NAV_ACTIVE : NAV_IDLE}`}
              >
                <span>{t("nav.dashboard")}</span>
              </Link>

              {showTrainingSep && <div className="h-5 w-px bg-red-800/50 mx-1" />}
              <TrainingDropdown currentPageName={currentPageName} access={access} />

              {showCollabSep && <div className="h-5 w-px bg-red-800/50 mx-1" />}
              <CollaborationDropdown currentPageName={currentPageName} access={access} />

              {showDesignSep && <div className="h-5 w-px bg-red-800/50 mx-1" />}
              <DesignDropdown currentPageName={currentPageName} access={access} />

              {access.hasLabBuilder && <div className="h-5 w-px bg-red-800/50 mx-1" />}
              <SpecialFeaturesDropdown currentPageName={currentPageName} access={access} />

              {/* Admin link */}
              {(currentUser?.role === "admin" || currentUser?.org_role === "org_admin") && (
                <>
                  <div className="h-5 w-px bg-red-800/50 mx-1" />
                  <Link
                    to="/AdminPanel"
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all
                      ${currentPageName === "AdminPanel" ? NAV_ACTIVE : NAV_IDLE}`}
                  >
                    <span>{t("nav.admin")}</span>
                  </Link>
                </>
              )}

              <LanguageSwitcher />

              <button
                onClick={() => base44.auth.logout()}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${NAV_IDLE}`}
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className={isEmbedded ? "pt-0" : "pt-20"}>
        {children}
      </main>
    </div>
  );
}