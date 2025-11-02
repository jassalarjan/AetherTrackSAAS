import pkg from 'nodemailer';
const { createTransport } = pkg;

// Create reusable transporter
const createTransporter = () => {
  return createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// HTML Email Template for New User Credentials
const getCredentialEmailTemplate = (fullName, email, password, appUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TaskFlow</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px 30px;
      text-align: center;
      color: white;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
      opacity: 0.3;
    }
    .logo-container {
      background: white;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 1;
    }
    .logo-container img {
      width: 70px;
      height: 70px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
      font-weight: 400;
      position: relative;
      z-index: 1;
    }
    .content {
      padding: 50px 40px;
    }
    .greeting {
      font-size: 24px;
      color: #1a1a1a;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .greeting-wave {
      display: inline-block;
      animation: wave 0.5s ease-in-out;
    }
    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(20deg); }
      75% { transform: rotate(-20deg); }
    }
    .message {
      color: #4a5568;
      margin-bottom: 30px;
      font-size: 16px;
      line-height: 1.8;
    }
    .credentials-box {
      background: linear-gradient(135deg, #f6f8ff 0%, #f0f4ff 100%);
      border: 2px solid #e0e7ff;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
    }
    .credentials-box h3 {
      margin: 0 0 20px 0;
      color: #667eea;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .credential-item {
      margin: 16px 0;
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e0e7ff;
    }
    .credential-label {
      font-weight: 600;
      color: #667eea;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: block;
    }
    .credential-value {
      color: #1a1a1a;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
      font-size: 16px;
      font-weight: 600;
      word-break: break-all;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .btn {
      display: inline-block;
      padding: 18px 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      letter-spacing: 0.5px;
    }
    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
    }
    .security-notice {
      background: linear-gradient(135deg, #fff7e6 0%, #ffe8cc 100%);
      border: 2px solid #ffd699;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      display: flex;
      align-items: start;
      gap: 15px;
    }
    .security-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .security-notice p {
      margin: 0;
      color: #996300;
      font-size: 15px;
      line-height: 1.6;
    }
    .security-notice strong {
      color: #cc7a00;
      font-weight: 700;
    }
    .footer {
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      padding: 40px 30px;
      text-align: center;
      color: #cbd5e0;
    }
    .footer-logo {
      width: 40px;
      height: 40px;
      margin: 0 auto 15px;
      opacity: 0.9;
      display: block;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
    }
    .footer strong {
      color: #ffffff;
      font-weight: 700;
    }
    .footer a {
      color: #90cdf4;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      color: #63b3ed;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #e0e7ff 50%, transparent 100%);
      margin: 35px 0;
    }
    .features {
      margin: 35px 0;
      background: #f8fafc;
      padding: 30px;
      border-radius: 12px;
    }
    .features h3 {
      color: #1a1a1a;
      margin-bottom: 25px;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .feature-item {
      background: white;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #e0e7ff;
      transition: transform 0.2s;
    }
    .feature-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
    }
    .feature-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .feature-title {
      color: #667eea;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .feature-text {
      color: #4a5568;
      font-size: 13px;
      line-height: 1.5;
    }
    @media only screen and (max-width: 600px) {
      .feature-grid {
        grid-template-columns: 1fr;
      }
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 40px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <img src="https://taskflow-nine-phi.vercel.app/logo.png" alt="TaskFlow Logo" />
        </div>
        <h1>Welcome to TaskFlow! 🚀</h1>
        <p>Your account is ready to go</p>
      </div>
      
      <div class="content">
        <div class="greeting">
          <span class="greeting-wave">👋</span> Hi <strong>${fullName}</strong>!
        </div>
        
        <div class="message">
          <p>We're excited to have you on board! Your TaskFlow account has been created and you're all set to start managing tasks like a pro.</p>
          <p>TaskFlow is your all-in-one collaborative workspace where teams come together to get things done efficiently.</p>
        </div>

        <div class="credentials-box">
          <h3>
            <span>🔐</span>
            Your Login Credentials
          </h3>
          <div class="credential-item">
            <span class="credential-label">📧 Email Address</span>
            <div class="credential-value">${email}</div>
          </div>
          <div class="credential-item">
            <span class="credential-label">🔑 Temporary Password</span>
            <div class="credential-value">${password}</div>
          </div>
        </div>

        <div class="security-notice">
          <div class="security-icon">⚠️</div>
          <p><strong>Security First:</strong> Please change your password after your first login. Head to Settings → Change Password to set a secure password of your choice.</p>
        </div>

        <div class="button-container">
          <a href="${appUrl}" class="btn">🚀 Launch TaskFlow</a>
        </div>

        <div class="divider"></div>

        <div class="features">
          <h3>✨ What's Waiting for You</h3>
          
          <div class="feature-grid">
            <div class="feature-item">
              <div class="feature-icon">📋</div>
              <div class="feature-title">Task Management</div>
              <div class="feature-text">Create, assign, and track tasks with ease</div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📊</div>
              <div class="feature-title">Kanban Boards</div>
              <div class="feature-text">Visualize workflow with drag-and-drop</div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">👥</div>
              <div class="feature-title">Team Collaboration</div>
              <div class="feature-text">Work together in real-time</div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📈</div>
              <div class="feature-title">Analytics & Reports</div>
              <div class="feature-text">Track progress with insights</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="message" style="text-align: center;">
          <p style="font-size: 16px; color: #4a5568;">Need help getting started? Your admin team is here to support you! 💪</p>
          <p style="font-size: 18px; font-weight: 600; color: #667eea; margin-top: 20px;">Let's make productivity happen! 🎯</p>
        </div>
      </div>

      <div class="footer">
        <img src="https://taskflow-nine-phi.vercel.app/logo.png" alt="TaskFlow" class="footer-logo" />
        <p><strong>TaskFlow</strong></p>
        <p>Collaborative Task Management System</p>
        <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">This is an automated message. Please do not reply.</p>
        <p style="margin-top: 15px;">
          <a href="${appUrl}">🌐 Visit TaskFlow</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// Send credential email to new user
export const sendCredentialEmail = async (fullName, email, password) => {
  try {
    const transporter = createTransporter();
    // Use Vercel URL in production, fallback to CLIENT_URL or localhost
    const appUrl = process.env.NODE_ENV === 'production' 
      ? 'https://taskflow-nine-phi.vercel.app'
      : (process.env.CLIENT_URL || 'http://localhost:3000');

    const mailOptions = {
      from: {
        name: 'TaskFlow Team',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🎉 Welcome to TaskFlow - Your Account is Ready!',
      html: getCredentialEmailTemplate(fullName, email, password, appUrl),
      // Plain text fallback
      text: `
Welcome to TaskFlow!

Hi ${fullName},

Your TaskFlow account has been successfully created! 🎉

LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: ${email}
🔑 Password: ${password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Login here: ${appUrl}

⚠️ IMPORTANT: Please change your password after your first login for security.

WHAT YOU CAN DO:
✓ Manage tasks and projects
✓ Use Kanban boards
✓ Collaborate with your team
✓ Track progress with analytics

Need help? Contact your administrator!

Best regards,
The TaskFlow Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TaskFlow - Collaborative Task Management
${appUrl}
      `.trim()
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Credential email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending credential email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (fullName, email, newPassword) => {
  try {
    const transporter = createTransporter();
    // Use Vercel URL in production, fallback to CLIENT_URL or localhost
    const appUrl = process.env.NODE_ENV === 'production' 
      ? 'https://taskflow-nine-phi.vercel.app'
      : (process.env.CLIENT_URL || 'http://localhost:3000');

    const mailOptions = {
      from: {
        name: 'TaskFlow Team',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔑 TaskFlow - Password Reset',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .credentials-box {
      background: #f8f9fa;
      border-left: 4px solid #f5576c;
      padding: 20px;
      margin: 25px 0;
      border-radius: 5px;
    }
    .credential-item {
      margin: 12px 0;
    }
    .credential-label {
      font-weight: 600;
      color: #555;
      font-size: 14px;
    }
    .credential-value {
      color: #333;
      font-family: 'Courier New', monospace;
      background: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #ddd;
      font-size: 14px;
      margin-top: 5px;
      display: inline-block;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 35px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      text-decoration: none;
      border-radius: 25px;
      font-weight: 600;
      font-size: 16px;
    }
    .security-notice {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 25px 0;
      border-radius: 5px;
      color: #856404;
      font-size: 14px;
    }
    .footer {
      background: #f8f9fa;
      padding: 25px;
      text-align: center;
      color: #6c757d;
      font-size: 13px;
      border-top: 1px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Password Reset</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${fullName}</strong>,</p>
      
      <p>Your password has been reset by an administrator. Here is your new temporary password:</p>

      <div class="credentials-box">
        <div class="credential-item">
          <div class="credential-label">Email:</div>
          <div class="credential-value">${email}</div>
        </div>
        <div class="credential-item">
          <div class="credential-label">New Password:</div>
          <div class="credential-value">${newPassword}</div>
        </div>
      </div>

      <div class="security-notice">
        <strong>⚠️ Important:</strong> Please change this password immediately after logging in for security purposes.
      </div>

      <div class="button-container">
        <a href="${appUrl}" class="btn">Login to TaskFlow</a>
      </div>
    </div>

    <div class="footer">
      <p><strong>TaskFlow</strong> - Collaborative Task Management System</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
Password Reset

Hi ${fullName},

Your password has been reset. Here is your new temporary password:

Email: ${email}
New Password: ${newPassword}

Please login at: ${appUrl}

Important: Please change this password immediately after logging in.

Best regards,
TaskFlow Team
      `.trim()
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendCredentialEmail,
  sendPasswordResetEmail
};
