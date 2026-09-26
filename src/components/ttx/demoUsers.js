// Single source of truth for TTX demo users, their avatars, and the
// response-team role each user fills in their organization's profile.
// Consumed by the Demo Org Seeder (Admin) and throughout the TTX feature.

export const DEMO_USERS = [
  // Harborview Regional Bank — Financial Services
  { org_name: "Harborview Regional Bank", org_slug: "harborview-regional-bank-demo", full_name: "Sarah Chen", email: "sarah.chen@harborview-regional-bank.example", org_role: "org_admin", title: "Executive leadership", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/c4a52974a_generated_image.png" },
  { org_name: "Harborview Regional Bank", org_slug: "harborview-regional-bank-demo", full_name: "Marcus Lee", email: "marcus.lee@harborview-regional-bank.example", org_role: "member", title: "IT operations", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/d02777422_generated_image.png" },
  { org_name: "Harborview Regional Bank", org_slug: "harborview-regional-bank-demo", full_name: "Jennifer Park", email: "jennifer.park@harborview-regional-bank.example", org_role: "member", title: "Security operations", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/f3c48e32d_generated_image.png" },
  // Piedmont Health Network — Healthcare
  { org_name: "Piedmont Health Network", org_slug: "piedmont-health-network-demo", full_name: "David Kim", email: "david.kim@piedmont-health-network.example", org_role: "org_admin", title: "Executive leadership", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/c1b3bbb63_generated_image.png" },
  { org_name: "Piedmont Health Network", org_slug: "piedmont-health-network-demo", full_name: "Lisa Morales", email: "lisa.morales@piedmont-health-network.example", org_role: "member", title: "Clinical operations", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/7b705a442_generated_image.png" },
  { org_name: "Piedmont Health Network", org_slug: "piedmont-health-network-demo", full_name: "Robert Johnson", email: "robert.johnson@piedmont-health-network.example", org_role: "member", title: "IT and security", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/9f70bb7c6_generated_image.png" },
  // Southeastern Precision Manufacturing — Manufacturing
  { org_name: "Southeastern Precision Manufacturing", org_slug: "southeastern-precision-mfg-demo", full_name: "Thomas Weber", email: "thomas.weber@southeastern-precision-mfg.example", org_role: "org_admin", title: "Executive leadership", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/57a1e22ec_generated_image.png" },
  { org_name: "Southeastern Precision Manufacturing", org_slug: "southeastern-precision-mfg-demo", full_name: "Maria Garcia", email: "maria.garcia@southeastern-precision-mfg.example", org_role: "member", title: "Plant operations", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/1e2b7ac9b_generated_image.png" },
  { org_name: "Southeastern Precision Manufacturing", org_slug: "southeastern-precision-mfg-demo", full_name: "James Brown", email: "james.brown@southeastern-precision-mfg.example", org_role: "member", title: "IT and security", avatar_url: "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/f3d31c340_generated_image.png" },
];

// Look up the demo user who fills a given response-team role at a given company.
export function demoUserForRole(companyName, roleTitle) {
  if (!companyName || !roleTitle) return null;
  return DEMO_USERS.find((u) => u.org_name === companyName && u.title === roleTitle) || null;
}

// All demo users for a given company (by name).
export function demoUsersForOrg(companyName) {
  return DEMO_USERS.filter((u) => u.org_name === companyName);
}

// Look up a demo user by email (used by the Demo Org Seeder to render avatars).
export function demoUserByEmail(email) {
  return DEMO_USERS.find((u) => u.email === email) || null;
}