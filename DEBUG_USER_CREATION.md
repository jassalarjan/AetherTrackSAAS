# Taskflow - Debugging User Creation Issue

## Issue: "Route not found" when creating user

### Quick Checklist:

1. **Is the backend server running?**
   ```powershell
   cd backend
   npm start
   ```
   You should see:
   ```
   🚀 CTMS Backend Server Running
   📡 Port: 5000
   ```

2. **Are you logged in as admin or HR?**
   - Only admin and HR users can create users
   - Check your role in the UI (shown in sidebar)

3. **Check the browser console for the exact error**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Try creating a user
   - Look for the actual API call and response

### Common Issues:

**Issue: Backend not running**
- Solution: Run `npm start` in the backend directory

**Issue: Not authenticated**
- Solution: Log out and log back in to refresh your token

**Issue: Wrong role**
- Solution: Make sure you're logged in as admin or HR
- Use the seed script to create an admin:
  ```powershell
  cd backend
  node scripts/seedAdmin.js
  ```

**Issue: CORS error**
- Solution: Make sure backend .env has `CLIENT_URL=http://localhost:3000`

### Test the API directly:

1. **Get your access token:**
   - Open browser DevTools → Application tab → Local Storage
   - Copy the `accessToken` value

2. **Test with curl (PowerShell):**
   ```powershell
   $token = "YOUR_ACCESS_TOKEN_HERE"
   $headers = @{
       "Authorization" = "Bearer $token"
       "Content-Type" = "application/json"
   }
   $body = @{
       full_name = "Test User"
       email = "test@example.com"
       password = "password123"
       role = "member"
   } | ConvertTo-Json

   Invoke-WebRequest -Uri "http://localhost:5000/api/users" -Method POST -Headers $headers -Body $body
   ```

### Route Configuration:

The route is correctly configured as:
- **URL:** POST `/api/users`
- **Auth Required:** Yes (admin or HR)
- **Body:** `{ full_name, email, password, role, team_id? }`

### Next Steps:

1. Start the backend server if it's not running
2. Check browser console for the actual error
3. Verify you're logged in as admin/HR
4. Share the exact error message from the console if issue persists
