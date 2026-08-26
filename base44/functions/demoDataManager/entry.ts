import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PREFIX = '[DEMO]';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — platform admin only' }, { status: 403 });

    const { action } = await req.json();
    const svc = base44.asServiceRole;

    if (action === 'status') {
      return Response.json({ success: true, counts: await getCounts(svc, user) });
    }

    if (action === 'remove') {
      const removed = await removeDemoData(svc, user);
      return Response.json({ success: true, removed, message: 'Demo data removed. Real records were not changed.' });
    }

    if (action !== 'seed') {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    await removeDemoData(svc, user);
    const now = new Date();
    const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

    const design = await svc.entities.NetworkDesign.create({
      name: `${PREFIX} Zero Trust Enterprise Network`,
      status: 'previewed',
      is_public: false,
      company_name: 'Xtreme I.C.E. Demo Organization',
      num_sites: 3,
      site_names: ['Headquarters', 'SOC', 'Disaster Recovery'],
      topology_type: 'hub-and-spoke',
      routing_protocol: 'BGP',
      wan_technology: 'SD-WAN',
      num_vlans_per_site: 4,
      vlan_names: ['Users', 'Servers', 'Security', 'Management'],
      firewall_enabled: true,
      firewall_vendor: 'Palo Alto',
      switch_model: 'Cisco Catalyst',
      router_model: 'Cisco ISR',
      ip_scheme: '10.40.0.0/16',
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: true,
      server_farm: true,
      num_servers: 6,
      cloud_server_farm: true,
      cloud_provider: 'AWS',
      num_cloud_instances: 4,
      cloud_connectivity: 'VPN Gateway',
      num_user_devices: 125,
      user_device_types: ['Windows Workstation', 'Mobile'],
      change_history: ['Demo topology created', 'Firewall and segmentation validated'],
    });

    const socScenarios = [
      { id: 'demo_ransomware', name: `${PREFIX} Ransomware Containment`, score: 92, days: 1, mode: 'assessment' },
      { id: 'demo_bruteforce', name: `${PREFIX} VPN Brute Force`, score: 84, days: 4, mode: 'training' },
      { id: 'demo_xss', name: `${PREFIX} Web Application XSS`, score: 76, days: 8, mode: 'training' },
      { id: 'demo_phishing', name: `${PREFIX} Phishing Response`, score: 88, days: 12, mode: 'assessment' },
    ];
    for (const item of socScenarios) {
      await svc.entities.SOCSession.create({
        network_design_id: design.id,
        scenario_id: item.id,
        scenario_name: item.name,
        user_email: user.email,
        user_name: user.full_name || 'Demo Administrator',
        mode: item.mode,
        status: 'completed',
        started_at: iso(item.days),
        completed_at: iso(item.days),
        actions_taken: [
          { id: 'isolate_host', label: 'Isolate affected endpoint' },
          { id: 'block_ip', label: 'Block malicious source' },
          { id: 'collect_forensics', label: 'Collect forensic evidence' },
        ],
        alerts_triaged: ['alert-1', 'alert-2', 'alert-3'],
        score: item.score,
        score_breakdown: { response: 35, containment: 30, investigation: 20, reporting: item.score - 85, outcome: 'demo' },
        affected_assets: item.score < 80 ? ['WEB-SRV-01'] : [],
        iocs: ['198.51.100.42', 'demo-malware-sha256'],
      });
    }

    const labs = [
      { title: `${PREFIX} AWS CLF-C02 — Cloud Concepts`, difficulty: 'Beginner', steps: 8, done: 8, earned: 96, days: 2 },
      { title: `${PREFIX} Network Traffic Analysis`, difficulty: 'Intermediate', steps: 10, done: 9, earned: 88, days: 5 },
      { title: `${PREFIX} Firewall Rule Validation`, difficulty: 'Intermediate', steps: 7, done: 7, earned: 100, days: 9 },
      { title: `${PREFIX} Linux Privilege Escalation`, difficulty: 'Advanced', steps: 12, done: 9, earned: 78, days: 14 },
    ];
    for (const lab of labs) {
      await svc.entities.LabScore.create({
        user_email: user.email,
        user_name: user.full_name || 'Demo Administrator',
        lab_title: lab.title,
        lab_chapter: 'Demo',
        difficulty: lab.difficulty,
        total_steps: lab.steps,
        steps_completed: lab.done,
        questions_correct: Math.max(1, lab.done - 1),
        questions_total: lab.steps,
        points_earned: lab.earned,
        points_possible: 100,
        step_results: [],
        completed_at: iso(lab.days),
      });
    }

    const assessment = await svc.entities.Assessment.create({
      title: `${PREFIX} Senior SOC Analyst Candidate Assessment`,
      company_name: 'Xtreme I.C.E. Demo Organization',
      position_title: 'Senior SOC Analyst',
      organization_id: user.organization_id || 'demo',
      created_by_email: user.email,
      seniority_level: 'senior',
      difficulty: 'Advanced',
      duration_minutes: 90,
      assessment_type: 'SOC Analyst',
      required_tools: ['SIEM', 'EDR', 'RMM'],
      role_summary: 'Demonstration assessment covering triage, containment, analysis, and reporting.',
      objectives: ['Triage alerts', 'Contain affected endpoints', 'Document evidence', 'Create an incident report'],
      pass_threshold: 75,
      status: 'active',
      generated: true,
    });

    await svc.entities.CandidateInvitation.create({
      assessment_id: assessment.id,
      candidate_name: `${PREFIX} Jordan Candidate`,
      candidate_email: 'demo.candidate@xtreme-ice.invalid',
      invite_token: `demo-${crypto.randomUUID()}`,
      status: 'completed',
      expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
      sent_at: iso(3),
      email_delivery_status: 'sent',
      accepted_at: iso(2),
      completed_at: iso(1),
      invited_by_id: user.id,
    });

    const threats = [
      { id: 'DEMO-CVE-2026-1001', title: `${PREFIX} Edge Gateway Authentication Bypass`, severity: 9.8, label: 'critical', product: 'Enterprise VPN Gateway' },
      { id: 'DEMO-CVE-2026-1002', title: `${PREFIX} Web Framework Remote Code Execution`, severity: 9.1, label: 'critical', product: 'Demo Web Framework' },
      { id: 'DEMO-CVE-2026-1003', title: `${PREFIX} Identity Provider Privilege Escalation`, severity: 8.4, label: 'high', product: 'Demo Identity Platform' },
    ];
    for (const threat of threats) {
      await svc.entities.ThreatFeedItem.create({
        source: 'NVD-CVE',
        external_id: threat.id,
        cve_id: threat.id.replace('DEMO-', ''),
        title: threat.title,
        description: 'Demonstration threat record used to showcase real-attack drill generation.',
        severity: threat.severity,
        severity_label: threat.label,
        affected_products: [threat.product],
        mitre_techniques: ['T1190', 'T1078'],
        published_date: iso(5),
        ingested_at: now.toISOString(),
        raw: { demo: true },
      });
    }

    const counts = await getCounts(svc, user);
    return Response.json({ success: true, counts, message: 'Demo data loaded across the application.' });
  } catch (error) {
    console.error('demoDataManager error:', error);
    return Response.json({ error: error.message || 'Demo data operation failed' }, { status: 500 });
  }
});

