import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const candidate_name = String(payload.candidate_name || '').trim();
    const candidate_email = String(payload.candidate_email || '').trim().toLowerCase();
    const assessment_id = String(payload.assessment_id || '').trim();
    const position_title = String(payload.position_title || 'Cybersecurity Position').trim();
    const company_name = String(payload.company_name || '').trim();
    const custom_subject = String(payload.custom_subject || '').trim();
    const custom_body = String(payload.custom_body || '').trim();

    if (!candidate_name || !assessment_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate_email)) {
      return Response.json({ error: 'A valid candidate name, email, and assessment are required.' }, { status: 400 });
    }

    // Confirm the caller can read this assessment before issuing an invitation.
    await base44.entities.Assessment.get(assessment_id);

    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32));
    const invite_token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

    let appOrigin = '';
    try {
      const requestedOrigin = new URL(String(payload.app_url || ''));
      if (requestedOrigin.protocol === 'https:' || requestedOrigin.hostname === 'localhost') {
        appOrigin = requestedOrigin.origin;
      }
    } catch {
      // A missing/invalid origin is handled below.
    }
    if (!appOrigin) {
      return Response.json({ error: 'Unable to determine the application URL. Refresh the page and try again.' }, { status: 400 });
    }

    const invitation = await base44.asServiceRole.entities.CandidateInvitation.create({
      assessment_id,
      candidate_name,
      candidate_email,
      invite_token,
      status: 'pending',
      email_delivery_status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by_id: user.id,
    });

    const assessmentLink = `${appOrigin}/candidate-assessment?token=${invite_token}`;
    const emailSubject = custom_subject || `Skills Assessment Invitation — ${position_title}${company_name ? ` at ${company_name}` : ''}`;
    const bodyText = custom_body
      ? escapeHtml(custom_body).replaceAll('\n', '<br/>')
      : `Hello <strong style="color: #fff;">${escapeHtml(candidate_name)}</strong>,<br/><br/>You have been invited to complete a hands-on cybersecurity skills assessment for the <strong style="color: #ef4444;">${escapeHtml(position_title)}</strong> position${company_name ? ` at <strong style="color: #ef4444;">${escapeHtml(company_name)}</strong>` : ''}.`;

    const emailBody = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #e0e0e0; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1a0000, #3a0000); padding: 30px; text-align: center; border-bottom: 2px solid #ef4444;">
      <h1 style="color: #ef4444; margin: 0; font-size: 24px; letter-spacing: 2px;">XTREME I.C.E.</h1>
      <p style="color: #999; margin: 8px 0 0; font-size: 12px; letter-spacing: 1px;">CANDIDATE SKILLS ASSESSMENT</p>
    </div>
    <div style="padding: 35px;">
      <p style="color: #aaa; line-height: 1.7;">${bodyText}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(assessmentLink)}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">START ASSESSMENT</a>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center;">This invitation link is unique to you and expires in 7 days.</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await base44.integrations.Core.SendEmail({
        to: candidate_email,
        subject: emailSubject,
        body: emailBody,
        from_name: company_name || 'Xtreme I.C.E. Assessments',
      });
      const sentAt = new Date().toISOString();
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
        email_delivery_status: 'sent',
        email_delivery_error: '',
        sent_at: sentAt,
      });
      return Response.json({
        success: true,
        invitation_id: invitation.id,
        invite_token,
        assessmentLink,
        emailSent: true,
        sent_at: sentAt,
      });
    } catch (emailError) {
      const emailFailReason = emailError?.message || String(emailError);
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
        email_delivery_status: 'failed',
        email_delivery_error: emailFailReason.slice(0, 500),
      });
      console.error('Candidate invitation email failed:', emailFailReason);
      return Response.json({
        success: false,
        invitation_id: invitation.id,
        assessmentLink,
        emailSent: false,
        emailFailReason,
      });
    }
  } catch (error) {
    console.error('sendCandidateInvite failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
