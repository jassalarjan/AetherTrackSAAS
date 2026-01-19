# 🚀 HR MODULE QUICK START GUIDE

## 📋 Prerequisites
- MongoDB running and connected
- Backend server running
- Frontend development server running

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Seed HR Data
```bash
cd backend
node scripts/seedHRModule.js
```

**What this does:**
- Creates 4 default leave types (Sick, Casual, PTO, Unpaid)
- Adds 4 holidays for the current year
- Initializes 4 predefined email templates
- Sets up leave balances for all existing users

### Step 2: Add Routes to Frontend

**File:** `frontend/src/App.jsx` (or your routing file)

```jsx
// Add imports
import AttendancePage from './pages/AttendancePage';
import HRCalendar from './pages/HRCalendar';
import LeavesPage from './pages/LeavesPage';

// Add routes (inside your Routes component)
<Route path="/hr/attendance" element={<AttendancePage />} />
<Route path="/hr/calendar" element={<HRCalendar />} />
<Route path="/hr/leaves" element={<LeavesPage />} />
```

### Step 3: Update Sidebar Navigation

**File:** `frontend/src/components/Sidebar.jsx`

Add HR menu items for Admin/HR users:

```jsx
{(user?.role === 'admin' || user?.role === 'hr') && (
  <>
    <NavItem 
      to="/hr/attendance" 
      icon={<Clock className="w-5 h-5" />}
      label="Attendance"
    />
    <NavItem 
      to="/hr/calendar" 
      icon={<Calendar className="w-5 h-5" />}
      label="HR Calendar"
    />
    <NavItem 
      to="/hr/leaves" 
      icon={<Briefcase className="w-5 h-5" />}
      label="Leaves"
    />
  </>
)}
```

**Import icons at top of file:**
```jsx
import { Clock, Calendar, Briefcase } from 'lucide-react';
```

### Step 4: Restart Servers
```bash
# Backend (if not auto-reloading)
cd backend
npm run dev

# Frontend (if not auto-reloading)
cd frontend
npm run dev
```

---

## ✅ Verify Installation

### 1. **Check API Endpoints**
Open browser console and test:
```javascript
// Get leave types
fetch('http://localhost:5000/api/hr/leave-types', {
  headers: { 'Authorization': 'Bearer YOUR_JWT_TOKEN' }
}).then(r => r.json()).then(console.log)

// Get holidays
fetch('http://localhost:5000/api/hr/holidays?year=2026', {
  headers: { 'Authorization': 'Bearer YOUR_JWT_TOKEN' }
}).then(r => r.json()).then(console.log)
```

### 2. **Test UI Navigation**
- Login as Admin or HR user
- Navigate to `/hr/attendance`
- Check if page loads correctly with attendance table
- Navigate to `/hr/calendar`
- Check if calendar displays current month
- Navigate to `/hr/leaves`
- Check if leave balance cards are visible

### 3. **Test Core Features**

**Attendance:**
- Click "Check In" button → Should show success message
- Refresh page → Status should show checked in
- Click "Check Out" button → Should calculate hours

**Leaves:**
- Click "Apply Leave" button
- Fill form and submit
- Check if request appears in table with "PENDING" status
- As Admin, approve the request
- Check if leave balance updates

**Calendar:**
- Verify holidays are shown in purple
- Check if attendance records appear
- Click on a date → Event details should display in side panel

---

## 🎯 Features at a Glance

### **For Employees:**
✅ Check in/out daily  
✅ View personal attendance history  
✅ Apply for leaves  
✅ View leave balance  
✅ Cancel pending leave requests  
✅ View personal calendar  

### **For HR/Admin:**
✅ View all employee attendance  
✅ Override/edit attendance records  
✅ Approve/reject leave requests  
✅ Manage leave types  
✅ Add/edit holidays  
✅ View organization-wide calendar  
✅ Manage email templates  

---

## 🔧 Troubleshooting

### Issue: "Cannot find module" errors
**Solution:**
```bash
cd backend
npm install
```

### Issue: Seeding script fails
**Solution:**
1. Check MongoDB connection in `.env`
2. Verify `MONGODB_URI` is correct
3. Ensure database is accessible

### Issue: Routes not showing in UI
**Solution:**
1. Clear browser cache
2. Check if routes are registered in `App.jsx`
3. Verify imports are correct

### Issue: "Unauthorized" errors in API
**Solution:**
1. Check if JWT token is valid
2. Verify `authenticate` middleware is working
3. Check user role in database

### Issue: Email notifications not sending
**Solution:**
1. Test email config: `http://localhost:5000/api/test-email-config`
2. Check `.env` for email credentials
3. Review console logs for email errors

---

## 📊 Sample Data Created

### Leave Types (per workspace):
- **Sick Leave** - 12 days/year, No carry-forward
- **Casual Leave** - 10 days/year, 5 days carry-forward
- **Paid Time Off** - 15 days/year, 7 days carry-forward
- **Unpaid Leave** - Unlimited

### Holidays (2026):
- New Year (Jan 1)
- Independence Day (Jul 4)
- Thanksgiving (Nov 28)
- Christmas (Dec 25)

### Email Templates:
- Leave Request Submitted (to HR)
- Leave Approved (to employee)
- Leave Rejected (to employee)
- Attendance Reminder

---

## 🎨 Customization Options

### Change Leave Type Quotas
Edit in database or via API:
```javascript
// Example: Update Sick Leave quota to 15 days
PUT /api/hr/leave-types/:id
{
  "annualQuota": 15
}
```

### Add Custom Holidays
```javascript
POST /api/hr/holidays
{
  "name": "Company Anniversary",
  "date": "2026-06-15",
  "description": "Company celebration day"
}
```

### Create Custom Email Templates
Navigate to HR Settings (future feature) or via API:
```javascript
POST /api/hr/email-templates
{
  "name": "Welcome Email",
  "code": "WELCOME_NEW_HIRE",
  "subject": "Welcome to the team!",
  "htmlContent": "<h1>Welcome {{employeeName}}!</h1>",
  "category": "custom"
}
```

---

## 📞 Need Help?

- **Documentation:** See `HR_MODULE_IMPLEMENTATION.md` for detailed technical docs
- **API Reference:** All endpoints documented in implementation guide
- **Database Schema:** Review model files in `backend/models/`

---

## ✨ What's Next?

After basic setup, you can enhance the module with:
- **Reports:** Generate PDF/Excel attendance reports
- **Notifications:** Real-time browser notifications for leave approvals
- **Analytics:** Dashboard with charts and statistics
- **Mobile App:** React Native integration
- **Biometric Integration:** Fingerprint/face recognition check-in
- **Geofencing:** Location-based attendance validation

---

**Setup Time:** ~5 minutes  
**Production Ready:** ✅ Yes  
**Mobile Responsive:** ✅ Yes  
**Dark Mode:** ✅ Yes

Happy coding! 🎉
