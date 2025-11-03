# Desktop Notification Debugging Guide

## Quick Start - Run This First!

If notifications aren't working, **run the diagnostic script**:

### Method 1: From App
1. Open TaskFlow
2. Go to **Settings → Notifications**
3. Click **"Test Notification"**
4. Check browser console (F12) for detailed logs

### Method 2: Browser Console
```javascript
fetch('/notification-debug.js').then(r=>r.text()).then(eval)
```

---

## Most Common Issue: Permission "denied" ❌

**90% of notification issues are due to denied permission!**

### How to Fix:

#### Chrome/Edge (Most Common)
1. Click the **🔒 padlock** or (i) icon in the address bar
2. Look for **"Notifications"**
3. Set to **"Allow"**
4. **Reload the page** (Cmd+R / Ctrl+R)

OR reset in browser settings:
1. `chrome://settings/content/notifications`
2. Find your site in "Not allowed"
3. Click **Remove**
4. Go back to site and request permission again

#### Firefox
1. Click **🔒 padlock** in address bar
2. Click **"Connection Secure"** → **"More Information"**
3. Go to **"Permissions"** tab
4. Find **"Receive Notifications"** → Check **"Allow"**
5. **Reload the page**

#### Safari (macOS)
1. **Safari** → **Settings** → **Websites** → **Notifications**
2. Find your site → Set to **"Allow"**
3. **Also check**: System Preferences → Notifications & Focus → Safari

---

## Issue: Test button works, but real notifications don't 🔔

This means **Socket.IO isn't receiving events**.

### Check Socket Connection:
```javascript
// Run in browser console:
console.log('Socket connected:', window.socket?.connected);
```

### Solutions:

1. **Backend not running**
   - Make sure your backend server is running on port 5000
   - Check terminal for errors

2. **Reload the page**
   - Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)

3. **Check notification settings in app**
   - Settings → Notifications
   - Make sure relevant types are **enabled** (blue toggle)
   - E.g., "Task Updates" must be ON

4. **Check browser console logs**
   - Open DevTools (F12)
   - Look for messages like:
     - ✅ "Socket connected"
     - ✅ "Task created event received"
     - ⚠️ "Skipped: disabled" (means the setting is off)

---

## macOS Specific Issues 🍎

### Issue: Notifications appear but disappear immediately
**Cause**: Banner style notifications auto-dismiss

**Solution**:
1. **System Preferences** → **Notifications & Focus**
2. Find your browser (Chrome, Firefox, etc.)
3. Change **"Alert style"** from **"Banners"** to **"Alerts"**
4. Alerts stay until you dismiss them

### Issue: Focus/DND mode blocks notifications
**Solution**:
1. Check menu bar for **moon icon** (Focus mode)
2. Turn it off, or
3. Add your browser to **allowed apps**:
   - System Preferences → Notifications & Focus
   - Click your Focus mode
   - Add browser to "Allowed Apps"

### Issue: No sound plays
**Solution**:
1. System Preferences → Notifications & Focus
2. Find your browser
3. Check **"Play sound for notifications"**

---

## Windows Specific Issues 🪟

### Issue: Focus Assist blocks notifications
**Solution**:
1. **Settings** → **System** → **Focus Assist**
2. Set to **"Off"**, or
3. Add browser to **Priority list**

### Issue: Notifications not showing in Action Center
**Solution**:
1. **Settings** → **System** → **Notifications**
2. Make sure **"Notifications"** is turned ON
3. Scroll down → Find your browser → Turn ON
4. In browser: Check site notification permissions

---

## Check System Notification Settings

### macOS:
1. **System Preferences** → **Notifications & Focus**
2. Find your browser in the left sidebar
3. Make sure:
   - ✅ **Allow Notifications** is checked
   - ✅ **Show in Notification Center** is checked
   - ✅ **Play sound** is checked (if desired)

### Windows:
1. **Settings** → **System** → **Notifications**
2. Make sure **Notifications** toggle is ON
3. Scroll down and find your browser
4. Make sure its toggle is ON

---

## Reset Everything (Nuclear Option) ⚠️

If nothing else works:

```javascript
// Run in browser console:

// 1. Clear notification settings
localStorage.removeItem('notificationSettings');

// 2. Unregister service workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// 3. Hard reload
location.reload(true);
```

Then:
1. Go to Settings → Notifications
2. Click "Enable Notifications"
3. Allow permission
4. Try test notification again

---

## Still Not Working? 🤔

### Try These:

1. **Test in another browser**
   - Chrome/Edge have best support
   - Firefox also excellent
   - Safari requires PWA installation

2. **Test system notifications**
   - Try notifications from another site (e.g., Twitter, Gmail)
   - If those don't work, it's a system-level issue

3. **Update your browser**
   - Very old versions may not support notifications
   - Update to latest version

4. **Check browser console**
   - F12 → Console tab
   - Look for RED errors
   - Copy error messages when asking for help

5. **Try incognito/private mode**
   - Rules out extension conflicts
   - If it works there, disable extensions one by one

---

## Diagnostic Console Commands

```javascript
// Check permission
console.log('Permission:', Notification.permission);

// Request permission
Notification.requestPermission().then(p => console.log('New permission:', p));

// Test basic notification (must have permission)
if (Notification.permission === 'granted') {
  new Notification('Test', { body: 'If you see this, basics work!' });
}

// Check service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length > 0 ? 'Registered' : 'None');
  regs.forEach(reg => console.log('  State:', reg.active?.state));
});

// Check settings
const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
console.log('Settings:', settings);

// Check socket (must be logged in)
if (window.socket) {
  console.log('Socket ID:', window.socket.id);
  console.log('Connected:', window.socket.connected);
}
```

---

## Expected Behavior

✅ **Working correctly**:
- Permission = "granted"
- Test notification appears on desktop
- Console shows "Socket connected"
- Console shows "Task created event received" when tasks are created
- Desktop notification appears for real task events

❌ **Not working**:
- Permission = "denied" or "default"
- Test notification doesn't appear
- Console shows errors
- No socket connection
- No event logs in console

---

## Get Help

When reporting issues, include:
1. **OS and version** (e.g., macOS 13.5, Windows 11)
2. **Browser and version** (e.g., Chrome 120, Firefox 115)
3. **Permission status** (granted/denied/default)
4. **Browser console logs** (copy errors if any)
5. **Diagnostic report** (from notification-debug.js)

**Most issues are permission-related. Always check browser AND system settings!**
