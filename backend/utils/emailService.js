import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .message {
      color: #555;
      margin-bottom: 30px;
      font-size: 15px;
    }
    .credentials-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 5px;
    }
    .credentials-box h3 {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 16px;
      font-weight: 600;
    }
    .credential-item {
      margin: 12px 0;
      display: flex;
      align-items: center;
    }
    .credential-label {
      font-weight: 600;
      color: #555;
      min-width: 100px;
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
      flex: 1;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 35px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 25px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .security-notice {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 25px 0;
      border-radius: 5px;
    }
    .security-notice p {
      margin: 0;
      color: #856404;
      font-size: 14px;
    }
    .security-notice strong {
      color: #856404;
      font-weight: 600;
    }
    .footer {
      background: #f8f9fa;
      padding: 25px;
      text-align: center;
      color: #6c757d;
      font-size: 13px;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e9ecef;
      margin: 25px 0;
    }
    .features {
      margin: 25px 0;
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin: 15px 0;
    }
    .feature-icon {
      background: #667eea;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .feature-text {
      color: #555;
      font-size: 14px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Welcome to TaskFlow</h1>
      <p>Your account has been created successfully</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi <strong>${fullName}</strong>,
      </div>
      
      <div class="message">
        <p>Welcome to <strong>TaskFlow</strong> - your collaborative task management platform! Your account has been successfully created by an administrator.</p>
        <p>You can now access the platform and start collaborating with your team on tasks and projects.</p>
      </div>

      <div class="credentials-box">
        <h3>🔐 Your Login Credentials</h3>
        <div class="credential-item">
          <span class="credential-label">Email:</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Password:</span>
          <span class="credential-value">${password}</span>
        </div>
      </div>

      <div class="security-notice">
        <p><strong>⚠️ Security Notice:</strong> For your security, please change your password after your first login. You can do this from the Settings page.</p>
      </div>

      <div class="button-container">
        <a href="${appUrl}" class="btn">Login to TaskFlow</a>
      </div>

      <div class="divider"></div>

      <div class="features">
        <h3 style="color: #333; margin-bottom: 20px;">✨ What you can do:</h3>
        
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <div class="feature-text">
            <strong>Manage Tasks:</strong> Create, assign, and track tasks across different statuses
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <div class="feature-text">
            <strong>Kanban Board:</strong> Visualize your workflow with drag-and-drop task management
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <div class="feature-text">
            <strong>Team Collaboration:</strong> Work together with your team members in real-time
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <div class="feature-text">
            <strong>Analytics:</strong> Track progress and performance with detailed insights
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="message">
        <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to your administrator or team lead.</p>
        <p>Happy tasking! 🎯</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>TaskFlow</strong> - Collaborative Task Management System</p>
      <p>This is an automated email. Please do not reply to this message.</p>
      <p style="margin-top: 15px;">
        <a href="${appUrl}">Visit TaskFlow</a>
      </p>
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
    const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const mailOptions = {
      from: {
        name: 'TaskFlow',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🎉 Welcome to TaskFlow - Your Account Credentials',
      html: getCredentialEmailTemplate(fullName, email, password, appUrl),
      // Plain text fallback
      text: `
Welcome to TaskFlow!

Hi ${fullName},

Your account has been successfully created. Here are your login credentials:

Email: ${email}
Password: ${password}

Please login at: ${appUrl}

For security, please change your password after your first login.

Best regards,
TaskFlow Team
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
    const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const mailOptions = {
      from: {
        name: 'TaskFlow',
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
