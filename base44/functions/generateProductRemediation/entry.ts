import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Builds a product-specific, simulated admin console plus point-and-click
// remediation steps for the product named by a ThreatFeedItem.
// Returns { supported: false } when the product cannot be represented reliably,
// so the client keeps the existing SOC remediation flow.

const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    supported: { type: 'boolean' },
    unsupported_reason: { type: 'string' },
    vendor: { type: 'string' },
    product: { type: 'string' },
    interface_name: { type: 'string' },
    summary: { type: 'string' },
    banner: { type: 'string' },
    nav: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, label: { type: 'string' } },
        required: ['id', 'label'],
      },
    },
    toolbar: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, label: { type: 'string' } },
        required: ['id', 'label'],
      },
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                value: { type: 'string' },
                status: { type: 'string', enum: ['ok', 'warn', 'bad', 'off'] },
              },
              required: ['id', 'label', 'value', 'status'],
            },
          },
        },
        required: ['id', 'title', 'rows'],
      },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          step: { type: 'number' },
          instruction: { type: 'string' },
          target_element_id: { type: 'string' },
          hint: { type: 'string' },
          rationale: { type: 'string' },
          wrong_feedback: { type: 'string' },
          points: { type: 'number' },
        },
        required: ['id', 'step', 'instruction', 'target_element_id', 'hint', 'rationale', 'wrong_feedback', 'points'],
      },
    },
  },
  required: ['supported', 'vendor', 'product', 'interface_name', 'summary', 'nav', 'toolbar', 'sections', 'tasks'],
};

const MAX_TASKS = 5;
const MAX_ROWS = 4;

const cleanId = (value, prefix, index) => {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (!slug) return `${prefix}_${index}`;
  return slug.startsWith(`${prefix}_`) ? slug : `${prefix}_${slug}`;
};

const text = (value, max) => String(value || '').trim().slice(0, max);

