# 🔧 TaskFlow Troubleshooting Guide

## 🔴 Common Errors and Solutions

### 1. 401 Unauthorized Errors

**Symptoms:**
- `Failed to load resource: 401 (Unauthorized)`
- Warning: `⚠️ No access token found`
- Can't access any API endpoints

**Root Cause:**
- Not logged in or session expired
- Access token missing from localStorage

**Solution:**
1. **Clear browser data:**
   - Press F12 → Application tab → Storage → Clear site data
   - Refresh the page

2. **Log in again:**
   - Go to `/login`
   - Use one of the admin accounts:
     - Email: `jassalarjansingh@gmail.com`
     - Email: `jeevan.pant15@gmail.com`
     - Email: `divybajpai25@gmail.com`
     - Email: `jassalas@gmail.com`

3. **Verify localStorage:**
   - Press F12 → Application → Local Storage
   - Check that these exist:
     - `accessToken`
     - `refreshToken`
     - `user`

---

### 2. 403 Forbidden Errors

**Symptoms:**
- `Failed to load resource: 403 (Forbidden)`
- Error: "Access denied. Insufficient permissions."
- Can access some pages but not others

**Root Cause:**
- User role doesn't have permission to access certain resources
- **Member** role can't access:
  - `/api/teams` (teams list)
  - `/api/users` (users list)
- **Team Lead** can only see their own team

**Solution:**
1. **Check your role:**
   ```bash
   cd backend
   node scripts/checkUserRole.js
   ```

2. **Log in with an admin account** if you need full access

3. **Understanding role permissions:**
   - 👑 **Admin** - Full access to everything
   - 👔 **HR** - Can manage users and teams
   - 👨‍💼 **Team Lead** - Can see their own team
   - 👤 **Member** - Can only see their assigned tasks

---

### 3. React DOM Warning: `<div>` cannot appear as a descendant of `<p>`

**Status:** ✅ **FIXED**

**What was fixed:**
- Changed `<p>` tag to `<div>` in Tasks.jsx line 970-978
- This warning no longer appears in the console

---

## 🛠️ Useful Scripts

### Check User Roles
```bash
cd backend
node scripts/checkUserRole.js
```
**Purpose:** Shows all users in the database with their roles and teams

### Seed Admin User
```bash
cd backend
node scripts/seedAdmin.js
```
**Purpose:** Creates a default admin user if none exists

### Test API Endpoints
```bash
cd backend
npm run dev
```
Then open another terminal:
```bash
cd backend
bash test-api.sh
```

---

## 🔍 Debugging Steps

### 1. Check if Backend is Running
```bash
# Backend should be running on port 5000
curl http://localhost:5000/api/tasks
```

### 2. Check if Frontend is Running
```bash
# Frontend should be running on port 3000
# Open browser: http://localhost:3000
```

### 3. Check MongoDB Connection
```bash
# Make sure MongoDB is running
mongosh
# or
mongo
```

### 4. Check Browser Console
- Press F12
- Go to Console tab
- Look for error messages with 🔐, ⚠️, or ❌ emojis

### 5. Check Network Tab
- Press F12
- Go to Network tab
- Look for failed requests (red text)
- Click on a failed request to see details

---

## 🚀 Quick Fixes

### Clear Everything and Start Fresh
```bash
# 1. Clear browser data
# Press F12 → Application → Storage → Clear site data

# 2. Stop both servers (Ctrl+C)

# 3. Restart backend
cd backend
npm run dev

# 4. Restart frontend (new terminal)
cd frontend
npm run dev

# 5. Log in with admin account
```

### Force Re-authentication
1. Open DevTools (F12)
2. Console tab, run:
   ```javascript
   localStorage.clear()
   location.reload()
   ```
3. Log in again

---

## 📝 What Was Fixed

### ✅ Dashboard.jsx
- Added role-based permission checks before fetching teams
- Only calls `/api/teams` if user is admin, hr, or team_lead
- Better error handling for 401 and 403 errors

### ✅ Tasks.jsx
- Fixed React DOM warning (replaced `<p>` with `<div>`)
- Added graceful error handling for 403 errors when fetching users

### ✅ Kanban.jsx
- Added graceful error handling for 403 errors when fetching users/teams

### ✅ Analytics.jsx
- Added graceful error handling for 403 errors when fetching teams/users

### ✅ axios.js (API Interceptor)
- Improved error messages with emojis
- Only shows token warning if not on login/register page
- Prevents redirect loop if already on login page
- Better 403 error handling with role information

### ✅ New Script: checkUserRole.js
- Shows all users with their roles
- Displays team assignments
- Lists admin accounts for login

---

## 🔐 Current Admin Accounts

Based on your database, you have these admin accounts:

1. **Arjan Singh Jassal**
   - Email: `jassalarjansingh@gmail.com`
   - Team: Hr Team

2. **Jeevan Pant**
   - Email: `jeevan.pant15@gmail.com`
   - Team: Admins

3. **Divy Bajpai**
   - Email: `divybajpai25@gmail.com`
   - Team: Admins

4. **Tester**
   - Email: `jassalas@gmail.com`
   - Team: Technical Team

**Note:** If you don't remember passwords, run `node scripts/seedAdmin.js` to create a new admin with known credentials.

---

## 🎯 Next Steps After Fixing Errors

1. ✅ Log out completely
2. ✅ Clear browser cache and localStorage
3. ✅ Log in with an admin account
4. ✅ Verify you can access:
   - Dashboard
   - Tasks
   - Teams (admin/hr only)
   - Users (admin/hr only)
   - Analytics
   - Kanban

---

## 💡 Tips

- **Always use admin account** when testing all features
- **Check console regularly** for warnings and errors
- **Use member account** to test restricted access
- **Run checkUserRole.js** to verify user roles before debugging permissions

---

## 📞 Still Having Issues?

1. Check all servers are running
2. Check MongoDB is running
3. Clear browser completely
4. Try incognito/private browsing
5. Check backend logs for errors
6. Run `node scripts/checkUserRole.js` to verify database state
