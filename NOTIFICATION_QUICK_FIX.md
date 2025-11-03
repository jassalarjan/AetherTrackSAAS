# 🚨 Desktop Notifications Not Working - QUICK FIX

## 🎯 Try These Steps IN ORDER

### Step 1: Test Standalone (Bypass PWA)
Open this URL in your browser:
```
http://localhost:5173/notification-test.html
```

Or if deployed:
```
https://your-domain.com/notification-test.html
```

1. Click **"1. Request Permission"** → Allow
2. Click **"2. Test Basic Notification"**

**Did the notification appear?**
- ✅ **YES** → PWA is blocking notifications (go to Step 2)
- ❌ **NO** → System/browser issue (go to Step 3)

---

### Step 2: PWA Is Blocking Notifications

**The Issue**: Service Worker might be interfering

**Solution A - Clear Service Worker**:
```javascript
// Run in browser console (F12):
navigator.serviceWorker.getRegistrations().then(registrations => {
  for(let registration of registrations) {
    registration.unregister();
    console.log('SW unregistered:', registration.scope);
  }
}).then(() => {
  location.reload(true);
});
```

**Solution B - Use Direct Notification (Bypass SW)**:

Add this to `notificationService.js` as a fallback:

```javascript
async showNotification(title, options = {}) {
  if (!this.isSupported || Notification.permission !== 'granted') {
    return null;
  }

  try {
    // Try service worker first
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      return await registration.showNotification(title, options);
    }
  } catch (swError) {
    console.warn('Service worker notification failed, using fallback:', swError);
  }
  
  // FALLBACK: Use direct notification API
  try {
    return new Notification(title, options);
  } catch (error) {
    console.error('All notification methods failed:', error);
    return null;
  }
}
```

---

### Step 3: System/Browser Blocking

#### macOS (Most Common Issue):
**Focus Mode** blocks ALL notifications!

1. Check menu bar for **🌙 moon icon**
2. Click it → Turn off Focus
3. OR: System Preferences → Focus → Add Chrome to "Allowed Apps"

**Also check**:
- System Preferences → Notifications & Focus → Chrome/Firefox
- Make sure "Allow Notifications" is ON
- Change "Alert Style" from "Banners" to "Alerts" (stays visible)

#### Windows:
**Focus Assist** blocks notifications!

1. Settings → System → Focus Assist
2. Set to **"Off"**

**Also check**:
- Settings → System → Notifications → ON
- Find Chrome/Edge → Turn ON

#### Browser Settings:
**Chrome/Edge**:
1. Click **padlock icon** in address bar
2. Site settings → Notifications → **Allow**
3. Reload page

**Firefox**:
1. Click **padlock icon** → Connection Secure → More Info
2. Permissions tab → Receive Notifications → **Allow**
3. Reload page

---

### Step 4: Verify Development Setup

**Check if backend is running**:
```bash
# Terminal 1
cd backend
npm start

# Should see: Server running on port 5000
```

**Check if frontend is running**:
```bash
# Terminal 2
cd frontend
npm run dev

# Should see: Local: http://localhost:5173
```

**Check Socket.IO connection**:
```javascript
// Run in browser console:
console.log('Socket ID:', window.socket?.id);
console.log('Socket connected:', window.socket?.connected);

// Should see a socket ID
```

---

### Step 5: Force Reinstall PWA (Nuclear Option)

1. **Uninstall PWA** (if installed as app)
2. **Clear all site data**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cookies and site data" + "Cached images"
   - Time range: All time
   - Click Clear data
