import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";

// Training assignment service.
// App admins act across every organization; organization admins and exercise
// creators are confined to the organization their exercise belongs to.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const platformAdmin = user.role === "admin";
    const callerOrg = String(user.organization_id || "");
    const tenantAdmin = !platformAdmin && user.org_role === "org_admin" && Boolean(callerOrg);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "options");
    const users = await base44.asServiceRole.entities.User.list().catch(() => []);

    const inScope = (candidate: any) => {
      if (platformAdmin) return true;
      return Boolean(callerOrg) && String(candidate?.organization_id || "") === callerOrg;
    };

    if (action === "options") {
      const learners = users
        .filter((candidate: any) => inScope(candidate) && candidate?.email)
        .map((candidate: any) => ({
          email: String(candidate.email || ""),
          full_name: candidate.full_name || "",
          org_role: candidate.org_role || "member",
          organization_id: candidate.organization_id || "",
        }));
      return Response.json({
        success: true,
        scope: platformAdmin ? "platform_admin" : tenantAdmin ? "org_admin" : "member",
        organization_id: callerOrg,
        learners,
      });
    }

    if (action === "assign") {
      const exerciseId = String(body?.exercise_id || "").trim();
      if (!exerciseId) return Response.json({ error: "exercise_id is required." }, { status: 400 });

      const exercise = await base44.asServiceRole.entities.TrainingExercise
        .get(exerciseId)
        .catch((error: any) => (error?.status === 404 ? null : Promise.reject(error)));
      if (!exercise) return Response.json({ error: "Exercise not found." }, { status: 404 });

      const exerciseOrg = String(exercise.app_organization_id || "");
      const canAssign =
        platformAdmin ||
        exercise.created_by_id === user.id ||
        (tenantAdmin && exerciseOrg === callerOrg);
      if (!canAssign) {
        return Response.json(
          { error: "You can only assign training for your own organization or exercises you created." },
          { status: 403 }
        );
      }

      const wholeOrganization = Boolean(body?.whole_organization);
      const requested = Array.isArray(body?.emails)
        ? body.emails.map((email: any) => String(email || "").trim().toLowerCase()).filter(Boolean)
        : [];

      let pool = users.filter((candidate: any) => inScope(candidate));
      if (wholeOrganization) {
        pool = pool.filter((candidate: any) => String(candidate?.organization_id || "") === exerciseOrg);
      } else {
        pool = pool.filter((candidate: any) => requested.includes(String(candidate?.email || "").toLowerCase()));
      }

      const targets = new Map<string, any>();
      pool.forEach((candidate: any) => {
        const email = String(candidate?.email || "").toLowerCase();
        if (email) targets.set(email, candidate);
      });
      if (!targets.size) {
        return Response.json(
          {
            error: wholeOrganization
              ? "No learners are available in this organization yet."
              : "Choose at least one learner to assign.",
          },
          { status: 400 }
        );
      }

      const existing = await base44.asServiceRole.entities.TrainingAssignment
        .filter({ exercise_id: exerciseId })
        .catch(() => []);
      const alreadyAssigned = new Set(existing.map((row: any) => String(row.assignee_email || "").toLowerCase()));

      const rows = Array.from(targets.entries())
        .filter(([email]) => !alreadyAssigned.has(email))
        .map(([email, candidate]) => ({
          exercise_id: exerciseId,
          exercise_title: exercise.title || "",
          organization_id: exerciseOrg,
          organization_name: exercise.organization_name || "",
          assignee_email: email,
          assignee_name: candidate.full_name || email,
          assignment_scope: wholeOrganization ? "organization" : "user",
          assigned_by_email: user.email || "",
          assigned_by_name: user.full_name || user.email || "",
          status: "assigned",
          assigned_at: new Date().toISOString(),
        }));

      if (rows.length) await base44.asServiceRole.entities.TrainingAssignment.bulkCreate(rows);

      const assignedEmails = Array.from(
        new Set([
          ...((exercise.assigned_emails || []).map((email: any) => String(email || "").toLowerCase()).filter(Boolean)),
          ...targets.keys(),
        ])
      );
      await base44.asServiceRole.entities.TrainingExercise.update(exerciseId, { assigned_emails: assignedEmails });

      return Response.json({
        success: true,
        created: rows.length,
        skipped: targets.size - rows.length,
        total_assigned: assignedEmails.length,
      });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}