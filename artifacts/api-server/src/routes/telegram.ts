import { Router } from "express";
import crypto from "crypto";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function verifyTelegramInitData(initData: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const entries = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expected = crypto.createHmac("sha256", secretKey).update(entries).digest("hex");

    if (expected !== hash) return null;

    const result: Record<string, string> = {};
    params.forEach((v, k) => { result[k] = v; });
    result["hash"] = hash;
    return result;
  } catch {
    return null;
  }
}

router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    req.log.info({ update_type: Object.keys(update).find(k => k !== "update_id") }, "Telegram update received");

    const message = update.message || update.channel_post;
    if (message?.text === "/start" || message?.text?.startsWith("/start ")) {
      const chatId = message.chat.id;
      const firstName = message.from?.first_name ?? "Player";

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Welcome to Win Bingo, ${firstName}! Tap the button below to play.`,
          reply_markup: {
            inline_keyboard: [[{
              text: "Play Win Bingo",
              web_app: { url: `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` }
            }]]
          }
        })
      });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Webhook error");
    res.status(500).json({ ok: false });
  }
});

router.post("/auth", async (req, res) => {
  try {
    const { initData } = req.body as { initData?: string };
    if (!initData) {
      res.status(400).json({ error: "Missing initData" });
      return;
    }

    const verified = verifyTelegramInitData(initData);
    if (!verified) {
      res.status(401).json({ error: "Invalid Telegram data" });
      return;
    }

    let user: { id: number; first_name: string; username?: string } | null = null;
    try { user = JSON.parse(verified["user"] ?? "null"); } catch { user = null; }

    if (!user) {
      res.status(400).json({ error: "No user in initData" });
      return;
    }

    const playerName = user.username
      ? `@${user.username}`
      : user.first_name;

    const existing = await db.select().from(walletsTable).limit(1);
    if (existing.length > 0) {
      await db.update(walletsTable).set({ playerName }).where(eq(walletsTable.id, existing[0].id));
    }

    req.log.info({ playerName }, "Telegram user authenticated");
    res.json({ ok: true, playerName });
  } catch (err) {
    req.log.error({ err }, "Telegram auth error");
    res.status(500).json({ error: "Auth failed" });
  }
});

router.get("/setup-webhook", async (req, res) => {
  try {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (!domain) {
      res.status(500).json({ error: "REPLIT_DOMAINS not set" });
      return;
    }
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] })
    });
    const data = await response.json() as unknown;
    logger.info({ data }, "Webhook setup result");
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Webhook setup error");
    res.status(500).json({ error: "Setup failed" });
  }
});

export default router;
export { verifyTelegramInitData };
