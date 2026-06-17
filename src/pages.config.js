/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CourseDashboard from './pages/CourseDashboard';
import CyberEventBuilder from './pages/CyberEventBuilder';
import DeviceInventory from './pages/DeviceInventory';
import Labs from './pages/Labs';
import DiagramPreview from './pages/DiagramPreview';
import FeatureGuide from './pages/FeatureGuide';
import GenerateScript from './pages/GenerateScript';
import Home from './pages/Home';
import LabAdmin from './pages/LabAdmin';
import MonitoringDashboard from './pages/MonitoringDashboard';
import NetworkWizard from './pages/NetworkWizard';
import ReviewDesign from './pages/ReviewDesign';
import StudentDashboard from './pages/StudentDashboard';
import UserGuide from './pages/UserGuide';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CourseDashboard": CourseDashboard,
    "CyberEventBuilder": CyberEventBuilder,
    "DeviceInventory": DeviceInventory,
    "Labs": Labs,
    "DiagramPreview": DiagramPreview,
    "FeatureGuide": FeatureGuide,
    "GenerateScript": GenerateScript,
    "Home": Home,
    "LabAdmin": LabAdmin,
    "MonitoringDashboard": MonitoringDashboard,
    "NetworkWizard": NetworkWizard,
    "ReviewDesign": ReviewDesign,
    "StudentDashboard": StudentDashboard,
    "UserGuide": UserGuide,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};