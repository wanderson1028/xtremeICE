import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { candidate_name, candidate_email, assessment_id, position_title, company_name, assessment_date, custom_subject, custom_body } = await req.json();

    // Generate a unique invitation token
    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32));
    const invite_token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

    // Create CandidateInvitation record using service role to bypass RLS
    await base44.asServiceRole.entities.CandidateInvitation.create({
      assessment_id,
      candidate_name,
      candidate_email,
      invite_token,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date().toISOString(),
      invited_by_id: user.id,
    });

    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const assessmentLink = `${appUrl}/candidate-assessment?token=${invite_token}`;

    // Send email via Resend
    let emailSent = false;
    let emailFailReason = null;
    try {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const emailSubject = custom_subject || `Skills Assessment Invitation — ${position_title}${company_name ? ` at ${company_name}` : ''}`;
      const bodyText = custom_body
        ? custom_body.replace(/\n/g, '<br/>')
        : `Hello <strong style="color: #fff;">${candidate_name}</strong>,<br/><br/>You have been invited to complete a hands-on cybersecurity skills assessment for the <strong style="color: #ef4444;">${position_title}</strong> position${company_name ? ` at <strong style="color: #ef4444;">${company_name}</strong>` : ''}.`;

      // Build a valid "from" field — RESEND_FROM_EMAIL must be a plain email;
      // if it's missing/invalid, fall back to Resend's sandbox address.
      const rawFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || '';
      const fromName = company_name || 'Xtreme I.C.E. Assessments';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const fromField = rawFromEmail.includes('<')
        ? rawFromEmail
        : emailRegex.test(rawFromEmail)
          ? `${fromName} <${rawFromEmail}>`
          : `${fromName} <onboarding@resend.dev>`;

      const { error: resendError } = await resend.emails.send({
        from: fromField,
        to: candidate_email,
        subject: emailSubject,
        html: `
<!DOCTYPE html>
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
        <a href="${assessmentLink}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">START ASSESSMENT</a>
      </div>
      <p style="color: #666; font-size: 12px; text-align: center;">This invitation link is unique to you and expires in 7 days.</p>
    </div>
  </div>
</body>
</html>`,
      });
      if (resendError) {
        emailFailReason = resendError.message || JSON.stringify(resendError);
        console.warn('Resend error:', emailFailReason);
      } else {
        emailSent = true;
      }
    } catch (emailErr) {
      emailFailReason = emailErr.message || String(emailErr);
      console.warn('Email send failed:', emailFailReason);
    }

    return Response.json({ success: true, invite_token, assessmentLink, emailSent, emailFailReason });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});