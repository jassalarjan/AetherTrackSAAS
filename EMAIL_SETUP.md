# Email Service Setup Guide

## Overview
The TaskFlow application now includes automated email notifications for user account creation and password resets using **Nodemailer** with beautiful HTML templates.

## Features

### 1. **New User Welcome Email**
When an admin or HR creates a new user account, an automated email is sent containing:
- Welcome message with branding
- Login credentials (email and password)
- Security notice to change password after first login
- Direct login link
- Feature highlights of the platform
- Professional HTML template with responsive design

### 2. **Password Reset Email**
When an admin or HR resets a user's password, an automated email is sent containing:
- Password reset notification
- New temporary password
- Security warning to change password immediately
- Direct login link
- Professional HTML template

## Email Configuration

### Step 1: Choose Your Email Provider

The system supports multiple email providers. Update the `.env` file in the `backend` folder:

#### **Gmail (Recommended for Testing)**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
```

#### **Outlook/Hotmail**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### **Yahoo Mail**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

#### **Custom SMTP Server**
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

### Step 2: Gmail Setup (Detailed Instructions)

If using Gmail, you **must** use an App Password (not your regular password):

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Visit [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Name it "TaskFlow" or "Nodemailer"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Update .env File**
   ```env
   EMAIL_USER=youremail@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop  # The generated app password
   ```

### Step 3: Test the Email Service

After configuring your email settings:

1. **Restart the Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Create a Test User**
   - Login as admin/HR user
   - Navigate to User Management
   - Click "Create User"
   - Fill in the form and submit
   - Check the new user's email inbox

3. **Check Console Logs**
   - Success: `✅ Credential email sent successfully: <message-id>`
   - Failure: `❌ Error sending credential email: <error-message>`

## Email Templates

### Welcome Email Template Features
- **Professional Header** with gradient background
- **Credentials Box** with styled email and password display
- **Security Notice** with warning about changing password
- **Call-to-Action Button** for direct login
- **Feature Highlights** showcasing platform capabilities
- **Responsive Design** that works on all devices
- **Plain Text Fallback** for email clients that don't support HTML

### Password Reset Template Features
- **Clear Subject Line** indicating password reset
- **Credential Display** with new temporary password
- **Security Warning** to change password immediately
- **Login Button** for quick access
- **Professional Footer** with branding

## API Response

When a user is created or password is reset, the API response includes an `emailSent` field:

```json
{
  "message": "User created successfully",
  "user": { ... },
  "emailSent": true
}
```

- `emailSent: true` - Email sent successfully
- `emailSent: false` - Email failed to send (user still created/updated)

## Error Handling

The email service is designed to **not block** user creation:
- If email fails to send, the user account is still created
- Error is logged to console with warning symbol
- Frontend can display a warning about email delivery failure
- Admins can manually share credentials if needed

## Troubleshooting

### Issue: "Invalid login: 535-5.7.8 Username and Password not accepted"
**Solution:** You're using your regular Gmail password. Use an App Password instead.

### Issue: "self signed certificate in certificate chain"
**Solution:** Your SMTP server uses self-signed SSL. Try setting `EMAIL_SECURE=false`

### Issue: "ECONNREFUSED" or "Connection timeout"
**Solution:** 
- Check your firewall/antivirus settings
- Verify EMAIL_HOST and EMAIL_PORT are correct
- Ensure your network allows outbound SMTP connections

### Issue: Email goes to spam folder
**Solution:**
- Use a verified domain email address
- Set up SPF, DKIM, and DMARC records (for production)
- Ask recipients to whitelist the sender address

### Issue: "Unauthorized" error
**Solution:**
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Check if 2FA is required for your email provider
- Generate and use an app-specific password

## Production Recommendations

For production deployment:

1. **Use a Professional Email Service**
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

2. **Use Environment-Specific Credentials**
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=SG.your-sendgrid-api-key
   ```

3. **Set Up Domain Authentication**
   - SPF records
   - DKIM signing
   - DMARC policy

4. **Monitor Email Delivery**
   - Track bounce rates
   - Monitor spam complaints
   - Review delivery logs

## File Structure

```
backend/
├── utils/
│   └── emailService.js        # Email service with templates
├── routes/
│   └── users.js              # User routes with email integration
└── .env                      # Email configuration
```

## Email Service Functions

### `sendCredentialEmail(fullName, email, password)`
Sends welcome email with login credentials to newly created users.

**Parameters:**
- `fullName` - User's full name
- `email` - User's email address
- `password` - Plain text password (sent before hashing)

**Returns:**
```javascript
{ success: true, messageId: '<message-id>' }
// or
{ success: false, error: 'error message' }
```

### `sendPasswordResetEmail(fullName, email, newPassword)`
Sends password reset notification with new temporary password.

**Parameters:**
- `fullName` - User's full name
- `email` - User's email address
- `newPassword` - New temporary password

**Returns:**
```javascript
{ success: true, messageId: '<message-id>' }
// or
{ success: false, error: 'error message' }
```

## Testing Tips

1. **Use a Test Email Service** during development:
   - [Mailtrap.io](https://mailtrap.io) - Catches all emails in a sandbox
   - [Ethereal Email](https://ethereal.email) - Free fake SMTP service

2. **Check Email HTML Rendering:**
   - Use tools like [Litmus](https://litmus.com) or [Email on Acid](https://www.emailonacid.com)
   - Test in multiple email clients (Gmail, Outlook, Apple Mail)

3. **Verify Spam Score:**
   - Use [Mail Tester](https://www.mail-tester.com)
   - Aim for a score above 8/10

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test email configuration with a simple test script
4. Review nodemailer documentation: https://nodemailer.com

---

**Last Updated:** October 31, 2025
**Version:** 1.0.0
