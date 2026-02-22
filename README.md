# AetherTrack -  Task Management System

A comprehensive, role-based task management system built with **Node.js**, **Express**, **MongoDB**, **React**, and **Socket.IO**.

## 🎯 Features

### Core Features
- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)** - Admin, HR, Team Lead, Member
- **Real-time Updates** via Socket.IO
- **Task Management** - Create, assign, track, and comment on tasks
- **Team Management** - Organize users into teams with dedicated leads
- **User Management** - Admin and HR can manage users and roles
- **Notifications** - Real-time notifications for task assignments and updates
- **Automated Email System** - Welcome emails with credentials for new users
- **📊 Automated Reminders** - Daily overdue task email reminders
- **📈 Weekly Reports** - Automated Excel & PDF reports to admins
- **Responsive UI** - Built with TailwindCSS

### Automation Features (NEW! 🎉)
- **Daily Overdue Reminders**: Automatic email notifications at 9:00 AM for users with overdue tasks
- **Weekly Reports**: Excel and PDF reports sent to admins every Monday at 8:00 AM
- **Beautiful Email Templates**: Professional HTML emails with AetherTrack branding
- See [AUTOMATION_GUIDE.md](./AUTOMATION_GUIDE.md) for details

### Role Capabilities

| Feature | Admin | HR | Team Lead | Member |
|---------|-------|-----|-----------|---------|
| Manage Users | ✅ | ✅ | ❌ | ❌ |
| Create Teams | ✅ | ✅ | ❌ | ❌ |
| View All Tasks | ✅ | ✅ | Team Only | Own Only |
| Create Tasks | ✅ | ✅ | ✅ | ✅ |
| Assign Tasks | ✅ | ✅ | ✅ | Self Only |
| Delete Tasks | ✅ | ✅ | ✅ | ❌ |
| Manage Teams | ✅ | ✅ | View Only | ❌ |

## 🏗️ Architecture

```
AetherTrack/
├── backend/              # Node.js + Express API
│   ├── config/          # Database configuration
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & role checking
│   ├── utils/           # JWT utilities
│   └── server.js        # Main server file
│
└── frontend/            # React + Vite application
    ├── src/
    │   ├── api/         # Axios configuration
    │   ├── components/  # Reusable UI components
    │   ├── context/     # Auth context & providers
    │   ├── pages/       # Main application pages
    │   └── routes/      # Protected route wrappers
    └── public/          # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Configure environment variables:**
Create `.env` file in `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
REFRESH_SECRET=your_refresh_secret_key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

4. **Important: MongoDB Atlas IP Whitelist**
⚠️ **Critical Step** - If using MongoDB Atlas:
- Go to your MongoDB Atlas dashboard
- Navigate to Network Access
- Click "Add IP Address"
- Either:
  - Add your current IP address
  - Or click "Allow Access from Anywhere" (0.0.0.0/0) for development

5. **Start the backend server:**
```bash
npm start
# or
yarn start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Configure environment variables:**
Create `.env` file in `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. **Start the development server:**
```bash
npm run dev
# or
yarn dev
```

Frontend will run on `http://localhost:3000`

## 📝 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "member"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## 🧪 Testing the Application

### Create Test Users via API

```bash
# Register Admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin User","email":"admin@AetherTrack.com","password":"admin123","role":"admin"}'

# Register HR
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"HR Manager","email":"hr@AetherTrack.com","password":"hr123","role":"hr"}'

# Register Team Lead
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Team Lead","email":"lead@AetherTrack.com","password":"lead123","role":"team_lead"}'

# Register Member
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Team Member","email":"member@AetherTrack.com","password":"member123","role":"member"}'
```

## 🔧 Current Status

✅ **Implemented:**
- Complete backend API with all endpoints
- MongoDB models with role-based schema
- JWT authentication system
- React frontend with all pages
- Real-time Socket.IO integration
- Task management UI
- Team management UI
- Notifications system
- Role-based access control

⚠️ **Setup Required:**
- **MongoDB Atlas IP Whitelist:** Add your IP address to MongoDB Atlas Network Access
  - Without this, database operations will fail
  - Go to: MongoDB Atlas Dashboard → Network Access → Add IP Address
  - Use 0.0.0.0/0 for development (allow all IPs)

## 🛠️ Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.IO (Real-time)
- JWT (Authentication)
- Bcrypt (Password hashing)

**Frontend:**
- React 18
- Vite
- React Router v6
- TailwindCSS
- Axios
- Socket.IO Client
- Lucide React (Icons)

---

**Built with ❤️ for effective team collaboration**