function resolveTarget(candidate, elementIds) {
  const direct = cleanId(candidate, 'row', 0);
  if (elementIds.has(direct)) return direct;
  const key = direct.replace(/^(row|nav|btn)_/, '');
  if (!key) return null;
  const stripped = (id) => id.replace(/^(row|nav|btn)_/, '');
  for (const id of elementIds) {
    if (stripped(id) === key) return id;
  }
  for (const id of elementIds) {
    const other = stripped(id);
    if (other.startsWith(key) || key.startsWith(other)) return id;
  }
  return null;
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.supported !== true) return null;

  const vendor = text(raw.vendor, 60);
  const product = text(raw.product, 80);
  const interfaceName = text(raw.interface_name, 90);
  if (!vendor || !product || !interfaceName) return null;

  const nav = (Array.isArray(raw.nav) ? raw.nav : [])
    .slice(0, 6)
    .map((item, i) => ({ id: cleanId(item?.id || item?.label, 'nav', i), label: text(item?.label, 40) }))
    .filter((item) => item.label);

  const toolbar = (Array.isArray(raw.toolbar) ? raw.toolbar : [])
    .slice(0, 5)
    .map((item, i) => ({ id: cleanId(item?.id || item?.label, 'btn', i), label: text(item?.label, 40) }))
    .filter((item) => item.label);

  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .slice(0, 3)
    .map((section, si) => ({
      id: cleanId(section?.id || section?.title, 'sec', si),
      title: text(section?.title, 40),
      rows: (Array.isArray(section?.rows) ? section.rows : [])
        .slice(0, MAX_ROWS)
        .map((row, ri) => ({
          id: cleanId(row?.id || row?.label, 'row', `${si}_${ri}`),
          label: text(row?.label, 60),
          value: text(row?.value, 40),
          status: ['ok', 'warn', 'bad', 'off'].includes(row?.status) ? row.status : 'ok',
        }))
        .filter((row) => row.label),
    }))
    .filter((section) => section.title && section.rows.length > 0);

  const elementIds = new Set([
    ...nav.map((n) => n.id),
    ...toolbar.map((b) => b.id),
    ...sections.flatMap((s) => s.rows.map((r) => r.id)),
  ]);

  const seenTargets = new Set();
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : [])
    .slice(0, MAX_TASKS)
    .map((task, i) => {
      const target = resolveTarget(task?.target_element_id, elementIds);
      if (!target) return null;
      if (seenTargets.has(target)) return null;
      seenTargets.add(target);
      return {
        id: cleanId(task?.id || `task_${i + 1}`, 'task', i),
        step: i + 1,
        instruction: text(task?.instruction, 240),
        target_element_id: target,
        hint: text(task?.hint, 160),
        rationale: text(task?.rationale, 240),
        wrong_feedback: text(task?.wrong_feedback, 160),
        points: Math.min(25, Math.max(5, Math.round(Number(task?.points) || 10))),
      };
    })
    .filter((task) => task && task.instruction);

  if (tasks.length < 2) return null;
  if (elementIds.size < tasks.length + 3) return null;

  return {
    vendor,
    product,
    interface_name: interfaceName,
    summary: text(raw.summary, 240),
    banner: text(raw.banner, 160) || `Simulated ${vendor} ${product} management console for training.`,
    nav,
    toolbar,
    sections,
    tasks,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const feedItemId = body.feed_item_id;
    if (!feedItemId) return Response.json({ error: 'feed_item_id is required' }, { status: 400 });

    const feedItem = await base44.entities.ThreatFeedItem.get(feedItemId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!feedItem) return Response.json({ error: 'Threat feed item not found' }, { status: 404 });

    const products = (feedItem.affected_products || []).slice(0, 8).join('; ');
    if (!products) {
      return Response.json({ supported: false, reason: 'The advisory does not name an affected product.' });
    }

    const prompt = `You design product-specific remediation simulations for a cyber security training platform.

Vulnerability advisory:
- Source: ${feedItem.source}
- ID: ${feedItem.cve_id || feedItem.external_id}
- Title: ${feedItem.title}
- Description: ${feedItem.description || 'n/a'}
- CVSS: ${feedItem.severity ?? 'unknown'}
- Affected products: ${products}

Decide whether the affected product can be represented reliably as a simulated admin console.

Set supported = false ONLY when the advisory names no identifiable vendor product, names an operating-system or unknown/unspecified component with no management interface, or the remediation steps cannot be expressed as clicks in a vendor management UI. Otherwise supported = true.

When supported, produce a SIMULATED web management console for that exact product, the way it plausibly looks in the vendor's admin UI (FortiGate, PAN-OS, Cisco ASDM/FMC, Cisco IOS web UI, VMware vCenter, Ivanti, Citrix ADC, SonicWall, F5 BIG-IP, Apache/Tomcat admin, WordPress admin, Jenkins, etc.):
- vendor: the vendor name. product: product plus version family from the advisory.
- interface_name: the console's real name (e.g. "FortiGate — SSL-VPN Settings").
- summary: one sentence on the exposure this drill remediates.
- nav: 4-6 navigation entries of that console.
- toolbar: 2-4 action buttons of that console.
- sections: 2-3 panels, each with 2-4 rows. Each row is a clickable configuration line with a label, a short current value and a status (ok, warn, bad or off).
- tasks: 3-5 remediation steps in the correct order, derived from what this specific vulnerability requires (disable the vulnerable portal/service, change the authentication or cipher setting, apply the fixed build level, restrict source access, remove the exposed admin listener, and so on). Each task:
  - instruction: an order for the learner that names the goal but NOT which control to click.
  - target_element_id: the id of the single row, nav entry or toolbar button that performs it, written as a slug starting with row_, nav_ or btn_ that matches one of the ids you generated.
  - hint: a narrow clue.
  - rationale: why that control fixes the exposure.
  - wrong_feedback: what clicking an unrelated control would not achieve.
  - points: 10 to 20.

Rules:
- The console is a training simulation; never include real credentials, real tokens or real customer data.
- Every target_element_id must exist in the nav, toolbar or row ids you return, and each task must target a different element.
- Ids are lowercase slugs with underscores only, e.g. row_ssl_vpn_status.
- Do not reveal the answer inside the row label or value beyond what a real console would show.

Return ONLY the JSON object.`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SPEC_SCHEMA,
    });

    let parsed = response;
    if (typeof parsed === 'string') {
      const trimmed = parsed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try { parsed = JSON.parse(trimmed); } catch { parsed = null; }
    }

    const spec = normalize(parsed);
    if (!spec) {
      return Response.json({
        supported: false,
        reason: (parsed && typeof parsed === 'object' && parsed.unsupported_reason) || 'No reliable product interface could be generated for this advisory.',
      });
    }

    return Response.json({ supported: true, spec });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}