async function getCounts(svc, user) {
  const [designs, sessions, labs, assessments, invitations, threats] = await Promise.all([
    svc.entities.NetworkDesign.filter({ name: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.SOCSession.filter({ user_email: user.email, scenario_id: { $regex: '^demo_' } }),
    svc.entities.LabScore.filter({ user_email: user.email, lab_title: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.Assessment.filter({ created_by_email: user.email, title: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.CandidateInvitation.filter({ invited_by_id: user.id, candidate_email: 'demo.candidate@xtreme-ice.invalid' }),
    svc.entities.ThreatFeedItem.filter({ external_id: { $regex: '^DEMO-' } }),
  ]);
  return {
    network_designs: designs.length,
    soc_sessions: sessions.length,
    lab_scores: labs.length,
    assessments: assessments.length,
    candidate_invitations: invitations.length,
    threat_items: threats.length,
    total: designs.length + sessions.length + labs.length + assessments.length + invitations.length + threats.length,
  };
}

async function removeDemoData(svc, user) {
  const counts = await getCounts(svc, user);
  await Promise.all([
    svc.entities.CandidateInvitation.deleteMany({ invited_by_id: user.id, candidate_email: 'demo.candidate@xtreme-ice.invalid' }),
    svc.entities.Assessment.deleteMany({ created_by_email: user.email, title: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.SOCSession.deleteMany({ user_email: user.email, scenario_id: { $regex: '^demo_' } }),
    svc.entities.LabScore.deleteMany({ user_email: user.email, lab_title: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.NetworkDesign.deleteMany({ name: { $regex: '^\\[DEMO\\]' } }),
    svc.entities.ThreatFeedItem.deleteMany({ external_id: { $regex: '^DEMO-' } }),
  ]);
  return counts;
}
