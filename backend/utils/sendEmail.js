const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const canSendEmail = () => {
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  if (!user || !pass) return false;
  // Prevent silent confusion when placeholder values are still present.
  if (user.includes('your-email@gmail.com') || pass.includes('your-gmail-app-password')) {
    return false;
  }
  return true;
};

const getEmailConfigStatus = () => {
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  const hasUser = Boolean(user);
  const hasPass = Boolean(pass);
  const usesPlaceholders =
    user.includes('your-email@gmail.com') || pass.includes('your-gmail-app-password');

  return {
    configured: hasUser && hasPass && !usesPlaceholders,
    hasUser,
    hasPass,
    usesPlaceholders,
    userPreview: hasUser ? `${user.slice(0, 3)}***${user.slice(user.indexOf('@'))}` : null
  };
};

const verifyEmailConnection = async () => {
  const status = getEmailConfigStatus();
  if (!status.configured) {
    return { ok: false, reason: 'Email credentials not configured properly', ...status };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { ok: true, reason: 'SMTP verified', ...status };
  } catch (err) {
    return { ok: false, reason: err.message, ...status };
  }
};

const sendMail = async ({ to, subject, html }) => {
  if (!canSendEmail()) {
    console.log('⚠️  Email credentials not configured. Skipping email notification.');
    return false;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Smart City Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to} — Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('Email sending failed:', err.message);
    return false;
  }
};

const sendComplaintReceivedEmail = async (to, name, issueType, trackingId) => {
  return sendMail({
    to,
    subject: '📌 Complaint Received — Smart City Portal',
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:22px 24px;color:#fff">
          <h2 style="margin:0;font-size:20px;">Smart City Portal</h2>
          <p style="margin:6px 0 0;opacity:.9;">Complaint submission confirmation</p>
        </div>
        <div style="padding:24px;color:#374151">
          <p style="margin:0 0 12px;">Hello <strong>${name}</strong>,</p>
          <p style="margin:0 0 14px;line-height:1.6;">We received your complaint for <strong>${issueType}</strong>. Our team will review it and keep you updated.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b">Tracking ID</p>
            <p style="margin:0;font-family:monospace;font-weight:700;color:#0f172a">${trackingId || 'N/A'}</p>
          </div>
          <p style="margin:14px 0 0;font-size:13px;color:#6b7280">Use this ID to track complaint status from the portal.</p>
        </div>
      </div>
    `
  });
};

const sendAdminNewComplaintEmail = async (adminEmail, complaint) => {
  if (!adminEmail) {
    return false;
  }

  return sendMail({
    to: adminEmail,
    subject: `🚨 New Complaint Reported — ${complaint.issueType || 'Issue'}`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:620px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#0f172a;padding:18px 22px;color:#fff">
          <h2 style="margin:0;font-size:19px;">New Complaint Alert</h2>
        </div>
        <div style="padding:22px;color:#374151">
          <table width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
            <tr><td style="color:#64748b;width:140px">Tracking ID</td><td><strong>${complaint.trackingId || 'N/A'}</strong></td></tr>
            <tr><td style="color:#64748b">Name</td><td>${complaint.name || '-'}</td></tr>
            <tr><td style="color:#64748b">Email</td><td>${complaint.email || '-'}</td></tr>
            <tr><td style="color:#64748b">Category</td><td>${complaint.issueType || '-'}</td></tr>
            <tr><td style="color:#64748b">Address</td><td>${complaint.location?.address || '-'}</td></tr>
            <tr><td style="color:#64748b">Description</td><td>${complaint.description || '-'}</td></tr>
          </table>
        </div>
      </div>
    `
  });
};

const sendResolutionEmail = async (to, name, issueType, complaintId, adminNotes) => {
  return sendMail({
    to,
    subject: '✅ Your Complaint Has Been Resolved — Smart City Portal',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f7fb; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 40px 30px; text-align:center;">
              <div style="font-size:40px; margin-bottom:10px;">🏙️</div>
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.5px;">Smart City Portal</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.75); font-size:14px;">Issue Reporting System</p>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 12px; padding: 20px; text-align:center; margin: 30px 0 0; border: 1px solid #86efac;">
                <div style="font-size:28px; margin-bottom:6px;">✅</div>
                <p style="margin:0; font-size:18px; font-weight:700; color:#16a34a;">Issue Resolved!</p>
              </div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin:0 0 16px; font-size:16px; color:#374151;">Hello <strong>${name}</strong>,</p>
              <p style="margin:0 0 24px; font-size:15px; color:#6b7280; line-height:1.6;">
                Great news! Your complaint has been reviewed and successfully resolved by our city maintenance team. Thank you for helping us build a better city.
              </p>
              
              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Complaint Details</p>
                    <table width="100%" cellpadding="6" cellspacing="0">
                      <tr>
                        <td style="font-size:13px; color:#64748b; width:140px;">Complaint ID</td>
                        <td style="font-size:13px; color:#1e293b; font-weight:600; font-family:monospace;">#${String(complaintId).slice(-8).toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px; color:#64748b;">Issue Type</td>
                        <td style="font-size:13px; color:#1e293b; font-weight:600;">${issueType}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px; color:#64748b;">Status</td>
                        <td><span style="background:#dcfce7; color:#16a34a; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px;">Resolved</span></td>
                      </tr>
                      ${adminNotes ? `<tr>
                        <td style="font-size:13px; color:#64748b; vertical-align:top;">Admin Notes</td>
                        <td style="font-size:13px; color:#374151; font-style:italic;">"${adminNotes}"</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin:24px 0 0; font-size:14px; color:#9ca3af; line-height:1.6;">
                If you still experience this issue, you can submit a new complaint through the Smart City Portal. Your continued engagement helps us serve you better.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:24px 40px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">© 2024 Smart City Portal. All rights reserved.</p>
              <p style="margin:4px 0 0; font-size:11px; color:#c4c9d4;">This is an automated notification. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
  });
};

const sendStatusUpdateEmail = async (to, name, issueType, status, complaintId, adminNotes = '') => {
  const statusColors = {
    'In Progress': { bg: '#fef9c3', text: '#854d0e', badge: '#eab308' },
    'Pending': { bg: '#fef2f2', text: '#991b1b', badge: '#ef4444' },
    'Resolved': { bg: '#dcfce7', text: '#166534', badge: '#22c55e' }
  };
  const colors = statusColors[status] || statusColors['Pending'];

  return sendMail({
    to,
    subject: `📋 Complaint Update — ${status} | Smart City Portal`,
    html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:500px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb); padding:30px; text-align:center;">
            <h2 style="margin:0; color:#fff;">🏙️ Smart City Portal</h2>
          </div>
          <div style="padding:30px;">
            <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
            <p style="color:#6b7280;">Your complaint <strong>(#${String(complaintId).slice(-8).toUpperCase()})</strong> regarding <strong>${issueType}</strong> has been updated.</p>
            <div style="text-align:center; margin:20px 0;">
              <span style="background:${colors.bg}; color:${colors.text}; font-weight:700; padding:8px 20px; border-radius:20px; font-size:15px;">Status: ${status}</span>
            </div>
            ${adminNotes ? `<p style="color:#374151; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;"><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
            <p style="color:#9ca3af; font-size:13px;">We'll notify you again when your issue is fully resolved.</p>
          </div>
        </div>
      `
  });
};

module.exports = {
  sendComplaintReceivedEmail,
  sendAdminNewComplaintEmail,
  sendResolutionEmail,
  sendStatusUpdateEmail,
  getEmailConfigStatus,
  verifyEmailConnection
};
