# Notification Troubleshooting Guide

## Quick Diagnostic Tool

If notifications aren't working, run this diagnostic script in your browser console:

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Copy and paste this URL: `/notification-debug.js`
4. Or run: `fetch('/notification-debug.js').then(r=>r.text()).then(eval)`

This will generate a comprehensive diagnostic report.

## Common Issues and Solutions

## Issue: Notifications Not Appearing on Desktop

### Quick Checklist ✅

Before diving into detailed troubleshooting, check these common issues:

1. **[ ] Permission Granted?**
   - Go to Settings → Notifications
   - Click "Enable Notifications"
   - Make sure you clicked "Allow" in the browser prompt

2. **[ ] HTTPS Connection?**
   - Notifications require HTTPS (or localhost for development)
   - Check your browser's address bar for a lock icon

3. **[ ] Browser Supports Notifications?**
   - Chrome, Firefox, Edge: ✅ Fully supported
   - Safari: ✅ Supported (macOS 10.14+)
   - Internet Explorer: ❌ Not supported

4. **[ ] Browser Settings Allow Notifications?**
   - Check your browser's notification settings
   - TaskFlow should be in the "Allowed" list

## Step-by-Step Debugging

### Step 1: Open Browser Console

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+J` (Windows/Linux)
- Press `Cmd+Option+J` (Mac)

**Firefox:**
- Press `F12` or `Ctrl+Shift+K` (Windows/Linux)
- Press `Cmd+Option+K` (Mac)

**Safari:**
- Enable Developer menu: Safari → Settings → Advanced → Show Developer menu
- Press `Cmd+Option+C`

### Step 2: Check Permission Status

In the browser console, type:
```javascript
Notification.permission
```

**Expected outputs:**
- `"granted"` ✅ - Notifications will work
- `"denied"` ❌ - User blocked notifications (see Step 6)
- `"default"` ⚠️ - Permission not requested yet (go to Settings → Notifications)

### Step 3: Test Notification Manually

In the browser console, type:
```javascript
new Notification('Test', { body: 'This is a test notification' });
```

**If you see the notification:**
✅ Notifications are working! The issue is with the app integration.

**If you don't see it:**
❌ Continue to next step.

### Step 4: Check Service Worker

In the browser console, type:
```javascript
navigator.serviceWorker.controller
```

**Expected output:**
- Should show a ServiceWorker object
- If `null`, service worker is not registered

**To manually register:**
1. Close all TaskFlow tabs
2. Reopen TaskFlow
3. Check again

### Step 5: Verify Notification Service

In the browser console, type:
```javascript
// Check if notification service is loaded
console.log('Notification support:', 'Notification' in window);
console.log('Service Worker support:', 'serviceWorker' in navigator);
console.log('Permission:', Notification.permission);
```

### Step 6: Fix "Denied" Permission

If permission is "denied", you must manually allow it:

#### Chrome/Edge:
1. Click the lock icon in the address bar
2. Click "Site settings"
3. Find "Notifications" and change to "Allow"
4. Refresh the page

#### Firefox:
1. Click the shield/lock icon in the address bar
2. Click the arrow next to "Notifications"
3. Select "Allow" from dropdown
4. Refresh the page

#### Safari:
1. Safari menu → Settings → Websites → Notifications
2. Find TaskFlow in the list
3. Change to "Allow"
4. Refresh the page

### Step 7: Test in Settings Page

1. Navigate to Settings → Notifications
2. Click "Test Notification" button
3. Check browser console for any errors

**Look for these messages:**
- ✅ `✅ Notification permission granted`
- ✅ `✅ Test notification sent`
- ❌ `❌ Notification permission denied`
- ❌ Any error messages

### Step 8: Check Operating System Settings

#### Windows 10/11:
1. Settings → System → Notifications & actions
2. Make sure notifications are ON
3. Scroll down to find your browser
4. Make sure browser notifications are allowed

#### macOS:
1. System Settings → Notifications
2. Find your browser in the list
3. Make sure "Allow notifications" is checked
4. Set alert style to "Alerts" or "Banners"

#### Linux (Ubuntu/GNOME):
1. Settings → Notifications
2. Make sure notifications are enabled
3. Check browser is not blocked

### Step 9: Check Focus Assist / Do Not Disturb

#### Windows Focus Assist:
- Press `Win + A` to open Action Center
- Check if Focus Assist is ON
- Turn it OFF or add TaskFlow to priority list

#### macOS Do Not Disturb:
- Click Control Center in menu bar
- Check if Do Not Disturb is ON
- Turn it OFF or allow notifications from browser

### Step 10: Check Browser Extensions

Some browser extensions can block notifications:

1. Try disabling all extensions temporarily
2. Test notifications again
3. If it works, enable extensions one by one to find the culprit

**Common culprits:**
- Ad blockers (AdBlock, uBlock Origin)
- Privacy extensions (Privacy Badger, Ghostery)
- Notification blockers

## Common Issues & Solutions

### Issue: "Notification is not defined"

**Cause:** Browser doesn't support notifications
**Solution:** Update browser to latest version or use a different browser

### Issue: Notifications work on one computer but not another

**Cause:** Different browser settings or OS settings
**Solution:** Follow Step 6 and Step 8 on the problematic computer

### Issue: Notifications stop working after browser update

**Cause:** Browser update reset permissions
**Solution:** Re-enable permissions (Step 6)

### Issue: Test notification works but real notifications don't

**Cause:** Socket.IO not connected or event listeners not set up
**Solution:**
1. Check browser console for socket errors
2. Verify backend server is running
3. Check network tab for WebSocket connection

### Issue: Notifications appear but are silent

**Cause:** Browser or OS notification sounds disabled
**Solution:**
1. Check browser sound settings
2. Check OS notification sound settings
3. Make sure volume is not muted

## Testing Real Notifications

### Test Task Assignment Notification:

1. Open TaskFlow in two different browsers (or incognito window)
2. Login as two different users
3. User A assigns a task to User B
4. User B should receive a notification

### Test Task Update Notification:

1. Enable "Task Updates" in notification settings
2. Have another user update a task you're assigned to
3. You should receive a notification

### Test Comment Notification:

1. Enable "New Comments" in notification settings
2. Have another user comment on your task
3. You should receive a notification

## Advanced Debugging

### Check Notification Service

Open browser console and run:
```javascript
// Get notification service status
const notificationService = {
  isSupported: 'Notification' in window,
  permission: Notification.permission,
  serviceWorker: 'serviceWorker' in navigator,
  swController: navigator.serviceWorker?.controller !== null
};
console.table(notificationService);
```

### Monitor Socket Events

Open browser console and run:
```javascript
// This will log all socket events
if (window.socket) {
  window.socket.onAny((eventName, ...args) => {
    console.log('📡 Socket event:', eventName, args);
  });
}
```

### Force Service Worker Update

```javascript
// Unregister and re-register service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
}).then(() => {
  window.location.reload();
});
```

## Getting Help

If you're still experiencing issues:

1. **Check Browser Console:** Copy any error messages
2. **Take Screenshots:** Of settings page and notifications page
3. **Gather Info:**
   - Browser name and version
   - Operating system
   - Permission status
   - Any error messages

4. **Report Issue:**
   - Include all information from step 3
   - Describe what you tried from this guide
   - Mention which step helped narrow down the issue

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| Permission denied | Manually allow in browser settings (Step 6) |
| No notifications at all | Check OS notification settings (Step 8) |
| Notifications silent | Check sound settings in browser/OS |
| Works in one browser, not another | Check permission and settings in each browser |
| Stopped working suddenly | Clear cache and re-enable permissions |
| Test works, real doesn't | Check Socket.IO connection in Network tab |

## Prevention Tips

1. **Don't click "Block" when prompted** - It's harder to undo
2. **Keep browser updated** - Ensures best compatibility
3. **Don't use aggressive ad blockers** - Can interfere with notifications
4. **Check settings after OS updates** - May reset permissions
5. **Use HTTPS in production** - Required for PWA features

## Still Not Working?

If you've tried everything and notifications still don't work:

1. **Try a different browser** - To isolate browser-specific issues
2. **Try a different device** - To isolate device-specific issues
3. **Check TaskFlow logs** - Backend may not be sending events
4. **Verify Socket.IO connection** - Check Network tab for WebSocket

Remember: Notifications are a progressive enhancement. The app works fine without them, but they greatly improve the user experience!
