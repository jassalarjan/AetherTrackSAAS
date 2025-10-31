# Quick Email Setup Guide

## 🚀 Quick Start (Gmail)

### 1. Enable 2-Factor Authentication
- Go to: https://myaccount.google.com/security
- Turn on **2-Step Verification**

### 2. Generate App Password
- Visit: https://myaccount.google.com/apppasswords
- Select: **Mail** → **Other (Custom name)**
- Name: `TaskFlow`
- Click **Generate**
- **Copy the 16-character password**

### 3. Update `.env` File
Open `backend/.env` and update:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

Replace:
- `your-actual-email@gmail.com` with your Gmail address
- `abcd efgh ijkl mnop` with the app password you generated

### 4. Test Email Configuration

```bash
cd backend
node test-email.js
```

Expected output:
```
✅ SUCCESS! Test email sent successfully!
📬 Message ID: <...>
📥 Check your inbox at: your-email@gmail.com
```

### 5. Restart Backend Server

```bash
npm start
```

## 📧 What Gets Sent

### When Creating a New User:
- ✉️ Welcome email with login credentials
- 🎨 Beautiful HTML template
- 🔐 Email and password clearly displayed
- 🚀 Direct login button
- ⚠️ Security reminder to change password

### When Resetting Password:
- ✉️ Password reset notification
- 🔑 New temporary password
- ⚠️ Security warning
- 🔗 Login link

## 🧪 Testing

### Option 1: Create a Real User
1. Login as admin
2. Go to User Management
3. Create a new user
4. Check the user's email inbox

### Option 2: Use Test Script
```bash
cd backend
node test-email.js
```

## ⚠️ Troubleshooting

### "Invalid login: 535-5.7.8 Username and Password not accepted"
👉 You're using regular password. Use App Password from Step 2 above.

### Email not received
1. ✅ Check spam/junk folder
2. ✅ Verify EMAIL_USER is correct
3. ✅ Ensure app password is entered without spaces
4. ✅ Check backend console for errors

### ECONNREFUSED error
- Check your firewall/antivirus
- Verify internet connection
- Try different EMAIL_PORT (465 with EMAIL_SECURE=true)

## 🎯 Production Setup

For production, use a professional service:

**Recommended:**
- SendGrid (free tier: 100 emails/day)
- AWS SES (very affordable)
- Mailgun (free tier: 5,000 emails/month)

## 📚 Full Documentation

See `EMAIL_SETUP.md` for complete documentation including:
- Other email providers (Outlook, Yahoo, custom SMTP)
- Production recommendations
- Advanced configuration
- Email template customization

## ✅ Verification Checklist

- [ ] 2FA enabled on Gmail
- [ ] App password generated
- [ ] `.env` file updated with correct credentials
- [ ] Test script runs successfully
- [ ] Backend server restarted
- [ ] Test user created and email received

---

Need help? Check the console logs for detailed error messages!
