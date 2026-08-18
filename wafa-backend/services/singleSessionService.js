import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_REFRESH_WINDOW_MS = 5 * 60 * 1000;

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
  constructor() {
    super("This account is already active in another session. Please log out there or try again after it becomes inactive.");
    this.name = "ActiveSessionError";
    this.code = "ACCOUNT_ALREADY_ACTIVE";
  }
}

export const claimSingleSession = async (userId, sessionId) => {
  const now = new Date();
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { activeSessionId: sessionId },
        { activeSessionId: null },
        { activeSessionId: { $exists: false } },
        { activeSessionExpiresAt: null },
        { activeSessionExpiresAt: { $exists: false } },
        { activeSessionExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        activeSessionId: sessionId,
        activeSessionExpiresAt: nextExpiry(),
      },
    },
    { new: true }
  );

  return Boolean(user);
};

export const establishSingleSession = async (req, user) => {
  const sessionId = req.session?.singleSessionId || crypto.randomUUID();
  const claimed = await claimSingleSession(user._id, sessionId);

  if (!claimed) {
    throw new ActiveSessionError();
  }

  req.session.singleSessionId = sessionId;
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

export const releaseSingleSession = async (userId, sessionId) => {
  if (!userId || !sessionId) return;

  await User.updateOne(
    { _id: userId, activeSessionId: sessionId },
    { $unset: { activeSessionId: 1, activeSessionExpiresAt: 1 } }
  );
};
