# 🔔 Desktop Notifications - Complete Troubleshooting Guide

## 🚨 NOTIFICATIONS NOT WORKING? START HERE!

### Quick Test (30 seconds):

1. Open: **http://localhost:5173/notification-test.html**
2. Click: **"1. Request Permission"** → Allow
3. Click: **"2. Test Basic Notification"**

**Result**:
- ✅ Notification appeared → PWA/Service Worker issue (see Section A)
- ❌ No notification → Browser/System issue (see Section B)

---

## Section A: PWA/Service Worker Issues

### Problem: Standalone test works, but app notifications don't

This means the PWA service worker is interfering.

### Solution 1: Use Direct Notifications (Recommended)

The notification service now has a fallback that bypasses the service worker if needed. Make sure you're using the latest code:

**File**: `frontend/src/utils/notificationService.js`

The `showNotification` method now:
1. ✅ Tries service worker first (preferred)
2. ✅ Falls back to direct Notification API if SW fails
3. ✅ Logs which method is used

**Check console output**:
```
"Using service worker for notification"
OR
"Service worker not available, using direct notification API"
```

### Solution 2: Clear Service Worker Cache

```javascript
// Run in browser console (F12):
navigator.serviceWorker.getRegistrations().then(registrations => {
  for(let registration of registrations) {
    registration.unregister();
    console.log('SW unregistered:', registration.scope);
  }
}).then(() => {
  console.log('All service workers unregistered. Reloading...');
  location.reload(true);
});
```

### Solution 3: Check Service Worker State

```javascript
// Run in console:
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    console.log('Service Worker:', reg.active?.state);
    console.log('Scope:', reg.scope);
    console.log('Script URL:', reg.active?.scriptURL);
  } else {
    console.log('No service worker registered');
  }
});
```

If state is **"redundant"** or **"installing"**, the service worker is broken. Unregister it.

---

## Section B: Browser/System Issues

### macOS - Focus Mode (MOST COMMON ISSUE! 🎯)

**Check for 🌙 moon icon in menu bar** - this blocks ALL notifications!

**Fix**:
1. Click the moon icon → Turn off Focus
2. **OR** allow browser in Focus settings:
   - System Preferences → Focus
   - Click your Focus mode
   - Apps → Add → Chrome/Firefox/Edge

**Also check**:
- System Preferences → Notifications & Focus
- Find Chrome/Firefox/Edge in left sidebar
- Make sure:
  - ✅ "Allow Notifications" is checked
  - ✅ "Show in Notification Center" is checked
  - ✅ Alert style: Set to "Alerts" (not Banners)
  - ✅ "Play sound" is checked

### Windows - Focus Assist

**Fix**:
1. Settings → System → Focus Assist
2. Set to **"Off"**

**Also check**:
1. Settings → System → Notifications
2. Make sure "Notifications" toggle is ON
3. Scroll down → Find Chrome/Edge
4. Make sure toggle is ON

### Browser Permissions

#### Chrome/Edge:
1. Click **🔒 padlock icon** in address bar
2. Click "Site settings"
3. Find "Notifications"
4. Set to **"Allow"**
5. **Reload the page** (important!)

**OR** go to:
- `chrome://settings/content/notifications`
- Find your site in "Block" list
- Click ⋮ → **"Allow"**

#### Firefox:
1. Click **🔒 padlock icon** in address bar
2. Click arrow → "More Information"
3. Go to "Permissions" tab
4. Find "Receive Notifications"
5. Uncheck "Use Default"
6. Select **"Allow"**
7. **Reload the page**

#### Safari:
1. **Safari** → **Settings** → **Websites** → **Notifications**
2. Find your site → Set to **"Allow"**
3. **Also check**: System Preferences → Notifications → Safari
4. Make sure Safari notifications are enabled

---

## Section C: Backend/Socket Issues

### Problem: Test works, permission granted, but real notifications don't show

This means Socket.IO isn't receiving events.

### Check 1: Backend Running?

```bash
# Terminal:
cd backend
npm start

# Should see:
# Server running on port 5000
# ✅ MongoDB connected
```

### Check 2: Socket Connected?

```javascript
// Browser console:
console.log('Socket ID:', window.socket?.id);
console.log('Connected:', window.socket?.connected);

// Should see a socket ID (not undefined)
```

### Check 3: Events Being Emitted?

When you create/update a task, backend should log:
```
✅ Client connected: <socket-id>
Emitting task:created event
```

Check backend console for these logs.

### Check 4: Frontend Receiving Events?

Browser console should show:
```
📝 Task created event received: {task object}
Settings: {taskCreated: true, ...}
✅ Showing task created notification
```

If you see the event but "Skipped", check:
- Is the notification type enabled in Settings?
- Are you involved in the task? (assigned/creator)

---

## Section D: Development Mode Issues

### Problem: Works in production but not in dev

Service workers behave differently in dev mode.

### Solution: Force Direct Notifications

Add this to `.env.local`:
```
VITE_USE_DIRECT_NOTIFICATIONS=true
```

Then update `notificationService.js`:
```javascript
async showNotification(title, options = {}) {
  const useDirect = import.meta.env.VITE_USE_DIRECT_NOTIFICATIONS === 'true';
  
  if (useDirect || !('serviceWorker' in navigator)) {
    // Always use direct API in dev
    return new Notification(title, options);
  }
  
  // ... rest of code
}
```

**OR** just accept that dev mode uses the fallback (which it already does automatically).

---

## Section E: Verification Steps

Run this comprehensive check:

