import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { getSessionCookieOptions } from "../config/session.js";

export const AUTH_DEVICE_COOKIE = "yourqcm.device";
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const TOKEN_OPTIONS = { algorithms: ["HS256"], audience: "auth-device", issuer: "yourqcm" };

const readDeviceCookie = (req) => {
  const value = req.headers.cookie?.split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${AUTH_DEVICE_COOKIE}=`));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(AUTH_DEVICE_COOKIE.length + 1));
  } catch {
    return null;
  }
};

// This identifies a browser; it never authenticates an account. Login must
// still verify the password or provider token before reclaiming a lease.
export const identifyAuthDevice = (req, res, next) => {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  let clientId;
  try {
    const decoded = jwt.verify(readDeviceCookie(req), secret, TOKEN_OPTIONS);
    if (CLIENT_ID_PATTERN.test(decoded.clientId || "")) clientId = decoded.clientId;
  } catch {
    // Missing, expired, or invalid cookies cannot prove a returning browser.
  }

  if (!clientId) {
    const headerId = req.headers["x-auth-client-id"];
    // Seed the cookie from the existing client ID so active leases migrate
    // without blocking browsers that already use local storage.
    clientId = typeof headerId === "string" && CLIENT_ID_PATTERN.test(headerId)
      ? headerId : crypto.randomUUID();
    const token = jwt.sign({ clientId }, secret, {
      algorithm: "HS256", audience: TOKEN_OPTIONS.audience,
      issuer: TOKEN_OPTIONS.issuer, expiresIn: "365d",
    });
    res.cookie(AUTH_DEVICE_COOKIE, token, {
      ...getSessionCookieOptions(), maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }

  // Prefer the signed cookie when local storage was reset or OAuth did not
  // send a client header. Keep this cookie when the login session is destroyed.
  req.authClientId = clientId;
  next();
};
