import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import auditRoutes from './routes/audit.js';
import apiLogsRoutes from './routes/apiLogs.js';
import projectRoutes from './routes/projects.js';
import sprintRoutes from './routes/sprints.js';
// HR Module routes
import attendanceRoutes from './routes/attendance.js';
import verificationRoutes from './routes/verification.js';
import leavesRoutes from './routes/leaves.js';
import leaveTypesRoutes from './routes/leaveTypes.js';
import holidaysRoutes from './routes/holidays.js';
import hrCalendarRoutes from './routes/hrCalendar.js';
import emailTemplatesRoutes from './routes/emailTemplates.js';
import emailHubRoutes from './routes/emailHub.js';
import automationsRoutes from './routes/automations.js';
import reportAutomationsRoutes from './routes/reportAutomations.js';
import meetingRoutes from './routes/meetings.js';
import shiftsRoutes from './routes/shifts.js';
import reallocationRoutes from './routes/reallocation.js';
import settingsRoutes from './routes/settings.js';

// Import middleware
import { authenticate } from './middleware/auth.js';
import { requireTenant } from './middleware/tenantIsolation.js';
import { apiAuditLogger } from './middleware/apiAuditLogger.js';
import { logSystemAuditIssue } from './services/systemAuditService.js';

// Import scheduler
import { initializeScheduler } from './utils/scheduler.js';
import { initializeAutomationRunner, primeAutomationNextRuns } from './services/automationRunner.js';
import reportRunner from './services/reportRunner.js';

