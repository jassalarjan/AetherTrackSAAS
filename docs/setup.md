# AetherTrack — Development Setup

> AetherTrack is a multi-tenant SaaS Team Management System. The internal npm package names (`ctms-backend`, `ctms-frontend`) are legacy identifiers and do not reflect the product name.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 18.x |
| npm | >= 9.x |
| MongoDB | >= 6.x (local) or MongoDB Atlas URI |
| Git | Any recent |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd AetherTrackSAAS

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Return to root (for Capacitor CLI if needed)
cd ..
npm install
```

---

## 2. Environment Variables

### Backend — `backend/.env`

```env
# ── Required ───────────────────────────────────────────────
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/aethertrack
JWT_SECRET=your-strong-secret-min-32-chars
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# ── Email (Brevo) ───────────────────────────────────────────
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxx
BREVO_LOGIN_EMAIL=your-brevo-login@email.com
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=AetherTrack

# ── File Storage (Cloudinary) ───────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── CORS (production only) ──────────────────────────────────
ALLOWED_ORIGINS=https://your-frontend-domain.com

# ── Optional ────────────────────────────────────────────────
PORT=5000
FRONTEND_URL=http://localhost:5173
```

> **Security:** `JWT_SECRET`, `MONGODB_URI` are required or the server will **refuse to start** with `process.exit(1)`.  
> `JWT_REFRESH_SECRET` and `ALLOWED_ORIGINS` are additionally required in `NODE_ENV=production`.

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Seed Admin User

```bash
cd backend
npm run seed:admin
```

This creates the initial `admin` user. Check `backend/scripts/seedAdmin.js` for default credentials and update them immediately.

---

## 4. Start in Development

### Backend (port 5000)
```bash
cd backend
npm run dev          # nodemon server.js — hot reload
```

### Frontend (port 5173)
```bash
cd frontend
npm run dev          # vite dev server
```

Open: [http://localhost:5173](http://localhost:5173)

---

## 5. Build for Production

### Backend
```bash
# No build step needed — Node.js ESM runs directly
cd backend
npm start            # node server.js
```

### Frontend
```bash
cd frontend
npm run build        # outputs to frontend/dist/
npm run preview      # preview production build locally
```

---

## 6. Mobile (Capacitor / Android)

```bash
# Sync web assets to Android project
cd frontend
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android
```

> Requires Android Studio and SDK installed. See `ANDROID_APK_GUIDE.md` for full APK build steps.

---

## 7. Available Backend Scripts

```bash
npm run dev                    # Start with nodemon (hot reload)
npm start                      # Production start
npm run seed:admin             # Create initial admin user
npm run cleanup:admins         # Remove duplicate admin accounts
npm run migrate:workspaces     # Run workspace migration script
npm run test:email             # Test email connectivity
npm run test:cloudinary        # Test Cloudinary connectivity
```

---

## 8. Common Issues

| Problem | Fix |
|---|---|
| `Missing required env vars` | Check `backend/.env` — `JWT_SECRET` and `MONGODB_URI` must be set |
| CORS error from frontend | Verify `VITE_API_URL` matches backend port; in production set `ALLOWED_ORIGINS` |
| Socket.IO not connecting | Ensure backend is running before frontend; check `withCredentials: true` |
| Email not sending | Verify `BREVO_API_KEY` is valid; check Brevo sender domain verification |
| Cloudinary upload failing | Confirm `CLOUDINARY_*` env vars are correct and the upload preset exists |
| MongoDB connection error | Check `MONGODB_URI`; ensure MongoDB service is running or Atlas IP whitelist is correct |
