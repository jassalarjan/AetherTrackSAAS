import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import connectDB from './config/db.js';

// Import JWT utilities for Socket.IO authentication
import { verifyAccessToken } from './utils/jwt.js';
import User from './models/User.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import changelogRoutes from './routes/changelog.js';
import projectRoutes from './routes/projects.js';
import sprintRoutes from './routes/sprints.js';
// HR Module routes
import attendanceRoutes from './routes/attendance.js';
import leavesRoutes from './routes/leaves.js';
import leaveTypesRoutes from './routes/leaveTypes.js';
import holidaysRoutes from './routes/holidays.js';
import hrCalendarRoutes from './routes/hrCalendar.js';
import emailTemplatesRoutes from './routes/emailTemplates.js';
import meetingRoutes from './routes/meetings.js';
import shiftsRoutes from './routes/shifts.js';
import reallocationRoutes from './routes/reallocation.js';

// Import middleware
import { authenticate } from './middleware/auth.js';

// Import scheduler
import { initializeScheduler } from './utils/scheduler.js';

// Load environment variables (ensure we read backend/.env even if CWD is project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================================
// SECURITY: Critical Environment Variables Validation
// ============================================================================
// SECURITY: Validate all critical environment variables before starting the server
// The application MUST NOT start if these are missing in production
function validateCriticalEnvVars() {
  // Determine if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base requirements for all environments
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  
  // Add production-only requirements
  if (isProduction) {
    required.push('JWT_REFRESH_SECRET', 'ALLOWED_ORIGINS');
  }
  
  const missing = required.filter(key => !process.env[key] || process.env[key].trim() === '');
  
  if (missing.length > 0) {
    console.error('[CRITICAL] Missing required environment variables:', missing.join(', '));
    console.error('[CRITICAL] Application cannot start without these variables');
    console.error('[CRITICAL] Terminating process due to missing configuration');
    process.exit(1);
  }
  
  // SECURITY: Warn if using weak JWT secrets (less than 32 characters)
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;
  
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn('[SECURITY WARNING] JWT_SECRET is less than 32 characters. Consider using a stronger secret.');
  }
  
  if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
    console.warn('[SECURITY WARNING] JWT_REFRESH_SECRET is less than 32 characters. Consider using a stronger secret.');
  }
  
  console.log('✅ All critical environment variables validated');
}

// Call validation BEFORE any other initialization
validateCriticalEnvVars();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Security: Build allowed origins from environment variable (comma-separated)
// This is defined early so it can be used for both Socket.IO and Express CORS
const getAllowedOrigins = () => {
  // In development, always allow localhost origins regardless of ALLOWED_ORIGINS setting
  // This ensures local development works even if .env has incorrect values
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'development') {
    console.log('🛠️  Development mode: Allowing all localhost origins');
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }
  
  // Production: require ALLOWED_ORIGINS to be set
  const envOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o)
    : [];
  
  return envOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Initialize Socket.IO with strict CORS configuration (FAIL CLOSED)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Socket.IO CORS - use same strict policy as Express
      if (!origin) {
        return callback(null, false);
      }
      // Trailing-slash normalisation only – never strip scheme (http ≠ https)
      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.some(
        allowed => normalizedOrigin === allowed.replace(/\/$/, '')
      );
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`🚫 Socket.IO CORS rejected origin: ${origin}`);
        callback(new Error('Origin not allowed by CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Connect to MongoDB
connectDB();

// Initialize scheduler for automated tasks
initializeScheduler();

// Trust proxy - required to get real client IP behind reverse proxies (Render, Vercel, Nginx, etc.)
// Use 1 instead of true to trust only the first proxy hop, satisfying express-rate-limit's
// ERR_ERL_PERMISSIVE_TRUST_PROXY validation while still correctly reading client IPs.
app.set('trust proxy', 1);

// ============================================================================
// SECURITY: Global Security Middleware (Helmet)
// ============================================================================
// SECURITY: Configure Helmet for comprehensive security headers
// - Disables X-Powered-By header to hide server technology
// - Sets X-Content-Type-Options: nosniff to prevent MIME sniffing
// - Sets X-Frame-Options: SAMEORIGIN to prevent clickjacking
// - Sets X-XSS-Protection for legacy browser protection
// - Configures Content Security Policy (CSP)
// - Enables HSTS in production for HTTPS enforcement
app.use(helmet({
  // Content Security Policy - restricts resource loading sources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for inline styles
      imgSrc: ["'self'", 'data:', 'https:'], // Allow data: URIs and HTTPS images
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"], // API connections only to same origin
      frameAncestors: ["'self'"], // Prevent embedding in iframes from other origins
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"], // Disallow <object>, <embed>, <applet>
    },
  },
  // X-Content-Type-Options: Prevents MIME type sniffing
  contentTypeOptions: true,
  // X-Frame-Options: Prevents clickjacking attacks
  frameguard: {
    action: 'sameorigin',
  },
  // X-XSS-Protection: Enables browser's XSS filter (legacy, but still useful)
  xssFilter: true,
  // Disable X-Powered-By header to hide Express usage
  hidePoweredBy: true,
  // HSTS: Strict Transport Security (production only)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  // Referrer-Policy: Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Cross-Origin policies for additional security
  crossOriginEmbedderPolicy: false, // May need to disable for external resources
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  // Origin-Agent-Cluster: Enable origin-keyed agent clusters
  originAgentCluster: true,
}));

