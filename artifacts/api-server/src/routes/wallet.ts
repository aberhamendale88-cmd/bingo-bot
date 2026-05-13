import { Router } from "express";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { TopUpWalletBody, SetPlayerNameBody } from "@workspace/api-zod";

const router = Router();

function getWalletId(req: any): number {
  const header = req.headers["x-wallet-id"];
  const id = parseInt(String(header ?? ""), 10);
  return isNaN(id) ? 1 : id;
}

async function ensureWallet(walletId: number) {
  const existing = await db.select().from(walletsTable).where(eq(walletsTable.id, walletId)).limit(1);
  if (existing.length > 0) return existing[0];

  if (walletId === 1) {
    const [created] = await db
      .insert(walletsTable)
      .values({ playerName: "Player", balance: "500", currency: "ETB" })
      .returning();
    return created;
  }

  return null;
}

router.get("/", async (req, res) => {
  try {
    const walletId = getWalletId(req);
    const wallet = await ensureWallet(walletId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    res.json({
      id: wallet.id,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      playerName: wallet.playerName,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wallet");
    res.status(500).json({ error: "Failed to get wallet" });
  }
});

router.post("/topup", async (req, res) => {
  try {
    const parsed = TopUpWalletBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }
    const { amount } = parsed.data;
    if (amount <= 0) {
      res.status(400).json({ error: "Amount must be positive" });
      return;
    }
    const walletId = getWalletId(req);
    const wallet = await ensureWallet(walletId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const newBalance = parseFloat(wallet.balance) + amount;
    await db.update(walletsTable).set({ balance: newBalance.toString() }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "credit",
      amount: amount.toString(),
      description: `Top up: ${amount} ETB`,
    });
    res.json({ id: wallet.id, balance: newBalance, currency: wallet.currency });
  } catch (err) {
    req.log.error({ err }, "Failed to top up wallet");
    res.status(500).json({ error: "Failed to top up" });
  }
});

router.post("/setname", async (req, res) => {
  try {
    const parsed = SetPlayerNameBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid name" });
      return;
    }
    const { name } = parsed.data;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters" });
      return;
    }
    if (trimmed.length > 30) {
      res.status(400).json({ error: "Name must be 30 characters or fewer" });
      return;
    }
    const walletId = getWalletId(req);
    const wallet = await ensureWallet(walletId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    await db.update(walletsTable).set({ playerName: trimmed }).where(eq(walletsTable.id, wallet.id));
    req.log.info({ playerName: trimmed, walletId }, "Player name updated");
    res.json({ id: wallet.id, balance: parseFloat(wallet.balance), currency: wallet.currency });
  } catch (err) {
    req.log.error({ err }, "Failed to set player name");
    res.status(500).json({ error: "Failed to update name" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const walletId = getWalletId(req);
    const wallet = await ensureWallet(walletId);
    if (!wallet) {
      res.json([]);
      return;
    }
    const txns = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.walletId, wallet.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(50);
    res.json(txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get wallet history");
    res.status(500).json({ error: "Failed to get history" });
  }
});

export default router;
