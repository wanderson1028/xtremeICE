# Xtreme I.C.E. — Cybersecurity Training & Live-Fire Range Platform

> An enterprise-grade cyber range, network-design, and SOC training platform built on [Base44](https://base44.com). Design, deploy, and operate multi-device network topologies, run live-fire cyber events, deliver NICE-Framework-aligned lab courses, and assess candidate skills — all from a single responsive web app.

This repository contains the full front-end application (React + Vite + Tailwind) plus the Base44 backend definitions (entities, serverless functions, and agents). Any change pushed to this repo is reflected in the Base44 Builder and auto-deploys on the Base44 hosting platform.

---

## Table of Contents

- [Overview](#overview)
- [Who This Is For](#who-this-is-for)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Platform Modules](#platform-modules)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Environment Variables & Secrets](#environment-variables--secrets)
- [Local Development](#local-development)
- [Available Scripts](#available-scripts)
- [Coding Conventions](#coding-conventions)
- [Data Model & Access Control (RLS)](#data-model--access-control-rls)
- [Feature Flags & Role-Based Access](#feature-flags--role-based-access)
- [Internationalization](#internationalization)
- [Publishing & Deployment](#publishing--deployment)
- [Onboarding for New Contributors](#onboarding-for-new-contributors)
- [Known Issues & Notes](#known-issues--notes)
- [Docs & Support](#docs--support)

---

## Overview

Xtreme I.C.E. is a multi-tenant cybersecurity training and operations platform. It lets operators:

- **Design** network topologies (VPCs, subnets, routers, firewalls, servers) on an interactive EVE-NG-style canvas.
- **Deploy** those topologies as real cloud infrastructure (currently AWS) and manage the full device lifecycle (start/stop/terminate, SSH/RDP access, snapshots).
- **Train** users on SOC analyst workflows, NICE-Framework-aligned lab scenarios, and interactive Linux/Windows hands-on labs.
- **Assess** candidate skills with timed, invitation-based practical assessments and auto-generated scorecards.
- **Collaborate** through live-fire red-vs-blue cyber events with shared topology and scenario bundles.

The app is branded **"Xtreme I.C.E."** and themed with a dark/red "cyber" aesthetic (flame-text logo treatment, monospace UI accents).

## Who This Is For

This project is maintained by a small team (currently three contributors, with potential for more). The README is written to onboard a new developer quickly: it covers the stack, where things live, how the backend is structured, how to run locally, and the conventions to follow so the app stays consistent.

| Role | Primary focus |
|------|---------------|
| Platform / Backend | Entities, serverless functions, cloud orchestration, AWS integration |
| Frontend / UX | Pages, components, topology canvas, dashboards, accessibility |
| Content / Curriculum | Lab templates, NICE mapping, SOC scenarios, assessments |

## Tech Stack

- **Framework:** React 18 (Vite 6, ESM only)
- **Styling:** Tailwind CSS 3 with a CSS-token design system (`src/index.css` → `tailwind.config.js`)
- **UI components:** shadcn/ui (Radix primitives) in `src/components/ui/`
- **Icons:** lucide-react
- **State / data:** TanStack React Query (v5), React Router DOM (v6)
- **Forms:** React Hook Form + Zod
- **Drag & drop:** @hello-pangea/dnd
- **Charts:** recharts · **Maps:** react-leaflet · **3D:** three.js · **Markdown:** react-markdown · **PDF:** jspdf · **Animation:** framer-motion
- **i18n:** i18next (English, Spanish, French, Polish)
- **Backend:** Base44 BaaS — entities (JSON schemas), serverless Deno functions, built-in auth, realtime subscriptions, and an SDK client (`@base44/sdk`).
- **Cloud:** AWS (EC2, VPC, subnets, security groups, AMI discovery) via the `cloudProviderAWS` + `cloudOrchestrator` functions.

## Repository Structure

```
.
├── index.html                 # Title, fonts, meta, root mount
├── vite.config.js             # Vite + Base44 plugin
├── tailwind.config.js         # Token → Tailwind class mapping
├── jsconfig.json              # @/* → ./src/* path alias
├── package.json
├── src/
│   ├── main.jsx               # App entry
│   ├── App.jsx                # Router, auth gate, all explicit <Route>s
│   ├── Layout.jsx             # Top nav, dropdowns, role-gated links
│   ├── index.css / globals.css # Design tokens (:root + .dark)
│   ├── pages.config.js        # Legacy auto-page registry (mainPage + Layout)
│   ├── api/base44Client.js     # Pre-initialized Base44 SDK client
│   ├── lib/                    # featureConfig, AuthContext, query-client,
│   │                          # instanceTiers, protectedVpcs, niceDataset, ...
│   ├── hooks/                  # useFeatureFlags, useFeatureFlag, use-mobile
│   ├── locales/                # en / es / fr / pl translation JSON
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (do not re-export)
│   │   ├── livefire/           # TopologyBuilder, AddDevicePanel, ImageCatalog,
│   │   │                       # DeviceIcons, EveNgIcons, IconPickerModal, ...
│   │   ├── labs/               # Lab runner, builder steps, exports
│   │   ├── soc/                # SOC simulation, SIEM, EDR, RMM, assessments
│   │   ├── wizard/             # Network design wizard steps
│   │   ├── diagram/            # Cytoscape graph, panels, simulations
│   │   └── admin/              # User/org/feature-flag managers
│   └── pages/
│       ├── Home.jsx, EnvironmentHub.jsx, AdminPanel.jsx
│       ├── LabCreationWizard.jsx, LiveLabTopology.jsx
│       ├── RunningLabs.jsx, CloudResources.jsx, MyLabs.jsx
│       ├── labs/               # Interactive scenario labs (BGP, SIEM, ...)
│       ├── linux-labs/         # Linux sysadmin labs
│       └── windows-labs/       # PowerShell labs
└── base44/
    ├── config.jsonc           # App name + build/serve config
    ├── entities/               # JSON-schema data models (with RLS)
    ├── functions/              # Deno serverless entry.ts handlers
    └── agents/                 # AI agent configs (JSONC)
```

## Platform Modules

The app is organized into several major modules, each accessible through role-gated navigation in `Layout.jsx`:

1. **Environment Hub (Dashboard)** — Landing page showing the services the current user is assigned.
2. **Network Design (Design)** — `NetworkWizard`, `ReviewDesign`, `VisualDesignEditor`: guided topology design, Cytoscape graph views, cost estimation, AI-assisted analysis.
3. **Live Fire Cyber Range (Collaboration)** — `LiveFireDashboard`, `MyLabs`, `SharedLabs`, `RunningLabs`, `LFTemplates`, `ImageRepository`, `MarketplacePage`, `CloudResources`, `LFAdministration`, `LabCreationWizard`, `LiveLabTopology`: build and operate real AWS-backed labs with an EVE-NG-style topology canvas, device lifecycle, SSH/RDP access, snapshots, and cost tracking.
4. **Training** — `InteractiveVirtualLabs` (lab scenarios), `SOCTraining`, `SOCAssessments`, plus the individual lab pages under `src/pages/labs/`, `linux-labs/`, and `windows-labs/`.
5. **Course Lab Builder (Special Features)** — `LabBuilderDashboard`, `LabTemplates`, `LabBuilder`, `LabInstances`, `LabEnvironments`, `LabExports`, `NiceMapping`, `QuickBuild`, `NetworkLabDesigner`: author NICE-Framework-aligned course modules and export instructor/student/LMS artifacts.
6. **Candidate Assessments** — `CandidateAssessments`, `CreateAssessment`, `AssessmentDetail`, `InviteCandidate`, `CandidatePortal`, `ScorecardView`, `CandidateDashboard`: invitation-based practical assessments with auto-generated scorecards.
7. **Admin Panel** — `AdminPanel` with sub-managers for users, organizations, service assignments, feature flags, and NICE dataset versions.

## Backend Architecture

Backend logic lives in `base44/` and is served by Base44 as serverless Deno functions. Each function is a single `entry.ts` inside its own folder.

### Serverless Functions (`base44/functions/`)

| Function | Purpose |
|----------|---------|
| `cloudProviderAWS` | Low-level AWS actions: list VPCs/subnets, CIDR suggestions, AMI discovery (cross-region), describeImage, instance lifecycle, delete device, etc. |
| `cloudOrchestrator` | Higher-level multi-provider orchestration: lab deployment, device add/delete, snapshots, cost estimation, audit logging, database sync. |
| `checkFeatureFlag` | Resolve a feature flag for a user. |
| `generateAssessment` | AI-generate an assessment from a job description / NICE role. |
| `saveAssessment` | Persist an assessment and its tasks. |
| `sendCandidateInvite` | Issue a candidate invitation email + token. |
| `generateScorecard` | Produce a candidate scorecard after completion. |
| `generateCompleteEventBundle` | Assemble a full cyber-event bundle (topology + scenario + scripts). |
| `generateCyberEventPDF` | Export a cyber event to PDF. |
| `generateNetworkDocumentation` | Generate network design documentation. |
| `niceDatasetManager` | Import / update NICE Framework versions and competencies. |
| `adminSetPassword` | Admin utility to set a user password. |

**Function conventions:** every function is wrapped in `Deno.serve(async (req) => {...})`, returns `Response` objects, authenticates with `createClientFromRequest(req)` + `base44.auth.me()`, and uses `base44.entities.*` (user-scoped) or `base44.asServiceRole.*` (admin) for data. Admin-only functions verify `user.role === "admin"` and return 403 otherwise. Webhook endpoints validate request authenticity and use the service role. See the Base44 backend docs for the full pattern.

### Entities (`base44/entities/`)

Entities are JSON schemas that define the data model. Each carries built-in fields (`id`, `created_date`, `updated_date`, `created_by_id`) and an `rls` block describing row-level security. Key entities include:

- **LiveFireLab / LiveFireDevice / LiveFireDeployment** — lab definitions, devices, and cloud deployment records.
- **LiveFireImage** — the VM image catalog (vendor, AMI, credentials, access method).
- **LiveFireTemplate / LiveFireMarketplaceAsset** — reusable templates and marketplace listings.
- **LiveFireCloudAccount / LiveFireCostRecord / LiveFireAuditLog** — cloud accounts, cost tracking, audit trail.
- **LiveFireSnapshot / LiveFireCollaborationSession / LiveFireFolder** — snapshots, live collaboration, folder organization.
- **LabTemplate / LabScenario / CourseModule / LabInstance / LabTask / LabAttempt / LabScore** — course/lab authoring and delivery.
- **Assessment / AssessmentTask / CandidateInvitation / CandidateSession / Scorecard** — candidate assessments.
- **SOCSession** — SOC training simulation state.
- **NiceFrameworkVersion** — imported NICE Framework competencies (categories, work roles, tasks, knowledge, skills).
- **UserService / UserLabAssignment** — per-user service and lab entitlements.
- **Organization** — multi-tenancy grouping.
- **FeatureFlag** — runtime feature toggles (admin-managed).
- **User** — built-in user entity (read-only; users join via invites).

## Frontend Architecture

### Routing (`src/App.jsx`)
The router uses React Router v6. There are two route mechanisms:
1. A **legacy `pagesConfig` loop** that wraps a fixed set of pages in `LayoutWrapper` — these are the original auto-generated pages and **only** those.
2. **Explicit `<Route>` elements** added alongside the loop for every newer page, each wrapped in `LayoutWrapper` to get the nav bar.

> ⚠️ When adding a new page, you **must** add an explicit `<Route>` in `App.jsx` — the `pagesConfig` loop will not pick it up. Match the existing `LayoutWrapper` wrapping pattern.

### Layout & Navigation (`src/Layout.jsx`)
The top navigation is role/access-gated via `useNavAccess`, which returns flags from `featureConfig.js`. Admins get full access; regular users get only the services assigned via `UserService` records (and only if the corresponding feature flag is on). Dropdowns: Design, Collaboration (with the Live Fire sub-tree), Training (with SOC sub-tree), and Special Features.

### Data Fetching
All data access goes through the pre-initialized Base44 client at `@/api/base44Client`:
```js
import { base44 } from "@/api/base44Client";
const todos = await base44.entities.Todo.list();
const res = await base44.functions.invoke("cloudProviderAWS", { action: "listAllVpcs", params: { region } });
```
TanStack Query is used for caching/refetching. The shared query client (`src/lib/query-client.js`) disables refetch-on-focus and limits retries. Realtime updates use `base44.entities.X.subscribe(...)`.

### Design System
- `src/index.css` owns the CSS tokens (`:root` + `.dark`).
- `tailwind.config.js` maps tokens to Tailwind classes (`bg-primary`, `text-foreground`, etc.).
- Use mapped token classes in JSX — **no hardcoded colors** (`bg-[#fff]`, inline `style` colors).
- New reusable tokens only when a semantic token isn't enough; define under `:root` + `.dark` and map in `tailwind.config.js`.

### Key Libraries in Use
- **Topology canvas** (`TopologyBuilder.jsx`): `@hello-pangea/dnd` for drag-from-palette, SVG connections, areas, annotations, light/dark themes, VPC config, image catalog, icon picker.
- **Graph rendering** (`src/components/diagram/`): Cytoscape for larger network graphs.
- **SOC simulation** (`src/components/soc/`): SIEM viewer, EDR/RMM modules, incident report, AI analyst.
- **Lab authoring** (`src/components/labs/builder/`): multi-step builder with NICE mapping and export artifacts (instructor guide, student guide, LMS outline).

## Environment Variables & Secrets

### Frontend (`.env.local`)
Create `.env.local` from the template below. These are read at build time by Vite (`import.meta.env`):

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
# Optional: pin a functions version
VITE_BASE44_FUNCTIONS_VERSION=
```

> ℹ️ The Base44 Builder injects these automatically when running in the hosted environment. You only need them for local development.

### Backend Secrets (Base44 dashboard → Settings → Environment Variables)
These are already configured for this app and are read by serverless functions via `Deno.env.get("NAME")`:

| Secret | Used by | Description |
|--------|--------|-------------|
| `AWS_ACCESS_KEY_ID` | `cloudProviderAWS`, `cloudOrchestrator` | AWS account credentials |
| `AWS_SECRET_ACCESS_KEY` | same | AWS account credentials |
| `AWS_REGION` | same | Default AWS region |
| `RESEND_API_KEY` | email sending | Resend transactional email |
| `RESEND_FROM_EMAIL` | email sending | From-address for outgoing email |
| `BASE44_APP_URL` | various | Public app URL (for links in emails, etc.) |
| `Network_Designer` | design module | Network design integration token |

> ⚠️ Never commit secrets to the repo. Never log or return a secret's value from a function. A secret may only authenticate a request to its **own** service.

## Local Development

**Prerequisites:** Node 18+ and npm.

```bash
# 1. Clone
git clone <your-git-url> xtreme-ice && cd xtreme-ice

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local   # or create .env.local manually (see above)
#   edit .env.local with your VITE_BASE44_APP_ID and VITE_BASE44_APP_BASE_URL

# 4. Start the dev server
npm run dev
```

The app runs on Vite's default port (usually `http://localhost:5173`). The Base44 Vite plugin provides HMR, a navigation notifier, analytics tracking, and the visual-edit agent.

> Auth is required for almost every route except the candidate assessment portal (`/candidate-assessment`), which lets candidates self-register. If you're not registered as a user in the Base44 app, you'll see a "user not registered" screen — ask an admin to invite you.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Production build to `./dist`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint (quiet, errors only). |
| `npm run lint:fix` | Auto-fix lint issues. |
| `npm run typecheck` | Run TypeScript's `tsc` against `jsconfig.json` (JS type-checking). |

## Coding Conventions

- **ESM only.** Never use `require()` or `module.exports` — Vite ESM project, `require` is undefined at runtime.
- **Imports:** use the `@/` alias (`@/components/...`, `@/lib/...`, `@/api/base44Client`). Never relative `src/...` paths — they break on file moves. `cn` comes from `@/lib/utils`; `createPageUrl` comes from `@/utils`.
- **shadcn/ui:** each primitive is imported from its own file (`@/components/ui/button`, `.../label`, `.../use-toast`). One UI file never re-exports another.
- **Icons:** lucide-react only, and only icons that exist. A lucide icon sharing a component name must be aliased (`import { Home as HomeIcon } from "lucide-react"`).
- **Every import must resolve.** A missing-import warning means the app is broken — fix it before finishing.
- **Pages/components:** export default, named same as the file. Keep files focused (≤ ~50 lines for components); extract sections into sub-components when a file grows past ~1300 lines.
- **Tailwind classes:** write as literal strings — dynamic names (`bg-${color}-500`) are purged and silently disappear. Use `safelist` only for runtime-sourced values.
- **State / data:** use TanStack Query for server state. `placeholderData: keepPreviousData` and `staleTime`/`refetchInterval` keep the UI consistent during slow AWS API scans.
- **Entities:** always write the **full** JSON schema when editing `base44/entities/*.jsonc` (no placeholders/comments). Built-in fields (`id`, `created_date`, `updated_date`, `created_by_id`) are never declared.
- **Error handling:** let errors bubble up (no try/catch) unless it's a user-facing form/auth flow where inline errors are the feature.
- **Backend functions:** see [Backend Architecture](#backend-architecture) — `Deno.serve`, return `Response`, authenticate, admin-check, `await` every SDK call.

## Data Model & Access Control (RLS)

Most entities define an `rls` block controlling create/read/update/delete per user. Patterns in use:

- **Owner + admin** — e.g. `LiveFireLab`: read if `created_by_id` matches, visibility is `public`/`organization`, shared with the user's email, or the user is an admin.
- **Admin-only write** — e.g. `LiveFireDeployment`, `LiveFireCostRecord`: anyone authenticated can create; only admins update/delete.
- **Cross-entity $in** — e.g. `LiveFireDevice` checks that the device's `lab_id` refers to a `LiveFireLab` the current user owns/can read.
- **Service-scoped** — e.g. `UserService` / `UserLabAssignment`: users read their own rows; admins manage all.

When adding a new entity, set `rls` deliberately — leaving it open can expose data to unintended users. The built-in `User` entity is read-only and users join via invites (`base44.users.inviteUser`), not direct creation.

## Feature Flags & Role-Based Access

- **Feature flags** live in the `FeatureFlag` entity and are resolved on the client via `useFeatureFlags` / `isFlagOn`. Pages are gated with `<FeatureGate flagKey="...">`.
- **Service access** is derived from each user's `UserService` records in `featureConfig.js` (`getAccessFromKeys`). Admins get `ADMIN_ACCESS` (everything). The nav bar only shows modules the user is entitled to.
- **AWS region selection** in the Lab Creation Wizard is restricted to admins.

To add a new gated feature: add its `service_key` to the `UserService` enum, add an entry to `FEATURES` in `src/lib/featureConfig.js`, and (if it needs a new nav group) add the access flag to `getAccessFromKeys` + `ADMIN_ACCESS`.

## Internationalization

Translations live in `src/locales/{en,es,fr,pl}.json` and are loaded via i18next (`src/lib/i18n.js`). Use `useTranslation()` and the `t("key")` function in components — don't hardcode user-facing strings that should be translatable. The `LanguageSwitcher` component lets users pick a language at runtime. RTL languages are supported with RTL layout when needed.

## Publishing & Deployment

1. **Local → Builder:** any push to `main` (or your default branch) syncs to the Base44 Builder — the live preview reflects your code.
2. **Publish:** open [Base44.com](https://base44.com), open the app, and click **Publish**. This builds and deploys to the Base44 hosting platform.
3. **Mobile:** the same codebase publishes to iOS/Android — keep components responsive.

There is no separate CI/CD pipeline in this repo; Base44 handles build and hosting using the `installCommand`/`buildCommand`/`outputDirectory` in `base44/config.jsonc`.

## Onboarding for New Contributors

Welcome! Here's the fastest path to being productive:

1. **Get access** — ask an admin to invite you to the Base44 app and to the GitHub repo. You need to be a registered user to see anything beyond the candidate portal.
2. **Read this README end-to-end** — especially [Repository Structure](#repository-structure), [Backend Architecture](#backend-architecture), and [Coding Conventions](#coding-conventions).
3. **Run locally** — follow [Local Development](#local-development). Confirm you can load the app and log in.
4. **Tour the modules** — start at `src/App.jsx` to see all routes, then open `Layout.jsx` to understand navigation. Pick one module (e.g. Live Fire) and trace a page → component → entity → function path end-to-end.
5. **Make a small change first** — fix a typo or tweak a label, push, and watch it appear in the Builder. This confirms your local + git setup works.
6. **Before bigger work:**
   - Check the entity schemas in `base44/entities/` for the data you'll touch.
   - Check `base44/functions/` for any backend logic you need.
   - Re-read the [Coding Conventions](#coding-conventions) — they exist because each one has broken a real build.
7. **Coordinate** — since multiple people work here, communicate before large refactors (especially routing in `App.jsx`, the layout nav, or shared entities). Keep PRs focused.

### Where things tend to break (watch out)
- Adding a page without an explicit `<Route>` in `App.jsx` → unreachable.
- Using `require()` or a non-installed npm package → runtime crash.
- Dynamic Tailwind class names (`bg-${x}-500`) → silently missing styles.
- Editing an entity schema with placeholders/comments instead of the full object → schema rejected.
- Forgetting to `await` a Base44 SDK call → unhandled promise.

## Known Issues & Notes

- **AWS API latency:** network scans (list VPCs/subnets, AMI discovery) can take ~20s. UIs use `keepPreviousData` and cached query config to stay responsive.
- **VPC list population:** the wizard's VPC list may occasionally be incomplete due to backend regex parsing limits on AWS XML responses.
- **Custom AMI discovery:** intermittently fails in `ImageCatalog` despite the backend APIs being functional; the catalog degrades gracefully.
- **Device deletion UI sync:** deleting a device succeeds on the backend but may require an explicit `refetchLab()` call to refresh the topology canvas.
- **Large files:** several page files have grown past the 1300-line guideline and should be split into sub-components when next edited.

## Docs & Support

- **Base44 documentation:** https://docs.base44.com
- **GitHub sync docs:** https://docs.base44.com/Integrations/Using-GitHub
- **Base44 support:** https://app.base44.com/support
- **Platform issues:** for Base44 platform (not app) bugs, contact Base44 support — this repo's maintainers can't change platform internals.

---

*Built and maintained on the Base44 platform. Branded "Xtreme I.C.E."*