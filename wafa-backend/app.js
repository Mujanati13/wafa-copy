import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import MongoStore from "connect-mongo";
import session from "express-session";
import passport from "passport";
import "./strategies/local-strategy.js";
import "./strategies/google-strategy.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5010;
const isProduction = process.env.NODE_ENV === "production";
const verboseRequestLogging = process.env.REQUEST_LOGGING === "true" || !isProduction;
const slowRequestThresholdMs = Number.parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || "1000", 10);
const autoIndex = process.env.MONGO_AUTO_INDEX
  ? process.env.MONGO_AUTO_INDEX === "true"
  : !isProduction;

app.disable("x-powered-by");

// Body parsing middleware - these must come first
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
}

// Cache uploaded assets in production and avoid per-file request logging.
app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'allow',
  index: false,
  maxAge: isProduction ? '7d' : 0,
  immutable: isProduction
}));

// Older question uploads were written below process.cwd(). When the server was
// launched from the repository root, those files landed outside __dirname and
// were therefore registered in MongoDB but unreachable over HTTP. Keep a
// read-only fallback for those files while all new uploads use uploadsDir.
const legacyQuestionUploadsDir = path.resolve(process.cwd(), 'uploads', 'questions');
const questionUploadsDir = path.join(uploadsDir, 'questions');
if (
  legacyQuestionUploadsDir !== questionUploadsDir &&
  fs.existsSync(legacyQuestionUploadsDir)
) {
  app.use('/uploads/questions', express.static(legacyQuestionUploadsDir, {
    dotfiles: 'deny',
    index: false,
    maxAge: isProduction ? '7d' : 0,
    immutable: isProduction
  }));
}

// CORS middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (verboseRequestLogging) {
  console.log(`CORS: allowing ${allowedOrigins.length ? allowedOrigins.join(', ') : 'same-origin requests only'}`);
}

const isSamePublicOrigin = (origin, requestHost) => {
  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
};

// Apply CORS per request so that a frontend served by this same public host
// also works when it is accessed directly by its IP address. Other browser
// origins still need to be explicitly configured in CORS_ORIGIN.
app.use((req, res, next) => cors({
  origin: function (origin, callback) {
    const isAllowed = !origin
      || process.env.NODE_ENV !== 'production'
      || allowedOrigins.includes(origin)
      || isSamePublicOrigin(origin, req.get('host') || '');

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn('CORS origin rejected:', origin);
    const error = new Error('Origin is not allowed by CORS');
    error.code = 'CORS_ORIGIN_NOT_ALLOWED';
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Auth-Client-Id'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
})(req, res, next));

// Full request diagnostics are opt-in in production. Slow requests remain
// visible without logging every request.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  if (verboseRequestLogging) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (Number.isFinite(slowRequestThresholdMs) && elapsedMs >= slowRequestThresholdMs) {
      console.warn(`[Slow API] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
    }
  });

  next();
});

// Database connection
mongoose.connect(process.env.MONGO_URL, { autoIndex })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      // Avoid writing the same active session back to MongoDB on every API call.
      touchAfter: 24 * 3600,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in milliseconds
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      // Enhanced for Firefox/Brave compatibility
      path: '/',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware to log authentication status
if (verboseRequestLogging) {
  app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Is Authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    next();
  });
}

// Test route for debugging
app.get("/api/v1/test", (req, res) => {
  res.json({ message: "Backend is working!", timestamp: new Date().toISOString() });
});

// Auth check route
app.get("/api/v1/auth-check", (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? { id: req.user._id, email: req.user.email, name: req.user.name } : null,
    sessionID: req.sessionID
  });
});

// Debug route to check uploads directory
app.get("/api/v1/debug/uploads", (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  try {
    const files = fs.readdirSync(uploadsPath, { recursive: true });
    res.json({
      success: true,
      uploadsDir: uploadsPath,
      exists: fs.existsSync(uploadsPath),
      files: files.slice(0, 100) // First 100 files
    });
  } catch (err) {
    res.json({
      success: false,
      uploadsDir: uploadsPath,
      exists: fs.existsSync(uploadsPath),
      error: err.message
    });
  }
});



// Routes
app.use("/api/v1", routes);

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    console.error('Request URL:', req.url);
    console.error('Request Method:', req.method);
    console.error('Request Headers:', req.headers);
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
      error: "Malformed JSON in request body"
    });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'CORS_ORIGIN_NOT_ALLOWED') {
    return res.status(403).json({
      success: false,
      message: 'Origin is not allowed by CORS',
    });
  }
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




