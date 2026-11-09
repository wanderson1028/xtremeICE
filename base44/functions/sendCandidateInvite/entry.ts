import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_CANDIDATES = 100;
const BATCH_SIZE = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const newToken = () => {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buffer).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

function buildEmail({ candidateName, positionTitle, companyName, assessmentLink, isTest }) {
  const label = isTest ? 'CANDIDATE APPLICATION TEST' : 'CANDIDATE SKILLS ASSESSMENT';
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #e0e0e0; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1a0000, #3a0000); padding: 30px; text-align: center; border-bottom: 2px solid #ef4444;">
      <h1 style="color: #ef4444; margin: 0; font-size: 24px; letter-spacing: 2px;">XTREME I.C.E.</h1>
      <p style="color: #999; margin: 8px 0 0; font-size: 12px; letter-spacing: 1px;">${label}</p>
    </div>
    <div style="padding: 35px;">
      <p style="color: #aaa; line-height: 1.7;">Hello <strong style="color: #fff;">${escapeHtml(candidateName)}</strong>,<br/><br/>You have been invited to complete a ${isTest ? 'timed application test' : 'hands-on cybersecurity skills assessment'} for the <strong style="color: #ef4444;">${escapeHtml(positionTitle)}</strong> position${companyName ? ` at <strong style="color: #ef4444;">${escapeHtml(companyName)}</strong>` : ''}.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(assessmentLink)}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">${isTest ? 'START TEST' : 'START ASSESSMENT'}</a>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center;">This invitation link is unique to you and expires in 7 days.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const batchMode = Array.isArray(payload?.candidates);

    const rawCandidates = batchMode
      ? payload.candidates.slice(0, MAX_CANDIDATES).map((entry) => ({
          name: String(entry?.candidate_name ?? entry?.name ?? '').trim(),
          email: String(entry?.candidate_email ?? entry?.email ?? '').trim().toLowerCase(),
        }))
      : [{
          name: String(payload.candidate_name || '').trim(),
          email: String(payload.candidate_email || '').trim().toLowerCase(),
        }];

    if (!rawCandidates.length) {
      return Response.json({ error: 'Add at least one candidate.' }, { status: 400 });
    }

    const assessment_id = String(payload.assessment_id || '').trim();
    if (!assessment_id) {
      return Response.json({ error: 'An assessment is required.' }, { status: 400 });
    }

    // Confirm the caller can read this assessment before issuing invitations.
    const assessment = await base44.entities.Assessment
      .get(assessment_id)
      .catch((error) => (error?.status === 404 ? null : Promise.reject(error)));
    if (!assessment) return Response.json({ error: 'Assessment not found.' }, { status: 404 });

    // Use the assessment's own fields (not caller-provided) to prevent brand spoofing.
    const position_title = String(assessment.position_title || 'Cybersecurity Position').trim();
    const company_name = String(assessment.company_name || '').trim();
    const isTest = assessment.assessment_kind === 'application_test';

    // The invitation link origin is resolved server-side. The caller's app_url is only
    // honoured when it is the app's own configured URL or a *.base44.app host, so this
    // endpoint can never be pointed at a site the caller controls.
    const configuredOrigin = (() => {
      try {
        const configured = new URL(String(Deno.env.get('BASE44_APP_URL') || ''));
        return configured.protocol === 'https:' ? configured.origin : '';
      } catch {
        return '';
      }
    })();
    let appOrigin = configuredOrigin;
    try {
      const requested = new URL(String(payload.app_url || ''));
      const isOwnOrigin = Boolean(configuredOrigin) && requested.origin === configuredOrigin;
      const isPlatformHost = requested.protocol === 'https:' && /(^|\.)base44\.app$/i.test(requested.hostname);
      if (requested.protocol === 'https:' && (isOwnOrigin || isPlatformHost)) {
        appOrigin = requested.origin;
      } else if (!appOrigin && requested.hostname === 'localhost') {
        appOrigin = requested.origin;
      }
    } catch {
      // Handled below.
    }
    if (!appOrigin) {
      return Response.json({ error: 'Unable to determine the application URL. Refresh the page and try again.' }, { status: 400 });
    }

    // Volume guard so a single caller cannot use this endpoint as an open mail relay.
    const HOURLY_INVITE_CAP = 300;
    const sentByCallerLastHour = await base44.asServiceRole.entities.CandidateInvitation.filter({
      invited_by_id: user.id,
      created_date: { $gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    });
    if (sentByCallerLastHour.length >= HOURLY_INVITE_CAP) {
      return Response.json(
        { error: 'Invitation limit reached for this hour. Please try again later.' },
        { status: 429 },
      );
    }

    // Validate and de-duplicate before sending anything.
    const seen = new Set();
    const results = rawCandidates.map((candidate) => {
      if (!candidate.name || !EMAIL_RE.test(candidate.email)) {
        return {
          candidate_name: candidate.name,
          candidate_email: candidate.email,
          ok: false,
          emailSent: false,
          reason: !candidate.name ? 'Candidate name is required.' : 'A valid email address is required.',
        };
      }
      if (seen.has(candidate.email)) {
        return {
          candidate_name: candidate.name,
          candidate_email: candidate.email,
          ok: false,
          emailSent: false,
          reason: 'This candidate is already included in this batch.',
        };
      }
      seen.add(candidate.email);
      return { candidate_name: candidate.name, candidate_email: candidate.email, ok: true, pending: true };
    });

    const valid = results.filter((entry) => entry.pending);
    if (!valid.length && !batchMode) {
      return Response.json({ error: 'A valid candidate name, email, and assessment are required.' }, { status: 400 });
    }

    const sendOne = async (entry) => {
      const invite_token = newToken();
      const invitation = await base44.asServiceRole.entities.CandidateInvitation.create({
        assessment_id,
        candidate_name: entry.candidate_name,
        candidate_email: entry.candidate_email,
        invite_token,
        status: 'pending',
        email_delivery_status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by_id: user.id,
      });

      const assessmentLink = `${appOrigin}/candidate-assessment?token=${invite_token}`;

      try {
        await base44.integrations.Core.SendEmail({
          to: entry.candidate_email,
          subject: `${isTest ? 'Application Test Invitation' : 'Skills Assessment Invitation'} — ${position_title}${company_name ? ` at ${company_name}` : ''}`,
          body: buildEmail({
            candidateName: entry.candidate_name,
            positionTitle: position_title,
            companyName: company_name,
            assessmentLink,
            isTest,
          }),
          from_name: company_name || 'Xtreme I.C.E. Assessments',
        });
        const sentAt = new Date().toISOString();
        await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
          email_delivery_status: 'sent',
          email_delivery_error: '',
          sent_at: sentAt,
        });
        return {
          ...entry,
          pending: false,
          ok: true,
          emailSent: true,
          invitation_id: invitation.id,
          invite_token,
          assessmentLink,
          sent_at: sentAt,
        };
      } catch (emailError) {
        const reason = emailError?.message || String(emailError);
        await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
          email_delivery_status: 'failed',
          email_delivery_error: reason.slice(0, 500),
        });
        console.error('Candidate invitation email failed:', reason);
        return {
          ...entry,
          pending: false,
          ok: true,
          emailSent: false,
          invitation_id: invitation.id,
          invite_token,
          assessmentLink,
          reason,
        };
      }
    };

    // Send in small batches to respect the worker's connection limit.
    for (let index = 0; index < valid.length; index += BATCH_SIZE) {
      const chunk = valid.slice(index, index + BATCH_SIZE);
      const settled = await Promise.allSettled(chunk.map(sendOne));
      settled.forEach((outcome, position) => {
        if (outcome.status === 'rejected') {
          const entry = chunk[position];
          entry.pending = false;
          entry.ok = false;
          entry.emailSent = false;
          entry.reason = outcome.reason?.message || String(outcome.reason);
        } else {
          Object.assign(chunk[position], outcome.value);
        }
      });
    }

    const cleaned = results.map((entry) => {
      const { pending, ...rest } = entry;
      return rest;
    });

    const summary = {
      success: true,
      total: cleaned.length,
      sent: cleaned.filter((entry) => entry.emailSent).length,
      failed: cleaned.filter((entry) => !entry.emailSent).length,
      results: cleaned,
    };

    if (batchMode) return Response.json(summary);

    return Response.json({
      ...summary,
      invitation_id: cleaned[0]?.invitation_id,
      invite_token: cleaned[0]?.invite_token,
      assessmentLink: cleaned[0]?.assessmentLink,
      emailSent: cleaned[0]?.emailSent === true,
      emailFailReason: cleaned[0]?.emailSent ? '' : cleaned[0]?.reason || '',
      sent_at: cleaned[0]?.sent_at || null,
    });
  } catch (error) {
    console.error('sendCandidateInvite failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});