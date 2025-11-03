# Quick Notification Testing Guide

## Step-by-Step: Test Notifications in 2 Minutes

### 1. Start the Application

```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 2. Enable Notifications

1. Open the app (usually http://localhost:5173)
2. Log in
3. Go to **Settings** (in navbar)
4. Scroll to **Notification Settings**
5. Click **"Enable Notifications"**
6. Click **"Allow"** in the browser prompt

### 3. Test Basic Functionality

Click **"Test Notification"** button in Settings.

**Expected result**: A desktop notification should appear saying "Test Notification"

**If it doesn't appear**:
- Open browser console (F12)
- Look for detailed logs starting with "==== TESTING NOTIFICATION ===="
- Check if permission is "granted"
- See NOTIFICATION_DEBUG_README.md for solutions

### 4. Test Real-Time Notifications

#### Option A: Create a Task (Test "Task Created")
1. Go to **Tasks** page
2. Click **"Add Task"**
3. Fill in title: "Test Notification Task"
4. Click **"Create Task"**

**Expected result**: 
- Console shows: "📝 Task created event received"
- Desktop notification appears (if "Task Created" is enabled in settings)

#### Option B: Update a Task (Test "Task Updated")
1. Go to **Tasks** page
2. Click on any task
3. Change status from "To Do" to "In Progress"
4. Save changes

**Expected result**:
- Console shows: "🔄 Task updated event received"
- Desktop notification appears

#### Option C: Assign a Task (Test "Task Assigned")
1. Create or edit a task
2. Assign it to yourself
3. Save

**Expected result**:
- Console shows: "👤 Task assigned event received"
- Desktop notification appears

### 5. Verify Console Logs

Open browser console (F12) and look for:

```
✅ Socket connected: <socket-id>
🔌 Setting up socket event listeners...
✅ Socket event listeners registered
```

When events happen, you should see:
```
📝 Task created event received: {task object}
Settings: {taskCreated: true, ...}
✅ Showing task created notification
```

### 6. Debug if Not Working

Run this in the browser console:
```javascript
fetch('/notification-debug.js').then(r=>r.text()).then(eval)
```

This will show you exactly what's wrong.

## Common Test Scenarios

### Scenario 1: Test All Notification Types

```javascript
// Run in browser console after logging in

// Test task created (if you have admin/hr rights)
// Just create a task normally through UI

// Test task updated
// Edit any task and change its status

// Test assigned
// Assign a task to yourself

// Test comment (if comments are implemented)
// Add a comment to a task you're assigned to
```

### Scenario 2: Test Settings Toggle

1. Go to Settings → Notifications
2. Turn OFF "Task Updated"
3. Update a task
4. **Expected**: No notification (console shows "Skipped: disabled")
5. Turn ON "Task Updated"
6. Update a task again
7. **Expected**: Notification appears

### Scenario 3: Test Multiple Users (Advanced)

If you have multiple users:
1. Open app in two different browsers (or normal + incognito)
2. Log in as User A in browser 1
3. Log in as User B in browser 2
4. User A creates and assigns task to User B
5. **Expected**: User B sees notification

## Troubleshooting Test Results

### ✅ Working Correctly
- Test notification button → notification appears
- Console shows socket connected
- Console shows event logs when tasks are created/updated
- Desktop notifications appear for real events
- Settings toggles affect notification behavior

### ⚠️ Partial Issues
- Test works but real notifications don't → Socket.IO issue (backend might be down)
- Some types work, others don't → Check individual settings in Settings page
- Notifications appear but no sound → System/browser sound settings

### ❌ Not Working At All
- No test notification → Permission issue or browser support issue
- Check NOTIFICATION_DEBUG_README.md
- Run diagnostic script
- Check browser and system permissions

## Performance Testing

### Check for Notification Spam
1. Create 5 tasks rapidly
2. **Expected**: Should see 5 notifications, not overwhelming
3. Notifications should be grouped intelligently

### Check Battery Usage (Mobile)
1. Use DevTools → Application → Service Workers
2. Monitor service worker activity
3. Should be efficient, not constantly running

### Check with Dev Tools
```javascript
// Monitor notification performance
console.time('notification');
notificationService.showNotification('Test', { body: 'Test' });
console.timeEnd('notification');
// Should be < 100ms
```

## Success Criteria

✅ All tests pass:
- [ ] Test button shows notification
- [ ] Task created → notification
- [ ] Task updated → notification (for involved users)
- [ ] Task assigned → notification (for assignee)
- [ ] Settings toggles work correctly
- [ ] Console logs are clear and helpful
- [ ] No errors in console
- [ ] Socket stays connected
- [ ] Notifications appear on desktop/notification center
- [ ] Clicking notification works (if implemented)

## Next Steps After Testing

1. **Deploy to production**: Test on actual domain (needs HTTPS)
2. **Test on mobile**: Install as PWA and test
3. **Test cross-browser**: Chrome, Firefox, Edge, Safari
4. **Test OS variations**: macOS, Windows, iOS, Android

## Quick Reference

| Issue | Command to Run |
|-------|----------------|
| Check permission | `Notification.permission` |
| Check socket | `window.socket?.connected` |
| Check settings | `localStorage.getItem('notificationSettings')` |
| Full diagnostic | `fetch('/notification-debug.js').then(r=>r.text()).then(eval)` |
| Reset everything | `localStorage.clear(); location.reload()` |

## Still Issues?

See **NOTIFICATION_DEBUG_README.md** for comprehensive troubleshooting.