// Load environment variables (ensure we read backend/.env even if CWD is project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MIN_JWT_SECRET_LENGTH = Number(process.env.MIN_JWT_SECRET_LENGTH || 32);
const DISALLOWED_JWT_SECRETS = new Set([
  'changeme',
  'change-me',
  'secret',
  'jwt-secret',
  'jwtsecret',
  'password',
  'test',
  'development'
]);

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
  
  // SECURITY: Reject weak/default JWT secrets in production to prevent token forgery
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET;

  const weakSecretIssues = [];
  const checkSecretStrength = (value, key) => {
    if (!value) {
      return;
    }

    const trimmedValue = String(value).trim();

    if (trimmedValue.length < MIN_JWT_SECRET_LENGTH) {
      weakSecretIssues.push(`${key} must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
      return;
    }

    if (DISALLOWED_JWT_SECRETS.has(trimmedValue.toLowerCase())) {
      weakSecretIssues.push(`${key} uses a disallowed default value`);
    }
  };

  checkSecretStrength(jwtSecret, 'JWT_SECRET');
  checkSecretStrength(jwtRefreshSecret, 'JWT_REFRESH_SECRET');

  if (weakSecretIssues.length > 0) {
    const message = `[SECURITY] Weak JWT secret configuration detected: ${weakSecretIssues.join('; ')}`;

    if (isProduction) {
      console.error(`[CRITICAL] ${message}`);
      console.error('[CRITICAL] Refusing to start in production with weak JWT secrets');
      process.exit(1);
    }

    console.warn(`[SECURITY WARNING] ${message}`);
  }
  
  console.log('✅ All critical environment variables validated');
}

// Call validation BEFORE any other initialization
validateCriticalEnvVars();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Security: Build allowed origins from ALLOWED_ORIGINS across all environments.
// Development mode appends localhost defaults rather than replacing configured origins.
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173'
];

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '');

const parseAllowedOriginsFromEnv = () => (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
        .split(',')
        .map(origin => normalizeOrigin(origin))
        .filter(Boolean)
    : []
);

const getAllowedOrigins = () => {
  const configuredOrigins = parseAllowedOriginsFromEnv();
  const normalizedOrigins = new Set(configuredOrigins);

  if ((process.env.NODE_ENV || 'development') !== 'production') {
    DEFAULT_DEV_ORIGINS.forEach((origin) => normalizedOrigins.add(normalizeOrigin(origin)));
  }

  return Array.from(normalizedOrigins);
};

const allowedOrigins = getAllowedOrigins();
const SOCKET_RATE_LIMIT_WINDOW_MS = Number(process.env.SOCKET_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const SOCKET_RATE_LIMIT_MAX = Number(process.env.SOCKET_RATE_LIMIT_MAX || 30);
const socketConnectionAttempts = new Map();
const isProduction = process.env.NODE_ENV === 'production';

const socketLogContext = ({ socketId, clientIp } = {}) => {
  if (isProduction) {
    return '';
  }

  const context = [];
  if (socketId) context.push(`socket=${socketId}`);
  if (clientIp) context.push(`ip=${clientIp}`);

  return context.length > 0 ? ` (${context.join(', ')})` : '';
};

const describeSocketRoom = (room) => {
  const roomValue = String(room || '');
  if (!roomValue) return 'unknown-room';
  if (roomValue.startsWith('project-')) return 'project-room';
  if (roomValue.startsWith('team-')) return 'team-room';
  if (/^[a-f\d]{24}$/i.test(roomValue)) return 'id-room';
  return isProduction ? 'custom-room' : roomValue;
};

const isOriginAllowed = (origin) => {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.some((allowed) => normalizedOrigin === normalizeOrigin(allowed));
};

const getSocketClientIp = (socket) => {
  const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
  const rawForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (rawForwarded) {
    return String(rawForwarded).split(',')[0].trim();
  }

  return socket.handshake.address || socket.conn?.remoteAddress || 'unknown';
};

const isSocketRateLimited = (ip) => {
  const now = Date.now();
  const windowStart = now - SOCKET_RATE_LIMIT_WINDOW_MS;
  const existingAttempts = socketConnectionAttempts.get(ip) || [];
  const activeAttempts = existingAttempts.filter((attemptTs) => attemptTs > windowStart);

  activeAttempts.push(now);
  socketConnectionAttempts.set(ip, activeAttempts);

  return activeAttempts.length > SOCKET_RATE_LIMIT_MAX;
};

setInterval(() => {
  const cutoff = Date.now() - SOCKET_RATE_LIMIT_WINDOW_MS;
  for (const [ip, attempts] of socketConnectionAttempts.entries()) {
    const activeAttempts = attempts.filter((attemptTs) => attemptTs > cutoff);
    if (activeAttempts.length === 0) {
      socketConnectionAttempts.delete(ip);
    } else {
      socketConnectionAttempts.set(ip, activeAttempts);
    }
  }
}, Math.max(10 * 1000, SOCKET_RATE_LIMIT_WINDOW_MS)).unref();

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();

const DOWNLOAD_ROLE_ALLOWLIST = new Set(['admin', 'super_admin', 'hr']);
const DOWNLOAD_PATH_PATTERNS = [
  /\/download(\/|$)/i,
  /\/export(\/|$)/i,
  /\/template(\/|$)/i,
  /\/data-export(\/|$)/i,
  /\/report(s)?(\/|$)/i
];
const DOWNLOAD_QUERY_KEYS = new Set(['download', 'export', 'format', 'fileType', 'file_type']);
const DOWNLOAD_FORMAT_VALUES = new Set(['csv', 'xlsx', 'xls', 'pdf', 'zip', 'json']);
const DOWNLOAD_EXEMPT_PATHS = [
  /^\/api\/mobile\//i,
  /^\/api\/app-version(\/|$)/i,
  /\.apk$/i,
  /\/manifest\.webmanifest$/i,
  /\/sw\.js$/i,
  /\/workbox-[^/]+\.js$/i,
  /\/icons\//i
];

const getTokenFromRequest = (req) => {
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
};

const isDownloadRequest = (req) => {
  const pathOnly = req.path || '';
  const fullPath = req.originalUrl || pathOnly;

  if (DOWNLOAD_EXEMPT_PATHS.some((pattern) => pattern.test(pathOnly) || pattern.test(fullPath))) {
    return false;
  }

  if (DOWNLOAD_PATH_PATTERNS.some((pattern) => pattern.test(pathOnly))) {
    return true;
  }

  for (const [key, value] of Object.entries(req.query || {})) {
    if (!DOWNLOAD_QUERY_KEYS.has(key)) continue;

    const normalized = String(value || '').trim().toLowerCase();
    if (key === 'download' || key === 'export') {
      if (['1', 'true', 'yes'].includes(normalized)) {
        return true;
      }
      continue;
    }

    if (DOWNLOAD_FORMAT_VALUES.has(normalized)) {
      return true;
    }
  }

  const acceptHeader = String(req.headers.accept || '').toLowerCase();
  if (
    acceptHeader.includes('application/pdf') ||
    acceptHeader.includes('text/csv') ||
    acceptHeader.includes('application/zip') ||
    acceptHeader.includes('application/vnd.openxmlformats-officedocument') ||
    acceptHeader.includes('application/octet-stream')
  ) {
    return true;
  }

  return false;
};

const enforceDownloadRoleAccess = (req, res, next) => {
  if (!isDownloadRequest(req)) {
    return next();
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required for downloads' });
  }

  const decoded = verifyAccessToken(token);
  const role = String(decoded?.role || '').toLowerCase();

  if (!DOWNLOAD_ROLE_ALLOWLIST.has(role)) {
    return res.status(403).json({
      message: 'Only Admin, Super Admin, or HR users can download/export data from the system.'
    });
  }

  return next();
};

// Initialize Socket.IO with strict CORS configuration (FAIL CLOSED)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Socket.IO CORS - use same strict policy as Express
      if (!origin) {
        return callback(null, false);
      }

      if (isOriginAllowed(origin)) {
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
initializeAutomationRunner({ io });
reportRunner.init(io).catch(() => {});
primeAutomationNextRuns().catch(() => {});

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
    
    if (isOriginAllowed(origin)) {
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

const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 100),
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalApiLimiter);

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

  // Restrict all download/export style requests to privileged roles.
  // APK/PWA update-related paths are explicitly exempt.
  app.use('/api', enforceDownloadRoleAccess);

// Make io accessible to routes
app.set('io', io);

// ============================================================================
// Socket.IO Security: JWT Authentication Middleware
// ============================================================================
// SECURITY: All socket connections must be authenticated with a valid JWT token
// This prevents unauthorized clients from connecting to the WebSocket server
io.use(async (socket, next) => {
  const clientIp = getSocketClientIp(socket);

  if (isSocketRateLimited(clientIp)) {
    console.warn(`[SECURITY] Socket connection rejected: rate limit exceeded${socketLogContext({ socketId: socket.id, clientIp })}`);
    return next(new Error('Rate limit exceeded'));
  }

  // Extract token from handshake auth or Authorization header
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.warn(`[SECURITY] Socket connection rejected: No token provided${socketLogContext({ socketId: socket.id, clientIp })}`);
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    // Verify the JWT token
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      console.warn(`[SECURITY] Socket connection rejected: Invalid token payload${socketLogContext({ socketId: socket.id, clientIp })}`);
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password_hash');
    
    if (!user) {
      console.warn(`[SECURITY] Socket connection rejected: User not found${socketLogContext({ socketId: socket.id, clientIp })}`);
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user info to socket for use in event handlers
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    socket.user = user;
    
    console.log(`[SOCKET] Client authenticated${socketLogContext({ socketId: socket.id })}`);
    next();
  } catch (err) {
    console.warn(`[SECURITY] Socket connection rejected: Token verification failed (${err.message})${socketLogContext({ socketId: socket.id, clientIp })}`);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// ============================================================================
// Socket.IO Connection Handling with Room Isolation
// ============================================================================
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected${socketLogContext({ socketId: socket.id })}`);

  // SECURITY: Auto-join user to their own notification room
  // Room name is the userId string (matching existing convention in routes)
  // e.g., io.to(userId.toString()).emit() targets this room
  const userRoom = socket.userId.toString();
  socket.join(userRoom);
  console.log(`[SOCKET] Client auto-joined notification room (${describeSocketRoom(userRoom)})${socketLogContext({ socketId: socket.id })}`);

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
      console.log(`[SOCKET] Room join allowed (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
      if (callback) callback({ success: true, room });
    } else if (isTeamRoom) {
      // User can join their team's room
      socket.join(room);
      console.log(`[SOCKET] Team room join allowed (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
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
          console.warn(`[SECURITY] Socket join rejected: Project room not found (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
          if (callback) callback({ success: false, error: 'Project not found' });
          return;
        }
        const userIdStr = socket.userId.toString();
        const isMember = project.team_members.some(
          m => m.user?.toString() === userIdStr
        );
        const isCreator = project.created_by?.toString() === userIdStr;
        const isAdminOrHr = ['super_admin', 'admin', 'hr'].includes(socket.userRole);
        if (!isMember && !isCreator && !isAdminOrHr) {
          console.warn(`[SECURITY] Socket join rejected: Unauthorized project room access (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
          if (callback) callback({ success: false, error: 'Not authorized to join this room' });
          return;
        }
        socket.join(room);
        console.log(`[SOCKET] Project room join allowed (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
        if (callback) callback({ success: true, room });
      } catch (err) {
        console.error(`[SOCKET] Error verifying project membership (${describeSocketRoom(room)}):`, err?.message || 'Unknown error');
        if (callback) callback({ success: false, error: 'Authorization check failed' });
      }
    } else {
      // SECURITY: Log unauthorized room join attempts
      console.warn(`[SECURITY] Socket join rejected: Unauthorized room (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
      if (callback) callback({ success: false, error: 'Not authorized to join this room' });
    }
  });

  // ============================================================================
  // Room Leave Handler
  // ============================================================================
  socket.on('leave', (room, callback) => {
    socket.leave(room);
    console.log(`[SOCKET] Client left room (${describeSocketRoom(room)})${socketLogContext({ socketId: socket.id })}`);
    if (callback) callback({ success: true, room });
  });

  // ============================================================================
  // Disconnect Handler
  // ============================================================================
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected${socketLogContext({ socketId: socket.id })}`);
  });

  // ============================================================================
  // Error Handler
  // ============================================================================
  socket.on('error', (error) => {
    console.error(`[SOCKET ERROR] Client error${socketLogContext({ socketId: socket.id })}:`, error?.message || 'Unknown error');
  });
});

// API Routes
// Auth routes (public, no workspace context needed for login/register)
app.use('/api/auth', authRoutes);

// Protected routes with authentication
app.use('/api/users', authenticate, requireTenant, apiAuditLogger(), userRoutes);
app.use('/api/teams', authenticate, requireTenant, apiAuditLogger(), teamRoutes);
app.use('/api/tasks', authenticate, requireTenant, apiAuditLogger(), taskRoutes);
app.use('/api/projects', authenticate, requireTenant, apiAuditLogger(), projectRoutes);
app.use('/api/sprints', authenticate, requireTenant, apiAuditLogger(), sprintRoutes);
app.use('/api/comments', authenticate, requireTenant, apiAuditLogger(), commentRoutes);
app.use('/api/notifications', authenticate, requireTenant, apiAuditLogger(), notificationRoutes);
app.use('/api/changelog', authenticate, requireTenant, apiAuditLogger(), changelogRoutes);
app.use('/api/audit', authenticate, requireTenant, apiAuditLogger(), auditRoutes);
app.use('/api/api-logs', authenticate, requireTenant, apiLogsRoutes);
app.use('/api/automations', authenticate, requireTenant, apiAuditLogger(), automationsRoutes);
app.use('/api/report-automations', authenticate, requireTenant, apiAuditLogger(), reportAutomationsRoutes);
// HR Module routes with authentication
app.use('/api/hr/attendance', authenticate, requireTenant, apiAuditLogger(), attendanceRoutes);
app.use('/api/geofences', authenticate, requireTenant, apiAuditLogger(), verificationRoutes);
app.use('/api/hr/leaves', authenticate, requireTenant, apiAuditLogger(), leavesRoutes);
app.use('/api/hr/leave-types', authenticate, requireTenant, apiAuditLogger(), leaveTypesRoutes);
app.use('/api/hr/holidays', authenticate, requireTenant, apiAuditLogger(), holidaysRoutes);
app.use('/api/hr/calendar', authenticate, requireTenant, apiAuditLogger(), hrCalendarRoutes);
app.use('/api/hr/email-templates', authenticate, requireTenant, apiAuditLogger(), emailTemplatesRoutes);
app.use('/api/email-hub', authenticate, requireTenant, apiAuditLogger(), emailHubRoutes);
app.use('/api/hr/meetings', authenticate, requireTenant, apiAuditLogger(), meetingRoutes);
app.use('/api/hr/shifts', authenticate, requireTenant, apiAuditLogger(), shiftsRoutes);
app.use('/api/hr/reallocation', authenticate, requireTenant, apiAuditLogger(), reallocationRoutes);
app.use('/api/settings', authenticate, requireTenant, apiAuditLogger(), settingsRoutes);

// Mobile/Web wrapper version endpoint (polled by app for auto-refresh)
app.get('/api/app-version', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    version: APP_VERSION,
    buildTime: BUILD_TIME,
  });
});

// Deployment hook to broadcast a new app version event over Socket.IO
app.post('/api/app-version/notify', (req, res) => {
  const expected = String(process.env.APP_VERSION_NOTIFY_TOKEN || '').trim();

  if (!expected) {
    return res.status(503).json({ message: 'Version notify not configured' });
  }

  const provided = req.header('x-app-version-token');

  if (provided !== expected) {
    return res.status(401).json({ message: 'Invalid version notify token' });
  }

  const payload = {
    version: req.body?.version || APP_VERSION,
    buildTime: req.body?.buildTime || BUILD_TIME,
  };

  io.emit('new_app_version', payload);
  return res.json({ ok: true, ...payload });
});

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
  void logSystemAuditIssue({
    source: 'backend',
    level: 'critical',
    category: 'unhandled_exception',
    message: err?.message || 'Unhandled backend exception',
    request: {
      method: req?.method,
      path: req?.originalUrl,
      status_code: err?.status || 500,
      ip: req?.ip
    },
    error: {
      name: err?.name,
      stack: err?.stack
    },
    metadata: {
      route: req?.route?.path,
      params: req?.params,
      query: req?.query
    },
    user: req?.user
  });
  // Never leak internal error details to clients in production
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing backend instance before starting a new one.`);
    process.exit(1);
  }

  console.error('❌ HTTP server error:', error);
  process.exit(1);
});

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