```javascript
// Copy/paste in browser console:
(async function() {
  console.log('%c=== COMPLETE NOTIFICATION CHECK ===', 'color: blue; font-size: 16px; font-weight: bold');
  
  // 1. API Support
  const supported = 'Notification' in window;
  console.log('1. API Supported:', supported ? '✅ Yes' : '❌ No');
  if (!supported) {
    console.log('   ⚠️ Use Chrome, Firefox, Edge, or Safari');
    return;
  }
  
  // 2. Permission
  const perm = Notification.permission;
  console.log('2. Permission:', perm);
  if (perm === 'denied') {
    console.log('   ❌ BLOCKED - Reset in browser settings!');
    console.log('   Chrome: Click padlock → Site settings → Notifications → Allow');
    console.log('   Firefox: Click padlock → More info → Permissions → Allow');
  } else if (perm === 'default') {
    console.log('   ⚠️ Not requested - Go to Settings → Notifications → Enable');
  } else {
    console.log('   ✅ Permission granted');
  }
  
  // 3. Service Worker
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      console.log('3. Service Worker: ✅ Registered');
      console.log('   State:', reg.active?.state || 'Not active');
      console.log('   Scope:', reg.scope);
    } else {
      console.log('3. Service Worker: ⚠️ Not registered (OK in dev mode)');
    }
  } else {
    console.log('3. Service Worker: ❌ Not supported');
  }
  
  // 4. PWA Mode
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  console.log('4. PWA Mode:', isPWA ? 'Yes (installed)' : 'No (browser)');
  
  // 5. Socket.IO
  const socket = window.socket;
  if (socket) {
    console.log('5. Socket.IO: ✅ Available');
    console.log('   Connected:', socket.connected ? '✅ Yes' : '❌ No');
    console.log('   ID:', socket.id || 'Not connected');
  } else {
    console.log('5. Socket.IO: ❌ Not initialized (login required)');
  }
  
  // 6. Settings
  try {
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    console.log('6. App Settings:');
    console.log('   Task Created:', settings.taskCreated !== false ? '✅' : '❌');
    console.log('   Task Updated:', settings.taskUpdated !== false ? '✅' : '❌');
    console.log('   Task Assigned:', settings.taskAssigned !== false ? '✅' : '❌');
    console.log('   New Comment:', settings.newComment !== false ? '✅' : '❌');
  } catch (e) {
    console.log('6. App Settings: ⚠️ Cannot read');
  }
  
  // 7. Live Test
  if (perm === 'granted') {
    console.log('7. Live Test: Sending notification...');
    try {
      new Notification('🧪 Test Notification', {
        body: 'If you see this, notifications are working!',
        icon: '/icons/pwa-192x192.png',
        tag: 'diagnostic-test'
      });
      console.log('   ✅ Notification sent! Did you see it?');
      console.log('   If not, check system settings (Focus/DND mode)');
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
  } else {
    console.log('7. Live Test: Skipped (permission not granted)');
  }
  
  console.log('%c=== CHECK COMPLETE ===', 'color: blue; font-size: 16px; font-weight: bold');
  console.log('');
  console.log('%cNEXT STEPS:', 'color: orange; font-weight: bold');
  
  if (perm !== 'granted') {
    console.log('→ Fix permission issue first');
  } else if (!socket?.connected) {
    console.log('→ Make sure backend is running: cd backend && npm start');
    console.log('→ Make sure you are logged in');
  } else {
    console.log('→ Try creating a task to test real-time notifications');
    console.log('→ Check Settings → Notifications to enable/disable types');
  }
})();
```

---

## 🎯 Expected Output When Working

### Browser Console:
```
✅ Socket connected: 7a8b9c0d
🔌 Setting up socket event listeners...
✅ Socket event listeners registered
✅ Notifications enabled and ready

// When creating a task:
📝 Task created event received: {_id: "123", title: "New Task", ...}
Settings: {taskCreated: true, taskUpdated: true, ...}
Using direct notification API
✅ Showing task created notification
```

### Desktop:
- Notification appears in system notification center
- Shows task title and details
- Can click to open (if click handler implemented)
- Persists until dismissed

---

## 📋 Troubleshooting Checklist

- [ ] Standalone test page works (`/notification-test.html`)
- [ ] Browser permission is "granted"
- [ ] System notifications enabled (not blocked by Focus/DND)
- [ ] Backend server is running
- [ ] Socket.IO is connected
- [ ] Notification types enabled in app Settings
- [ ] No errors in browser console
- [ ] Service worker not blocking (use fallback)

---

## 🆘 Last Resort

If NOTHING works:

1. **Test with another website**: Go to twitter.com or web.whatsapp.com and test their notifications. If those don't work either, it's a system issue.

2. **Check OS notification daemon** (Linux):
   ```bash
   # Check if notification daemon is running
   ps aux | grep notification
   # Test with system command
   notify-send "Test" "Testing system notifications"
   ```

3. **Reinstall browser**: Sometimes browser installation gets corrupted.

4. **Create new browser profile**: Settings → Add Person (Chrome) / About:profiles (Firefox)

5. **Check antivirus/firewall**: Some security software blocks notifications.

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| **NOTIFICATION_QUICK_FIX.md** | This file - Complete troubleshooting |
| **QUICK_START_NOTIFICATIONS.md** | 30-second test guide |
| **NOTIFICATION_DEBUG_README.md** | User-friendly troubleshooting |
| **NOTIFICATION_FIX_SUMMARY.md** | Technical implementation details |
| **notification-test.html** | Standalone test page |
| **notification-debug.js** | Diagnostic script |

---

## ✅ Success Indicators

You know it's working when:
1. ✅ Test page shows notification
2. ✅ Console shows "Socket connected"
3. ✅ Console shows events being received
4. ✅ Desktop notification appears for real actions
5. ✅ Settings toggles affect behavior
6. ✅ No errors in console

**Most issues are Focus Mode (macOS) or browser permissions!**

**Always check the 🌙 moon icon FIRST!**
