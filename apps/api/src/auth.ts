import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret";

export interface AuthRequest extends Request {
  userId?: string;
}

export function verifyTelegramInitData(initData: string): Record<string, string> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing Telegram hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculated = crypto.createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash))) {
    throw new Error("Invalid Telegram initData");
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    throw new Error("Expired Telegram initData");
  }

  return Object.fromEntries(params.entries());
}

export function signUser(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
