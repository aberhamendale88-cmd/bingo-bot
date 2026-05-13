import { Router } from "express";
import crypto from "crypto";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

async function sendMessage(chatId: number | string, text: string, extra?: object) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

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

async function getOrCreateWalletByTelegramId(
  telegramId: string,
  playerName: string,
): Promise<{ id: number; playerName: string; balance: string; currency: string }> {
  const existing = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.telegramId, telegramId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(walletsTable)
    .values({ telegramId, playerName, balance: "500", currency: "ETB" })
    .returning();

  return created;
}

router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    req.log.info({ update_type: Object.keys(update).find(k => k !== "update_id") }, "Telegram update received");

    const message = update.message || update.channel_post;
    if (!message) {
      res.json({ ok: true });
      return;
    }

    const chatId = message.chat.id;
    const text: string = message.text ?? "";
    const fromId = String(message.from?.id ?? "");
    const firstName = message.from?.first_name ?? "Player";
    const username = message.from?.username;

    if (text === "/start" || text.startsWith("/start ")) {
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      await sendMessage(chatId, `🎰 Welcome to <b>Win Bingo</b>, ${firstName}!\n\nPlay bingo with numbers 1–500, win ETB prizes. Your starting balance is 500 ETB.\n\nTap below to open the game!`, {
        reply_markup: {
          inline_keyboard: [[{
            text: "🎮 Play Win Bingo",
            web_app: { url: `https://${domain}` },
          }]],
        },
      });
    } else if (text === "/setname" || text.startsWith("/setname ")) {
      const parts = text.split(" ").slice(1);
      const newName = parts.join(" ").trim();

      if (!fromId) {
        await sendMessage(chatId, "Could not identify your account. Please open the game first.");
        res.json({ ok: true });
        return;
      }

      if (!newName) {
        await sendMessage(chatId, "Usage: /setname YourName\n\nExample: /setname LuckyPlayer88");
      } else if (newName.length < 2) {
        await sendMessage(chatId, "Name must be at least 2 characters long.");
      } else if (newName.length > 30) {
        await sendMessage(chatId, "Name must be 30 characters or fewer.");
      } else {
        const existing = await db
          .select()
          .from(walletsTable)
          .where(eq(walletsTable.telegramId, fromId))
          .limit(1);

        if (existing.length > 0) {
          await db.update(walletsTable).set({ playerName: newName }).where(eq(walletsTable.telegramId, fromId));
          req.log.info({ fromId, newName }, "Player name updated via /setname");
          await sendMessage(chatId, `✅ Done! Your display name is now: <b>${newName}</b>`);
        } else {
          await sendMessage(chatId, "No account found yet. Open the game first, then try again.");
        }
      }
    } else if (text === "/help") {
      await sendMessage(chatId,
        "<b>Win Bingo Commands</b>\n\n" +
        "/start — Open the game\n" +
        "/setname &lt;name&gt; — Change your display name\n" +
        "/help — Show this help message\n\n" +
        "Numbers 1–500 are called every 30 seconds. Match all 25 on your card to win!"
      );
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
      req.log.warn("Telegram initData verification failed");
      res.status(401).json({ error: "Invalid Telegram data" });
      return;
    }

    let user: { id: number; first_name: string; username?: string } | null = null;
    try { user = JSON.parse(verified["user"] ?? "null"); } catch { user = null; }

    if (!user) {
      res.status(400).json({ error: "No user in initData" });
      return;
    }

    const telegramId = String(user.id);
    const playerName = user.username ? `@${user.username}` : user.first_name;

    const wallet = await getOrCreateWalletByTelegramId(telegramId, playerName);

    req.log.info({ telegramId, playerName, walletId: wallet.id }, "Telegram user authenticated");
    res.json({ ok: true, playerName: wallet.playerName, walletId: wallet.id });
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
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] }),
    });
    const tgData = await tgRes.json() as unknown;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Open Win Bingo" },
          { command: "setname", description: "Change your display name" },
          { command: "help", description: "Show all commands" },
        ],
      }),
    });

    logger.info({ tgData }, "Webhook + commands setup result");
    res.json(tgData);
  } catch (err) {
    req.log.error({ err }, "Webhook setup error");
    res.status(500).json({ error: "Setup failed" });
  }
});

export default router;
export { verifyTelegramInitData };
