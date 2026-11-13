import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_RECIPIENTS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CANONICAL_APP_ORIGIN = 'https://xtreme-i-c-e.base44.app';
const BRAND_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/bf3195d06_XtremeICELogo.avif';

const RECOMMENDATION_LABELS = {
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  borderline: 'Borderline',
  no_hire: 'No Hire',
};

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

// The scorecard link must point at a live app host, never a preview origin.
const resolveOrigin = (req) => {
  const header = req.headers.get('x-base44-app-url') || '';
  try {
    const url = new URL(header);
    const host = url.hostname.toLowerCase();
    const allowed = host.endsWith('xsirange.com') || host.endsWith('xtremecandidate.com') || host.endsWith('base44.app');
    if (url.protocol === 'https:' && allowed) return url.origin;
  } catch {
    // fall through to the canonical origin
  }
  return CANONICAL_APP_ORIGIN;
};

const scoreColor = (pct) => (pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626');

const scoreRow = (label, value, note) => {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const color = scoreColor(pct);
  return `<tr>
    <td width="190" style="padding:6px 0;font-size:12px;color:#c90032;vertical-align:middle;">${escapeHtml(label)}${
      note ? `<br><span style="font-size:11px;color:#c90032;">${escapeHtml(note)}</span>` : ''
    }</td>
    <td style="padding:6px 0 6px 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td width="${pct}%" style="background:${color};height:8px;line-height:8px;font-size:0;border-radius:4px;">&nbsp;</td>
          <td width="${100 - pct}%" style="background:#e5e7eb;height:8px;line-height:8px;font-size:0;border-radius:4px;">&nbsp;</td>
        </tr>
      </table>
    </td>
    <td width="48" style="padding:6px 0 6px 12px;text-align:right;font-size:12px;font-weight:700;color:${color};">${pct}%</td>
  </tr>`;
};

const listItems = (items, marker) =>
  (items || [])
    .slice(0, 12)
    .map((item) => `<li style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#c90032;">${escapeHtml(item)}</li>`)
    .join('') || `<li style="margin:0;font-size:13px;color:#c90032;">${marker}</li>`;

const buildReport = (scorecard) => {
  const categories = Object.entries(scorecard.category_scores || {});
  const results = (scorecard.task_results || []).slice(0, 40);
  const recommendation = RECOMMENDATION_LABELS[scorecard.hiring_recommendation] || 'Pending review';
  const passed = !!scorecard.passed;
  const statusColor = passed ? '#16a34a' : '#dc2626';
  const timingNote = scorecard.timing_note || '';

  const categoryRows = categories
    .map(([key, value]) =>
      scoreRow(key.replace(/_/g, ' '), value, key === 'time_management' ? timingNote : ''),
    )
    .join('');

  const taskRows = results
    .map((task) => {
      const correct = task.validation_passed !== false && (task.completion_percentage ?? 0) >= 70;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#000000;">${escapeHtml(task.title || 'Question')}</td>
        <td width="90" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:700;color:${correct ? '#16a34a' : '#dc2626'};">${correct ? 'Correct' : 'Review'}</td>
        <td width="70" align="right" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#000000;">${task.points_earned ?? 0}/${task.points_possible ?? 0}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Inter',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;border-collapse:separate;">
          <tr>
            <td style="background-color:#00d7c5;padding:18px 28px;">
              <img src="${BRAND_LOGO}" alt="Xtreme I.C.E." height="42" style="height:42px;display:block;border:0;" />
              <span style="display:block;margin-top:8px;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#000000;">Xtreme I.C.E.</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25;color:#000000;">Candidate Assessment Report</h1>
              <p style="margin:0;font-size:13px;color:#c90032;">${escapeHtml(scorecard.prepared_for || 'Review copy for personnel')}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;border-collapse:separate;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000000;">${escapeHtml(scorecard.candidate_name || 'Candidate')}</p>
                          <p style="margin:0 0 4px;font-size:13px;color:#c90032;">${escapeHtml(scorecard.candidate_email || '')}</p>
                          <p style="margin:0;font-size:13px;color:#c90032;">${escapeHtml(scorecard.position_title || 'Assessment')}${scorecard.assessment_type ? ` &middot; ${escapeHtml(scorecard.assessment_type)}` : ''}</p>
                        </td>
                        <td width="140" align="right" style="vertical-align:top;">
                          <p style="margin:0;font-size:40px;font-weight:800;line-height:1;color:${statusColor};">${scorecard.overall_score ?? 0}%</p>
                          <p style="margin:4px 0 0;font-size:12px;font-weight:700;letter-spacing:.08em;color:${statusColor};">${passed ? 'PASSED' : 'FAILED'}</p>
                          <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:#000000;">${escapeHtml(recommendation)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 0;">
              <h2 style="margin:0 0 10px;font-size:15px;color:#000000;">Score Breakdown</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${categoryRows}</table>
            </td>
          </tr>
          ${
            scorecard.smart_summary
              ? `<tr>
                  <td style="padding:22px 28px 0;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#000000;">Skillset Synopsis</h2>
                    <p style="margin:0;font-size:13px;line-height:1.65;color:#c90032;">${escapeHtml(scorecard.smart_summary)}</p>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding:22px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" valign="top" style="padding-right:10px;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#16a34a;">Strengths</h2>
                    <ul style="margin:0;padding-left:18px;">${listItems(scorecard.strengths, 'None recorded')}</ul>
                  </td>
                  <td width="50%" valign="top" style="padding-left:10px;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#dc2626;">Areas to Probe</h2>
                    <ul style="margin:0;padding-left:18px;">${listItems(scorecard.weaknesses, 'No gaps identified')}</ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            taskRows
              ? `<tr>
                  <td style="padding:22px 28px 0;">
                    <h2 style="margin:0 0 10px;font-size:15px;color:#000000;">Question-by-Question Results</h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e7eb;">
                      <tr>
                        <th align="left" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#c90032;">Question</th>
                        <th align="left" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#c90032;">Result</th>
                        <th align="right" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#c90032;">Points</th>
                      </tr>
                      ${taskRows}
                    </table>
                  </td>
                </tr>`
              : ''
          }
          ${
            (scorecard.missed_steps || []).length
              ? `<tr>
                  <td style="padding:22px 28px 0;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#ca8a04;">Missed Steps</h2>
                    <ul style="margin:0;padding-left:18px;">${listItems(scorecard.missed_steps, '')}</ul>
                  </td>
                </tr>`
              : ''
          }
          ${
            (scorecard.follow_up_questions || []).length
              ? `<tr>
                  <td style="padding:22px 28px 0;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#000000;">Suggested Interview Follow-Ups</h2>
                    <ol style="margin:0;padding-left:18px;">${listItems(scorecard.follow_up_questions, '')}</ol>
                  </td>
                </tr>`
              : ''
          }
          ${
            scorecard.reviewer_note
              ? `<tr>
                  <td style="padding:22px 28px 0;">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#000000;">Reviewer Note</h2>
                    <p style="margin:0;font-size:13px;line-height:1.65;color:#c90032;background:#f6f7f9;border-radius:10px;padding:14px 16px;">${escapeHtml(scorecard.reviewer_note)}</p>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td align="center" style="padding:26px 28px 8px;">
              <a href="${escapeHtml(scorecard.scorecard_url)}" style="display:inline-block;background-color:#00d7c5;color:#000000;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;padding:14px 30px;border-radius:14px;">Open Full Scorecard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 28px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#c90032;">Prepared by ${escapeHtml(scorecard.prepared_by || 'the hiring team')} on ${escapeHtml(scorecard.generated_on || '')}. This report contains candidate assessment data; share it with authorized reviewers only.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const scorecardId = String(payload?.scorecard_id || '').trim();
    if (!scorecardId) return Response.json({ error: 'A scorecard is required.' }, { status: 400 });

    const recipients = [...new Set(
      (Array.isArray(payload?.recipients) ? payload.recipients : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter((value) => EMAIL_RE.test(value)),
    )].slice(0, MAX_RECIPIENTS);
    if (!recipients.length) {
      return Response.json({ error: 'Add at least one valid reviewer email address.' }, { status: 400 });
    }

    // Reading through the caller's own credentials keeps the scorecard permissions intact.
    const scorecard = await base44.entities.Scorecard
      .get(scorecardId)
      .catch((error) => (error?.status === 404 ? null : Promise.reject(error)));
    if (!scorecard) return Response.json({ error: 'Scorecard not found.' }, { status: 404 });

    const assessment = scorecard.assessment_id
      ? await base44.entities.Assessment
          .get(scorecard.assessment_id)
          .catch((error) => (error?.status === 404 ? null : Promise.reject(error)))
      : null;
    const session = scorecard.session_id
      ? await base44.entities.CandidateSession
          .get(scorecard.session_id)
          .catch((error) => (error?.status === 404 ? null : Promise.reject(error)))
      : null;

    const usedMinutes = Number(session?.time_elapsed_minutes) || 0;
    const allowedMinutes = Number(assessment?.duration_minutes) || 0;
    const timingNote = usedMinutes && allowedMinutes ? `Used ${usedMinutes} of ${allowedMinutes} min` : '';

    const origin = resolveOrigin(req);
    const note = String(payload?.note || '').trim().slice(0, 1200);

    const html = buildReport({
      ...scorecard,
      position_title: assessment?.position_title || '',
      assessment_type: assessment?.assessment_type || '',
      timing_note: timingNote,
      reviewer_note: note,
      prepared_by: user.full_name || user.email || 'the hiring team',
      prepared_for: `${scorecard.candidate_name || 'Candidate'} \u00b7 shared for personnel review`,
      generated_on: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      scorecard_url: `${origin}/scorecard?scorecard_id=${scorecard.id}`,
    });

    const subject = `Candidate Assessment Report \u2014 ${scorecard.candidate_name || 'Candidate'}${
      assessment?.position_title ? ` for ${assessment.position_title}` : ''
    }`;

    const failed = [];
    let sent = 0;
    for (let index = 0; index < recipients.length; index += 4) {
      const chunk = recipients.slice(index, index + 4);
      const settled = await Promise.allSettled(
        chunk.map((to) =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to,
            subject,
            html,
            from_name: 'Xtreme I.C.E. Candidate Review',
            category: 'transactional',
          }),
        ),
      );
      settled.forEach((outcome, position) => {
        const to = chunk[position];
        if (outcome.status === 'rejected') {
          failed.push({ email: to, reason: outcome.reason?.message || String(outcome.reason) });
          return;
        }
        if (outcome.value?.success === false) {
          failed.push({ email: to, reason: outcome.value?.message || outcome.value?.reason || 'Email was not delivered.' });
          return;
        }
        sent += 1;
      });
    }

    if (!sent) {
      return Response.json(
        { error: failed[0]?.reason || 'The report could not be emailed.', failed },
        { status: 502 },
      );
    }

    return Response.json({ success: true, sent, total: recipients.length, failed });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}