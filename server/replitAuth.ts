import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express } from "express";

export const sessionTtl = 7 * 24 * 60 * 60; // seconds

export function getSession() {
  const PgStore = connectPg(session);
  const store = new PgStore({
    conString: process.env.DATABASE_URL?.replace(/^.*?postgresql:/, 'postgresql:').replace(/['"].*?$/, '').trim() || process.env.DATABASE_URL,
    tableName: "session",
    schemaName: "public",
    createTableIfMissing: true,
    ttl: sessionTtl
  });

  return session({
    secret: process.env.SESSION_SECRET || "development-session-secret-change-in-production",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: sessionTtl * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  });
}

export function setupAuth(app: Express) {
  app.use(getSession());
  // … بقية منطق المصادقة إن وُجد …
}
