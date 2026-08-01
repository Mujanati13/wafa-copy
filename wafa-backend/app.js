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

// Body parsing middleware - these must come first
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
}

// Serve static files from uploads folder with better logging
app.use('/uploads', (req, res, next) => {
  console.log(`[Static File Request] ${req.method} ${req.url} -> ${path.join(uploadsDir, req.path)}`);
  next();
}, express.static(uploadsDir, {
  dotfiles: 'allow',
  index: false,
  setHeaders: (res, path) => {
    console.log(`[Serving File] ${path}`);
  }
}));

// CORS middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log(`CORS: allowing ${allowedOrigins.length ? allowedOrigins.join(', ') : 'same-origin requests only'}`);

app.use(cors({
  origin: function (origin, callback) {
    // Non-browser clients have no Origin header. Browser requests must be
    // explicitly listed in CORS_ORIGIN in production.
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('CORS origin rejected:', origin);
    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
  }
  next();
});

// Database connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
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
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Is Authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
  console.log('User:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');
  next();
});

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




