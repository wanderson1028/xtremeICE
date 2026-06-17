import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import EventView from './pages/EventView'
import CyberCapitalDashboard from './pages/CyberCapitalDashboard'
import VisualDesignEditor from './pages/VisualDesignEditor'
import VirtualLabs from './pages/VirtualLabs'
import AdminPanel from './pages/AdminPanel'
import SOCSimulation from './pages/SOCSimulation'
import SOCTraining from './pages/SOCTraining'
import SOCAssessments from './pages/SOCAssessments'
import EnvironmentHub from './pages/EnvironmentHub'
import LiveFire from './pages/LiveFire'
import OspfLab from './pages/OspfLab'
import LabBuilderDashboard from './pages/LabBuilderDashboard'
import LabTemplates from './pages/LabTemplates'
import LabBuilder from './pages/LabBuilder'
import LabInstances from './pages/LabInstances'
import LabEnvironments from './pages/LabEnvironments'
import LabExports from './pages/LabExports'
import NiceMapping from './pages/NiceMapping'
import QuickBuild from './pages/QuickBuild'
import NetworkLabDesigner from './pages/NetworkLabDesigner'
import InteractiveVirtualLabs from './pages/InteractiveVirtualLabs'
import LabSocialEngineering from './pages/labs/LabSocialEngineering'
import LabDigitalForensics from './pages/labs/LabDigitalForensics'
import LabCybersecurityEssentials from './pages/labs/LabCybersecurityEssentials'
import LabCryptography from './pages/labs/LabCryptography'
import LabPasswordAttacks from './pages/labs/LabPasswordAttacks'
import LabWebAppPentest from './pages/labs/LabWebAppPentest'
import LabNetworkTrafficAnalysis from './pages/labs/LabNetworkTrafficAnalysis'
import LabNetworkSecurityMonitoring from './pages/labs/LabNetworkSecurityMonitoring'
import LabVulnerabilityAssessment from './pages/labs/LabVulnerabilityAssessment'
import LabSIEM from './pages/labs/LabSIEM'
import LabFirewallEvasion from './pages/labs/LabFirewallEvasion'
import LabEndpointDetection from './pages/labs/LabEndpointDetection'
import LabCloudIncidentResponse from './pages/labs/LabCloudIncidentResponse'
import LabLinuxHardening from './pages/labs/LabLinuxHardening'
import LabDevSecOps from './pages/labs/LabDevSecOps'
import LabWirelessExploitation from './pages/labs/LabWirelessExploitation'
import LabLogCorrelation from './pages/labs/LabLogCorrelation'
import LabBGP from './pages/labs/LabBGP'
import LabZeroTrust from './pages/labs/LabZeroTrust'
import CandidateAssessments from './pages/CandidateAssessments'
import CreateAssessment from './pages/CreateAssessment'
import AssessmentDetail from './pages/AssessmentDetail'
import InviteCandidate from './pages/InviteCandidate'
import CandidatePortal from './pages/CandidatePortal'
import ScorecardView from './pages/ScorecardView'
import LabLeaderboardDetail from './pages/LabLeaderboardDetail'
import FeatureGate from './components/FeatureGate'
import CandidateDashboard from './pages/CandidateDashboard'
import LabFilesystem from './pages/linux-labs/LabFilesystem'
import LabPermissions from './pages/linux-labs/LabPermissions'
import LabPackages from './pages/linux-labs/LabPackages'
import LabUsers from './pages/linux-labs/LabUsers'
import LabText from './pages/linux-labs/LabText'
import LabNetworking from './pages/linux-labs/LabNetworking'
import LabServices from './pages/linux-labs/LabServices'
import LabScripting from './pages/linux-labs/LabScripting'
import LabSysadmin from './pages/linux-labs/LabSysadmin'
import LabSSH from './pages/linux-labs/LabSSH'
import LabPSBasics from './pages/windows-labs/LabPSBasics'
import LabPSVariables from './pages/windows-labs/LabPSVariables'
import LabPSFiles from './pages/windows-labs/LabPSFiles'
import LabPSProcesses from './pages/windows-labs/LabPSProcesses'
import LabPSUsers from './pages/windows-labs/LabPSUsers'
import LabPSScripting from './pages/windows-labs/LabPSScripting'
import LabPSRegistry from './pages/windows-labs/LabPSRegistry'
import LabPSEventLogs from './pages/windows-labs/LabPSEventLogs'
import LabPSNetworking from './pages/windows-labs/LabPSNetworking'
import LabPSRemoting from './pages/windows-labs/LabPSRemoting'
import EigrpLab from './pages/EigrpLab'
import FirewallLab from './pages/FirewallLab'
import TrainingCatalog from './pages/TrainingCatalog'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow candidate assessment route to bypass auth gate — candidates self-register via the portal
  const isCandidateRoute = window.location.pathname.startsWith('/candidate-assessment');

  // Handle authentication errors
  if (authError && !isCandidateRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/EventView/:id" element={<LayoutWrapper currentPageName="EventView"><EventView /></LayoutWrapper>} />
      <Route path="/CyberCapitalDashboard" element={<LayoutWrapper currentPageName="CyberCapitalDashboard"><CyberCapitalDashboard /></LayoutWrapper>} />
      <Route path="/VisualDesignEditor" element={<LayoutWrapper currentPageName="VisualDesignEditor"><FeatureGate flagKey="visual_design_editor"><VisualDesignEditor /></FeatureGate></LayoutWrapper>} />
      <Route path="/VirtualLabs" element={<LayoutWrapper currentPageName="VirtualLabs"><VirtualLabs /></LayoutWrapper>} />
      <Route path="/AdminPanel" element={<LayoutWrapper currentPageName="AdminPanel"><AdminPanel /></LayoutWrapper>} />
      <Route path="/SOCSimulation" element={<LayoutWrapper currentPageName="SOCSimulation"><SOCSimulation /></LayoutWrapper>} />
      <Route path="/soc-training" element={<LayoutWrapper currentPageName="SOCTraining"><FeatureGate flagKey="soc_training"><SOCTraining /></FeatureGate></LayoutWrapper>} />
      <Route path="/soc-assessments" element={<LayoutWrapper currentPageName="SOCAssessments"><FeatureGate flagKey="soc_assessments"><SOCAssessments /></FeatureGate></LayoutWrapper>} />
      <Route path="/EnvironmentHub" element={<LayoutWrapper currentPageName="EnvironmentHub"><EnvironmentHub /></LayoutWrapper>} />
      <Route path="/LiveFire" element={<LayoutWrapper currentPageName="LiveFire"><LiveFire /></LayoutWrapper>} />
      <Route path="/OspfLab" element={<LayoutWrapper currentPageName="OspfLab"><OspfLab /></LayoutWrapper>} />
      <Route path="/LabBuilderDashboard" element={<LayoutWrapper currentPageName="LabBuilderDashboard"><FeatureGate flagKey="course_lab_builder"><LabBuilderDashboard /></FeatureGate></LayoutWrapper>} />
      <Route path="/LabTemplates" element={<LayoutWrapper currentPageName="LabTemplates"><LabTemplates /></LayoutWrapper>} />
      <Route path="/LabBuilder" element={<LayoutWrapper currentPageName="LabBuilder"><LabBuilder /></LayoutWrapper>} />
      <Route path="/LabInstances" element={<LayoutWrapper currentPageName="LabInstances"><LabInstances /></LayoutWrapper>} />
      <Route path="/LabEnvironments" element={<LayoutWrapper currentPageName="LabEnvironments"><LabEnvironments /></LayoutWrapper>} />
      <Route path="/LabExports" element={<LayoutWrapper currentPageName="LabExports"><LabExports /></LayoutWrapper>} />
      <Route path="/NiceMapping" element={<LayoutWrapper currentPageName="NiceMapping"><NiceMapping /></LayoutWrapper>} />
      <Route path="/QuickBuild" element={<LayoutWrapper currentPageName="QuickBuild"><QuickBuild /></LayoutWrapper>} />
      <Route path="/NetworkLabDesigner" element={<LayoutWrapper currentPageName="NetworkLabDesigner"><FeatureGate flagKey="network_design_wizard"><NetworkLabDesigner /></FeatureGate></LayoutWrapper>} />
      <Route path="/InteractiveVirtualLabs" element={<LayoutWrapper currentPageName="InteractiveVirtualLabs"><FeatureGate flagKey="lab_scenarios"><InteractiveVirtualLabs /></FeatureGate></LayoutWrapper>} />
      <Route path="/labs/social-engineering" element={<LayoutWrapper currentPageName="LabSocialEngineering"><LabSocialEngineering /></LayoutWrapper>} />
      <Route path="/labs/digital-forensics" element={<LayoutWrapper currentPageName="LabDigitalForensics"><LabDigitalForensics /></LayoutWrapper>} />
      <Route path="/labs/cybersecurity-essentials" element={<LayoutWrapper currentPageName="LabCybersecurityEssentials"><LabCybersecurityEssentials /></LayoutWrapper>} />
      <Route path="/labs/cryptography" element={<LayoutWrapper currentPageName="LabCryptography"><LabCryptography /></LayoutWrapper>} />
      <Route path="/labs/password-attacks" element={<LayoutWrapper currentPageName="LabPasswordAttacks"><LabPasswordAttacks /></LayoutWrapper>} />
      <Route path="/labs/web-app-pentest" element={<LayoutWrapper currentPageName="LabWebAppPentest"><LabWebAppPentest /></LayoutWrapper>} />
      <Route path="/labs/network-traffic-analysis" element={<LayoutWrapper currentPageName="LabNetworkTrafficAnalysis"><LabNetworkTrafficAnalysis /></LayoutWrapper>} />
      <Route path="/labs/network-security-monitoring" element={<LayoutWrapper currentPageName="LabNetworkSecurityMonitoring"><LabNetworkSecurityMonitoring /></LayoutWrapper>} />
      <Route path="/labs/vulnerability-assessment" element={<LayoutWrapper currentPageName="LabVulnerabilityAssessment"><LabVulnerabilityAssessment /></LayoutWrapper>} />
      <Route path="/labs/siem" element={<LayoutWrapper currentPageName="LabSIEM"><LabSIEM /></LayoutWrapper>} />
      <Route path="/labs/firewall-evasion" element={<LayoutWrapper currentPageName="LabFirewallEvasion"><LabFirewallEvasion /></LayoutWrapper>} />
      <Route path="/labs/endpoint-detection" element={<LayoutWrapper currentPageName="LabEndpointDetection"><LabEndpointDetection /></LayoutWrapper>} />
      <Route path="/labs/cloud-incident-response" element={<LayoutWrapper currentPageName="LabCloudIncidentResponse"><LabCloudIncidentResponse /></LayoutWrapper>} />
      <Route path="/labs/linux-hardening" element={<LayoutWrapper currentPageName="LabLinuxHardening"><LabLinuxHardening /></LayoutWrapper>} />
      <Route path="/labs/devsecops" element={<LayoutWrapper currentPageName="LabDevSecOps"><LabDevSecOps /></LayoutWrapper>} />
      <Route path="/labs/wireless-exploitation" element={<LayoutWrapper currentPageName="LabWirelessExploitation"><LabWirelessExploitation /></LayoutWrapper>} />
      <Route path="/labs/log-correlation" element={<LayoutWrapper currentPageName="LabLogCorrelation"><LabLogCorrelation /></LayoutWrapper>} />
      <Route path="/labs/bgp" element={<LayoutWrapper currentPageName="LabBGP"><LabBGP /></LayoutWrapper>} />
      <Route path="/labs/zero-trust" element={<LayoutWrapper currentPageName="LabZeroTrust"><LabZeroTrust /></LayoutWrapper>} />
      <Route path="/CandidateAssessments" element={<LayoutWrapper currentPageName="CandidateAssessments"><FeatureGate flagKey="soc_assessments"><CandidateAssessments /></FeatureGate></LayoutWrapper>} />
      <Route path="/create-assessment" element={<LayoutWrapper currentPageName="CreateAssessment"><CreateAssessment /></LayoutWrapper>} />
      <Route path="/assessment-detail" element={<LayoutWrapper currentPageName="AssessmentDetail"><AssessmentDetail /></LayoutWrapper>} />
      <Route path="/invite-candidate" element={<LayoutWrapper currentPageName="InviteCandidate"><InviteCandidate /></LayoutWrapper>} />
      <Route path="/candidate-assessment" element={<CandidatePortal />} />
      <Route path="/scorecard" element={<LayoutWrapper currentPageName="ScorecardView"><ScorecardView /></LayoutWrapper>} />
      <Route path="/lab-leaderboard-detail" element={<LayoutWrapper currentPageName="LabLeaderboardDetail"><LabLeaderboardDetail /></LayoutWrapper>} />
      <Route path="/candidate-dashboard" element={<LayoutWrapper currentPageName="CandidateDashboard"><CandidateDashboard /></LayoutWrapper>} />
      <Route path="/linux-labs/filesystem" element={<LabFilesystem />} />
      <Route path="/linux-labs/permissions" element={<LabPermissions />} />
      <Route path="/linux-labs/packages" element={<LabPackages />} />
      <Route path="/linux-labs/users" element={<LabUsers />} />
      <Route path="/linux-labs/text" element={<LabText />} />
      <Route path="/linux-labs/networking" element={<LabNetworking />} />
      <Route path="/linux-labs/services" element={<LabServices />} />
      <Route path="/linux-labs/scripting" element={<LabScripting />} />
      <Route path="/linux-labs/sysadmin" element={<LabSysadmin />} />
      <Route path="/linux-labs/ssh" element={<LabSSH />} />
      <Route path="/windows-labs/ps-basics" element={<LabPSBasics />} />
      <Route path="/windows-labs/ps-variables" element={<LabPSVariables />} />
      <Route path="/windows-labs/ps-files" element={<LabPSFiles />} />
      <Route path="/windows-labs/ps-processes" element={<LabPSProcesses />} />
      <Route path="/windows-labs/ps-users" element={<LabPSUsers />} />
      <Route path="/windows-labs/ps-scripting" element={<LabPSScripting />} />
      <Route path="/windows-labs/ps-registry" element={<LabPSRegistry />} />
      <Route path="/windows-labs/ps-eventlogs" element={<LabPSEventLogs />} />
      <Route path="/windows-labs/ps-networking" element={<LabPSNetworking />} />
      <Route path="/windows-labs/ps-remoting" element={<LabPSRemoting />} />
      <Route path="/EigrpLab" element={<LayoutWrapper currentPageName="EigrpLab"><EigrpLab /></LayoutWrapper>} />
      <Route path="/FirewallLab" element={<LayoutWrapper currentPageName="FirewallLab"><FirewallLab /></LayoutWrapper>} />
      <Route path="/training-catalog" element={<LayoutWrapper currentPageName="TrainingCatalog"><TrainingCatalog /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App