3. **Unregister service workers**:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```
4. **Hard refresh**: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
5. **Request notification permission again**

---

## 🧪 Quick Diagnostic

Run this in browser console to see what's wrong:

```javascript
// Comprehensive check
(async function() {
  console.log('=== NOTIFICATION DIAGNOSTIC ===');
  
  // 1. API Support
  console.log('1. Notification API:', 'Notification' in window ? '✅' : '❌');
  
  // 2. Permission
  console.log('2. Permission:', Notification.permission);
  if (Notification.permission === 'denied') {
    console.log('   ⚠️ BLOCKED! Reset in browser settings');
  }
  
  // 3. Service Worker
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    console.log('3. Service Worker:', reg ? '✅ Registered' : '❌ Not registered');
    if (reg) {
      console.log('   State:', reg.active?.state);
      console.log('   Scope:', reg.scope);
    }
  } else {
    console.log('3. Service Worker: ❌ Not supported');
  }
  
  // 4. PWA Mode
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  console.log('4. PWA Mode:', isPWA ? 'Yes' : 'No (browser)');
  
  // 5. Socket
  console.log('5. Socket.IO:', window.socket?.connected ? '✅ Connected' : '❌ Disconnected');
  
  // 6. Test notification
  if (Notification.permission === 'granted') {
    console.log('6. Testing notification...');
    try {
      new Notification('🧪 Test', {body: 'Can you see this?'});
      console.log('   ✅ Notification sent!');
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }
  } else {
    console.log('6. Test skipped (no permission)');
  }
  
  console.log('=== END DIAGNOSTIC ===');
})();
```

---

## 🎯 Common Scenarios & Solutions

### Scenario 1: "Test notification works but real ones don't"
**Cause**: Backend not emitting Socket.IO events

**Fix**:
```bash
# Check backend logs when creating a task
# Should see: "✅ Client connected: <socket-id>"

# In browser console:
console.log(window.socket?.connected); // Should be true
```

### Scenario 2: "Permission is granted but nothing happens"
**Cause**: System notifications are off

**Fix**:
- macOS: Check Focus mode (🌙 in menu bar)
- Windows: Check Focus Assist
- Test with another website (e.g., twitter.com) to confirm

### Scenario 3: "Worked yesterday, broken today"
**Cause**: Service worker cached old code

**Fix**:
```javascript
// Clear service worker cache
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister());
  location.reload(true);
});
```

### Scenario 4: "Works in incognito but not normal mode"
**Cause**: Extension or cached settings

**Fix**:
1. Disable all extensions
2. Clear site data
3. Try again

---

## 🔧 Development Mode Fix

If you're in development (`npm run dev`):

1. Service Worker might not be active
2. Use direct Notification API instead:

```javascript
// In notificationService.js, use this simpler version for dev:
async showNotification(title, options = {}) {
  if (Notification.permission !== 'granted') return;
  
  // Skip service worker in dev, use direct API
  return new Notification(title, options);
}
```

---

## 📞 Still Not Working?

### Browser-Specific Issues:

**Chrome/Edge**:
- Try `chrome://flags/#enable-experimental-web-platform-features` → Enable

**Firefox**:
- `about:config` → `dom.webnotifications.enabled` → true

**Safari**:
- Must install as PWA first (Add to Home Screen)
- Preferences → Websites → Notifications → Allow

### OS-Specific:

**macOS**:
- System Preferences → Notifications & Focus
- Find Chrome/Firefox
- Turn ON all notification options
- DISABLE Focus mode

**Windows 11**:
- Settings → Notifications
- Make sure app notifications are ON
- Disable Focus Assist

**Linux**:
- Check notification daemon is running
- Test with `notify-send "test"`

---

## ✅ Verification Checklist

- [ ] Standalone test page works (`/notification-test.html`)
- [ ] Browser console shows no errors
- [ ] Permission is "granted"
- [ ] System notifications are enabled
- [ ] Focus/DND mode is OFF
- [ ] Backend is running
- [ ] Socket.IO is connected
- [ ] Service worker registered (or bypassed)
- [ ] Test notification appears

---

## 🎉 Success Indicators

You'll know it's working when you see:

### In Browser Console:
```
✅ Socket connected: abc123
✅ Notifications enabled and ready
📝 Task created event received
✅ Showing task created notification
```

### On Desktop:
- Notification appears in notification center
- Can click to open/dismiss
- Persists even if browser tab is inactive

---

**Most common issue is Focus Mode (macOS) or Focus Assist (Windows)!**

**Check the moon icon 🌙 in your menu bar FIRST!**
