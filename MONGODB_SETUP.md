# MongoDB Atlas Setup Guide

## ⚠️ Critical: IP Whitelist Configuration

Your TaskFlow application is **fully implemented and ready**, but needs MongoDB Atlas network configuration.

## 🔧 Fix MongoDB Connection (Takes 2 minutes)

### Step 1: Go to MongoDB Atlas
Visit: https://cloud.mongodb.com/

### Step 2: Navigate to Network Access
1. Click on your cluster
2. Go to "Network Access" in the left sidebar
3. Click the "Add IP Address" button

### Step 3: Allow Access
Choose ONE of these options:

**Option A: Development (Recommended for testing)**
- Click "Allow Access from Anywhere"
- Confirm by clicking "Add Entry"
- IP: `0.0.0.0/0` will be added

**Option B: Production (More secure)**
- Click "Add Current IP Address"
- Your current IP will be detected and added
- Note: You'll need to repeat this if your IP changes

### Step 4: Wait for Changes to Apply
- Changes take 1-2 minutes to propagate
- You'll see a status indicator

## ✅ Verify Connection

After adding IP to whitelist:

### 1. Restart Backend Server
```bash
cd backend
yarn start
```

You should see:
```
✅ MongoDB Connected: cluster0.mongodb.net
```

### 2. Test with curl
```bash
# Health check
curl http://localhost:5000/api/health

# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "test123",
    "role": "admin"
  }'
```

If successful, you'll get a response with user data and tokens!

## 🎯 What Happens After Setup

Once MongoDB is connected:

1. **Backend** can store and retrieve data
2. **Users** can register and login
3. **Tasks** can be created and managed
4. **Teams** can be organized
5. **Real-time notifications** work
6. **All features** are fully functional

## 🚀 Start Using TaskFlow

```bash
# Terminal 1: Start Backend
cd backend
yarn start

# Terminal 2: Start Frontend
cd frontend
yarn dev
```

Then visit: `http://localhost:3000`

## 📝 Create Your First Account

1. Go to http://localhost:3000
2. Click "Register here"
3. Fill in the form:
   - Full Name: Admin User
   - Email: admin@taskflow.com
   - Role: Admin
   - Password: admin123
4. Click "Create Account"
5. You'll be logged in automatically!

## 🎨 Features to Try

After registering:

✅ **Dashboard** - See task statistics
✅ **Create Tasks** - Click "Create Task" button
✅ **Manage Teams** - Go to Teams page (Admin/HR only)
✅ **Assign Tasks** - Select tasks and assign to team members
✅ **Real-time Updates** - Open in multiple browsers to see live updates
✅ **Comments** - Click on tasks to add comments
✅ **Notifications** - Get notified when tasks are assigned

## ❓ Still Having Issues?

### Error: "Could not connect to any servers"
- Double-check IP whitelist in MongoDB Atlas
- Wait 2-3 minutes for changes to propagate
- Try restarting the backend server

### Error: "Authentication failed"
- Verify your MongoDB connection string in `backend/.env`
- Check username and password are correct
- Ensure database name is specified in connection string

### Error: "Network Error"
- Check if backend is running on port 5000
- Verify frontend .env has correct backend URL
- Check firewall settings

## 📞 Quick Reference

**MongoDB Atlas Dashboard:**
https://cloud.mongodb.com/

**Your Connection String:**
```
mongodb+srv://jassalarjansingh_db_user:waheguru@taskflow.rsodja4.mongodb.net/?appName=TaskFlow
```

**Backend Port:** 5000
**Frontend Port:** 3000

---

**That's it! Your TaskFlow CTMS is ready to use! 🎉**