// Security check: In production, fail if no origins are configured
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('❌ FATAL: ALLOWED_ORIGINS environment variable is not set in production.');
  console.error('   CORS requires explicit origin whitelist for security.');
  console.error('   Set ALLOWED_ORIGINS to a comma-separated list of allowed origins.');
  process.exit(1);
}

console.log(`🔐 CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'None (all requests will be rejected)'}`);

// Middleware - Strict CORS configuration (FAIL CLOSED)
app.use(cors({
  origin: (origin, callback) => {
    // SECURITY: Requests with no origin (mobile apps, curl, server-to-server)
    // must be rejected unless they have valid authentication
    // This prevents unauthorized cross-origin access
    if (!origin) {
      // Reject requests with no origin - they must use direct API access with proper auth
      // This is safer than allowing all no-origin requests
      return callback(null, false);
    }
    
    // Strict whitelist check - only allow explicitly listed origins
    // Trailing-slash normalisation only – never strip scheme (http ≠ https).
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(
      allowed => normalizedOrigin === allowed.replace(/\/$/, '')
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // FAIL CLOSED: Reject non-whitelisted origins
      console.warn(`🚫 CORS rejected request from non-whitelisted origin: ${origin}`);
      callback(new Error('Origin not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================================
// SECURITY: Enforce JSON Content-Type for API Responses
// ============================================================================
// SECURITY: Middleware to set proper Content-Type for API responses
// This ensures responses are always treated as JSON, preventing content-type
// confusion attacks and ensuring consistent API behavior
app.use((req, res, next) => {
  // Set X-Content-Type-Options header as a backup (helmet also sets this)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // For API routes, we can enforce JSON content type on responses
  // This is applied via a response helper that can be used by route handlers
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Ensure Content-Type is set to application/json for JSON responses
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalJson(body);
  };
  
  next();
});

// Make io accessible to routes
app.set('io', io);

// ============================================================================
// Socket.IO Security: JWT Authentication Middleware
// ============================================================================
// SECURITY: All socket connections must be authenticated with a valid JWT token
// This prevents unauthorized clients from connecting to the WebSocket server
io.use(async (socket, next) => {
  // Extract token from handshake auth or Authorization header
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.warn(`[SECURITY] Socket ${socket.id} rejected: No token provided`);
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    // Verify the JWT token
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      console.warn(`[SECURITY] Socket ${socket.id} rejected: Invalid token payload`);
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password_hash');
    
    if (!user) {
      console.warn(`[SECURITY] Socket ${socket.id} rejected: User not found (userId: ${decoded.userId})`);
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user info to socket for use in event handlers
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    socket.user = user;
    
    console.log(`🔐 Socket ${socket.id} authenticated for user: ${decoded.userId} (role: ${decoded.role})`);
    next();
  } catch (err) {
    console.warn(`[SECURITY] Socket ${socket.id} rejected: Token verification failed - ${err.message}`);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// ============================================================================
// Socket.IO Connection Handling with Room Isolation
// ============================================================================
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id} (User: ${socket.userId})`);

  // SECURITY: Auto-join user to their own notification room
  // Room name is the userId string (matching existing convention in routes)
  // e.g., io.to(userId.toString()).emit() targets this room
  const userRoom = socket.userId.toString();
  socket.join(userRoom);
  console.log(`📢 User ${socket.userId} auto-joined their notification room: ${userRoom}`);

  // ============================================================================
  // Room Join Handler with Authorization
  // ============================================================================
  // SECURITY: Validate room access before allowing clients to join
  socket.on('join', async (room, callback) => {
    // Get user's team ID (handle both populated and unpopulated cases)
    const userTeamId = socket.user?.team_id?._id?.toString() || socket.user?.team_id?.toString();
    
    // Check if room matches allowed patterns
    const isUserRoom = room === socket.userId.toString();
    const isTeamRoom = userTeamId && room === userTeamId;
    const isProjectRoom = room.startsWith('project-');
    
    if (isUserRoom) {
      // User can always join their own notification room
      socket.join(room);
      console.log(`📢 User ${socket.userId} joined room: ${room}`);
      if (callback) callback({ success: true, room });
    } else if (isTeamRoom) {
      // User can join their team's room
      socket.join(room);
      console.log(`📢 User ${socket.userId} joined team room: ${room}`);
      if (callback) callback({ success: true, room });
    } else if (isProjectRoom) {
      // SECURITY: Verify the user is actually a member of this project before
      // allowing them to join the room.  Extract the project ID from the
      // room name (format: "project-<id>").
      const projectId = room.replace('project-', '');
      try {
        const ProjectModel = (await import('./models/Project.js')).default;
        const project = await ProjectModel.findById(projectId, 'team_members created_by');
        if (!project) {
          console.warn(`[SECURITY] User ${socket.userId} tried to join non-existent project room: ${room}`);
          if (callback) callback({ success: false, error: 'Project not found' });
          return;
        }
        const userIdStr = socket.userId.toString();
        const isMember = project.team_members.some(
          m => m.user?.toString() === userIdStr
        );
        const isCreator = project.created_by?.toString() === userIdStr;
        const isAdminOrHr = ['admin', 'hr'].includes(socket.userRole);
        if (!isMember && !isCreator && !isAdminOrHr) {
          console.warn(`[SECURITY] User ${socket.userId} unauthorised join attempt for project room: ${room}`);
          if (callback) callback({ success: false, error: 'Not authorized to join this room' });
          return;
        }
        socket.join(room);
        console.log(`📢 User ${socket.userId} joined project room: ${room}`);
        if (callback) callback({ success: true, room });
      } catch (err) {
        console.error(`[SOCKET] Error verifying project membership for room ${room}:`, err);
        if (callback) callback({ success: false, error: 'Authorization check failed' });
      }
    } else {
      // SECURITY: Log unauthorized room join attempts
      console.warn(`[SECURITY] User ${socket.userId} attempted to join unauthorized room: ${room}`);
      if (callback) callback({ success: false, error: 'Not authorized to join this room' });
    }
  });

  // ============================================================================
  // Room Leave Handler
  // ============================================================================
  socket.on('leave', (room, callback) => {
    socket.leave(room);
    console.log(`📤 User ${socket.userId} left room: ${room}`);
    if (callback) callback({ success: true, room });
  });

  // ============================================================================
  // Disconnect Handler
  // ============================================================================
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id} (User: ${socket.userId})`);
  });

  // ============================================================================
  // Error Handler
  // ============================================================================
  socket.on('error', (error) => {
    console.error(`[SOCKET ERROR] Socket ${socket.id} (User: ${socket.userId}):`, error);
  });
});

// API Routes
// Auth routes (public, no workspace context needed for login/register)
app.use('/api/auth', authRoutes);

// Protected routes with authentication
app.use('/api/users', authenticate, userRoutes);
app.use('/api/teams', authenticate, teamRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/sprints', authenticate, sprintRoutes);
app.use('/api/comments', authenticate, commentRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/changelog', authenticate, changelogRoutes);
// HR Module routes with authentication
app.use('/api/hr/attendance', authenticate, attendanceRoutes);
app.use('/api/hr/leaves', authenticate, leavesRoutes);
app.use('/api/hr/leave-types', authenticate, leaveTypesRoutes);
app.use('/api/hr/holidays', authenticate, holidaysRoutes);
app.use('/api/hr/calendar', authenticate, hrCalendarRoutes);
app.use('/api/hr/email-templates', authenticate, emailTemplatesRoutes);
app.use('/api/hr/meetings', authenticate, meetingRoutes);
app.use('/api/hr/shifts', authenticate, shiftsRoutes);
app.use('/api/hr/reallocation', authenticate, reallocationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  // Never leak internal error details to clients in production
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 CTMS Backend Server Running      ║
║   📡 Port: ${PORT}                      ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}     ║
║   🔌 Socket.IO: Enabled                ║
╚════════════════════════════════════════╝
  `);
});

export default app;
