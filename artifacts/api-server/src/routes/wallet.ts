import { Router } from "express";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { TopUpWalletBody } from "@workspace/api-zod";

const router = Router();

const DEFAULT_WALLET_ID = 1;

async function ensureWallet() {
  const existing = await db.select().from(walletsTable).where(eq(walletsTable.id, DEFAULT_WALLET_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(walletsTable).values({ playerName: "Player", balance: "500", currency: "ETB" });
  }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, DEFAULT_WALLET_ID)).limit(1);
  return wallet;
}

router.get("/", async (req, res) => {
  try {
    const wallet = await ensureWallet();
    res.json({
      id: wallet.id,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
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
    const wallet = await ensureWallet();
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

router.get("/history", async (req, res) => {
  try {
    const wallet = await ensureWallet();
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
