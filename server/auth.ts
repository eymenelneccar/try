import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const [hashedPwd, salt] = hashedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPwd, "hex");
    const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  } catch {
    return false;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  let sessionStore: any;

  if (process.env.DATABASE_URL) {
    const PgStore = connectPg(session);
    sessionStore = new PgStore({
      conString: process.env.DATABASE_URL?.replace(/^.*?postgresql:/, 'postgresql:').replace(/['"].*?$/, '').trim() || process.env.DATABASE_URL,
      tableName: "session",          // 👈 نستخدم جدول session
      schemaName: "public",          // 👈 ضمن سكيمة public
      createTableIfMissing: true,    // 👈 أنشئ الجدول إذا لم يكن موجوداً
      ttl: sessionTtl / 1000         // connect-pg-simple يتوقع ثواني
    });
    console.log("✅ Using PostgreSQL session store (public.session)");
  } else {
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({ checkPeriod: sessionTtl });
    console.log("⚠️ Using memory session store");
  }

  return session({
    secret: process.env.SESSION_SECRET || "development-session-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "iqr.sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax"
    },
    rolling: true
  });
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيح" });
      }

      const ok = await verifyPassword(password, user.password);
      if (!ok) return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيح" });

      (req.session as any).userId = user.id;
      const { password: _pw, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  const handleLogout = (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "حدث خطأ أثناء تسجيل الخروج" });
      res.clearCookie("connect.sid");
      if (req.method === "GET") res.redirect("/login");
      else res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  };

  app.post("/api/auth/logout", handleLogout);
  app.get("/api/logout", handleLogout);

  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { password: _pw, ...safeUser } = user;
      res.json(safeUser);
    } catch (e) {
      console.error("Error fetching user:", e);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    (req as any).user = user;
    next();
  } catch (e) {
    console.error("Authentication error:", e);
    res.status(401).json({ message: "Unauthorized" });
  }
};
