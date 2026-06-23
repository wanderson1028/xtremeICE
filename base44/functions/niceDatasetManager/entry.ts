import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    const svc = base44.asServiceRole;

    // ── LOAD DEFAULT NICE v2.2.0 ──────────────────────────────────
    // Purge ALL existing NiceFrameworkVersion + NiceAppSettings records,
    // then seed the v2.2.0 dataset as the exclusive source of truth.
    if (action === 'load_default') {
      const dataset = body.dataset;
      if (!dataset || !dataset.version) {
        return Response.json({ error: 'Dataset with version is required' }, { status: 400 });
      }

      // 1. Purge existing framework versions
      const existingVersions = await svc.entities.NiceFrameworkVersion.list('-created_date', 200);
      if (existingVersions.length > 0) {
        await svc.entities.NiceFrameworkVersion.deleteMany({});
      }

      // 2. Purge existing app settings
      const existingSettings = await svc.entities.NiceAppSettings.list('-created_date', 50);
      if (existingSettings.length > 0) {
        await svc.entities.NiceAppSettings.deleteMany({});
      }

      // 3. Seed the new framework version
      const newVersion = await svc.entities.NiceFrameworkVersion.create({
        version: dataset.version,
        label: dataset.label || `NICE Framework v${dataset.version}`,
        categories: dataset.categories || [],
        work_roles: dataset.work_roles || [],
        tasks: dataset.tasks || [],
        knowledge: dataset.knowledge || [],
        skills: dataset.skills || [],
        is_active: true,
        imported_at: new Date().toISOString(),
      });

      // 4. Create fresh app settings pointing to the new version
      const newSettings = await svc.entities.NiceAppSettings.create({
        setting_key: 'global',
        active_version_id: newVersion.id,
        default_session_duration_hours: 4,
        max_concurrent_instances: 10,
        auto_terminate_idle_minutes: 60,
        branding_name: 'Course Lab Builder',
        enable_ai_generation: true,
      });

      // 5. Flag labs as stale — they were mapped against a previous dataset
      const staleCount = await flagLabsStale(svc, newVersion.id);

      return Response.json({
        success: true,
        message: `NICE v${dataset.version} loaded as exclusive source of truth. ${staleCount} labs flagged for review.`,
        version: newVersion,
        settings: newSettings,
        stale_count: staleCount,
      });
    }

    // ── ACTIVATE VERSION ───────────────────────────────────────────
    if (action === 'activate') {
      const { version_id } = body;
      if (!version_id) return Response.json({ error: 'version_id is required' }, { status: 400 });

      // Deactivate all existing versions
      const allVersions = await svc.entities.NiceFrameworkVersion.list('-created_date', 200);
      for (const v of allVersions) {
        if (v.id !== version_id && v.is_active) {
          await svc.entities.NiceFrameworkVersion.update(v.id, { is_active: false });
        }
      }

      // Activate the selected version
      await svc.entities.NiceFrameworkVersion.update(version_id, { is_active: true });

      // Update app settings to point to new active version
      const settings = await svc.entities.NiceAppSettings.filter({ setting_key: 'global' });
      if (settings.length > 0) {
        await svc.entities.NiceAppSettings.update(settings[0].id, { active_version_id: version_id });
      } else {
        await svc.entities.NiceAppSettings.create({
          setting_key: 'global',
          active_version_id: version_id,
          default_session_duration_hours: 4,
          max_concurrent_instances: 10,
          auto_terminate_idle_minutes: 60,
          branding_name: 'Course Lab Builder',
          enable_ai_generation: true,
        });
      }

      // Flag labs as stale since the active version changed
      const staleCount = await flagLabsStale(svc, version_id);

      return Response.json({
        success: true,
        message: `Version activated. ${staleCount} labs flagged for review.`,
        stale_count: staleCount,
      });
    }

    // ── ADD / UPDATE VERSION (overwrite mode) ─────────────────────
    if (action === 'add_version') {
      const { version, label, categories, work_roles, tasks, knowledge, skills } = body;
      if (!version) return Response.json({ error: 'version is required' }, { status: 400 });

      // Overwrite: if a version with the same number exists, delete it
      const existing = await svc.entities.NiceFrameworkVersion.filter({ version });
      if (existing.length > 0) {
        for (const v of existing) {
          await svc.entities.NiceFrameworkVersion.delete(v.id);
        }
      }

      const newVersion = await svc.entities.NiceFrameworkVersion.create({
        version,
        label: label || `NICE Framework v${version}`,
        categories: categories || [],
        work_roles: work_roles || [],
        tasks: tasks || [],
        knowledge: knowledge || [],
        skills: skills || [],
        is_active: false,
        imported_at: new Date().toISOString(),
      });

      return Response.json({ success: true, version: newVersion });
    }

    if (action === 'update_version') {
      const { version_id, label, is_active } = body;
      if (!version_id) return Response.json({ error: 'version_id is required' }, { status: 400 });

      const updateData = {};
      if (label !== undefined) updateData.label = label;
      if (is_active !== undefined) updateData.is_active = is_active;

      const updated = await svc.entities.NiceFrameworkVersion.update(version_id, updateData);
      return Response.json({ success: true, version: updated });
    }

    // ── DELETE VERSION ─────────────────────────────────────────────
    if (action === 'delete') {
      const { version_id } = body;
      if (!version_id) return Response.json({ error: 'version_id is required' }, { status: 400 });

      const version = await svc.entities.NiceFrameworkVersion.get(version_id);
      if (version?.is_active) {
        return Response.json({ error: 'Cannot delete the active version. Activate another version first.' }, { status: 400 });
      }

      await svc.entities.NiceFrameworkVersion.delete(version_id);
      return Response.json({ success: true, message: 'Version deleted.' });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('niceDatasetManager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Flag all LabTemplate and LabScenario records as stale.
 * Called during version switches and default loads.
 */
async function flagLabsStale(svc, versionId) {
  let count = 0;

  // Flag LabTemplates
  const templates = await svc.entities.LabTemplate.list('-created_date', 500);
  if (templates.length > 0) {
    await svc.entities.LabTemplate.updateMany(
      { nice_stale: { $ne: true } },
      { $set: { nice_stale: true, nice_version_id: versionId } }
    );
    count += templates.length;
  }

  // Flag LabScenarios
  const scenarios = await svc.entities.LabScenario.list('-created_date', 500);
  if (scenarios.length > 0) {
    await svc.entities.LabScenario.updateMany(
      { nice_stale: { $ne: true } },
      { $set: { nice_stale: true, nice_version_id: versionId } }
    );
    count += scenarios.length;
  }

  return count;
}