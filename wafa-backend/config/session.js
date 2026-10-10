export const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SECURE === "true" ? "none" : "lax",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  path: "/",
});

export const configureTrustProxy = (app, value = process.env.TRUST_PROXY) => {
  const configured = String(value || "").trim();
  // Docker exposes the API only through its immediate nginx proxy. Outside
  // Docker, forwarded headers remain untrusted unless explicitly configured.
  const trust = !configured || configured === "false" ? false
    : /^\d+$/.test(configured) ? Number(configured)
      : configured === "true" ? true : configured;
  app.set("trust proxy", trust);
};
