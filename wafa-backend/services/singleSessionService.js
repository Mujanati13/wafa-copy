import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

const cleanValue = (value, maxLength = 160) => String(value || "")
  .replace(/[\u0000-\u001f\u007f]/g, "")
  .trim()
  .slice(0, maxLength);

const firstHeader = (req, names) => {
  for (const name of names) {
    const value = req.headers?.[name];
    if (value) return cleanValue(Array.isArray(value) ? value[0] : value);
  }
  return "";
};

const describeDevice = (userAgent = "") => {
  const ua = cleanValue(userAgent, 500);
  const browser = /Edg\//i.test(ua) ? "Microsoft Edge"
    : /OPR\//i.test(ua) ? "Opera"
      : /SamsungBrowser\//i.test(ua) ? "Samsung Internet"
        : /Chrome\//i.test(ua) ? "Chrome"
          : /Firefox\//i.test(ua) ? "Firefox"
            : /Safari\//i.test(ua) ? "Safari"
              : "Navigateur inconnu";
  const os = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS/iPadOS"
      : /Windows NT/i.test(ua) ? "Windows"
        : /Mac OS X/i.test(ua) ? "macOS"
          : /Linux/i.test(ua) ? "Linux"
            : "système inconnu";
  const type = /iPad|Tablet/i.test(ua) ? "tablette"
    : /Mobile|Android|iPhone|iPod/i.test(ua) ? "mobile"
      : "ordinateur";

  return `${browser} sur ${os} (${type})`;
};

export const getSessionMetadata = (req = {}) => {
  const forwardedIp = firstHeader(req, ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"])
    .split(",")[0]
    .trim();
  const socketIp = cleanValue(req.socket?.remoteAddress || req.connection?.remoteAddress, 64);
  const ip = cleanValue(forwardedIp || req.ip || socketIp, 64).replace(/^::ffff:/, "");
  const city = firstHeader(req, ["cf-ipcity", "x-vercel-ip-city", "x-geo-city"]);
  const region = firstHeader(req, ["cf-region", "x-vercel-ip-country-region", "x-geo-region"]);
  const country = firstHeader(req, ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country"]);
  const rawClientId = firstHeader(req, ["x-auth-client-id"]);

  return {
    ip: ip || null,
    device: describeDevice(req.headers?.["user-agent"]),
    location: [...new Set([city, region, country].filter(Boolean))].join(", ") || null,
    clientId: CLIENT_ID_PATTERN.test(rawClientId) ? rawClientId : null,
  };
};

const getSessionTtlMs = () => {
  const configuredTtl = Number.parseInt(process.env.SINGLE_SESSION_TTL_MS || "", 10);
  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : DEFAULT_SESSION_TTL_MS;
};

const nextExpiry = () => new Date(Date.now() + getSessionTtlMs());

const getRefreshWindowMs = () => {
  const sessionTtlMs = getSessionTtlMs();
  const configuredWindow = Number.parseInt(process.env.SINGLE_SESSION_REFRESH_WINDOW_MS || "", 10);
  const refreshWindow = Number.isFinite(configuredWindow) && configuredWindow > 0
    ? configuredWindow
    : DEFAULT_REFRESH_WINDOW_MS;

  return Math.min(refreshWindow, Math.max(Math.floor(sessionTtlMs / 3), 1));
};

export class ActiveSessionError extends Error {
  constructor(activeSession = {}) {
    super("This account is already active in another session. Please log out there or try again after it becomes inactive.");
    this.name = "ActiveSessionError";
    this.code = "ACCOUNT_ALREADY_ACTIVE";
    this.activeSession = activeSession;
  }
}

export const claimSingleSession = async (userId, sessionId, metadata = {}) => {
  const now = new Date();
  const claimableSessions = [
    { activeSessionId: sessionId },
    { activeSessionId: null },
    { activeSessionId: { $exists: false } },
    { activeSessionExpiresAt: null },
    { activeSessionExpiresAt: { $exists: false } },
    { activeSessionExpiresAt: { $lte: now } },
  ];

  // A valid password login from the same browser may replace its own stale
  // lease (for example when a previous logout response was interrupted).
  if (metadata.clientId) {
    claimableSessions.push({ activeSessionClientId: metadata.clientId });
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: claimableSessions,
    },
    {
      $set: {
        activeSessionId: sessionId,
        activeSessionExpiresAt: nextExpiry(),
        activeSessionIp: metadata.ip || null,
        activeSessionDevice: metadata.device || null,
        activeSessionLocation: metadata.location || null,
        activeSessionStartedAt: new Date(),
        activeSessionClientId: metadata.clientId || null,
      },
    },
    { new: true }
  );

  return Boolean(user);
};

export const establishSingleSession = async (req, user) => {
  const previousUserId = req.session?.singleSessionUserId;
  const isSwitchingAccount = previousUserId && String(previousUserId) !== String(user._id);

  if (isSwitchingAccount) {
    await clearSingleSessionLease(previousUserId);
    delete req.session.singleSessionId;
  }

  const sessionId = req.session?.singleSessionId || crypto.randomUUID();
  const claimed = await claimSingleSession(user._id, sessionId, getSessionMetadata(req));

  if (!claimed) {
    const activeUser = await User.findById(user._id)
      .select("+activeSessionIp +activeSessionDevice +activeSessionLocation +activeSessionStartedAt +activeSessionExpiresAt")
      .lean();
    throw new ActiveSessionError({
      ip: activeUser?.activeSessionIp || null,
      device: activeUser?.activeSessionDevice || null,
      location: activeUser?.activeSessionLocation || null,
      startedAt: activeUser?.activeSessionStartedAt || null,
      expiresAt: activeUser?.activeSessionExpiresAt || null,
    });
  }

  req.session.singleSessionId = sessionId;
  req.session.singleSessionUserId = String(user._id);
  await new Promise((resolve, reject) => {
    req.login(user, (error) => (error ? reject(error) : resolve()));
  });

  return sessionId;
};

export const createSingleSessionToken = (user, sessionId) => jwt.sign(
  { id: user._id, email: user.email, sid: sessionId },
  process.env.JWT_SECRET || process.env.SESSION_SECRET,
  { expiresIn: "30d" }
);

export const refreshSingleSession = async (userId, sessionId) => {
  if (!userId || !sessionId) return null;

  const now = new Date();
  const refreshCutoff = new Date(now.getTime() + getRefreshWindowMs());
  const refreshedExpiry = nextExpiry();

  // Validate and conditionally refresh in one atomic operation. Most requests
  // become no-op updates and do not alter updatedAt or persist a new lease.
  return User.findOneAndUpdate(
    {
      _id: userId,
      activeSessionId: sessionId,
      activeSessionExpiresAt: { $gt: now },
    },
    [
      {
        $set: {
          activeSessionExpiresAt: {
            $cond: [
              { $lte: ["$activeSessionExpiresAt", refreshCutoff] },
              refreshedExpiry,
              "$activeSessionExpiresAt",
            ],
          },
        },
      },
    ],
    { new: true, timestamps: false }
  );
};

const clearSingleSessionLease = async (userId) => {
  if (!userId) return;

  return User.updateOne(
    { _id: userId },
    {
      $unset: {
        activeSessionId: 1,
        activeSessionExpiresAt: 1,
        activeSessionIp: 1,
        activeSessionDevice: 1,
        activeSessionLocation: 1,
        activeSessionStartedAt: 1,
        activeSessionClientId: 1,
      },
    }
  );
};

export const releaseSingleSession = async (userId) => clearSingleSessionLease(userId);
