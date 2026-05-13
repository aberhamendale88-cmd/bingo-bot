import { Router } from "express";
import { db, walletsTable, transactionsTable, gamesTable, leaderboardTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function requireAdmin(req: any, res: any, next: any) {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token || token !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== ADMIN_PASSWORD) {
    res.json({ ok: false, error: "Invalid password" });
    return;
  }
  res.json({ ok: true });
});

router.get("/players", requireAdmin, async (req, res) => {
  try {
    const wallets = await db.select().from(walletsTable).orderBy(desc(walletsTable.createdAt));
    const lb = await db.select().from(leaderboardTable);
    const lbMap = new Map(lb.map((e) => [e.walletId, e]));

    res.json(wallets.map((w) => {
      const entry = lbMap.get(w.id);
      return {
        id: w.id,
        playerName: w.playerName,
        balance: parseFloat(w.balance),
        currency: w.currency,
        wins: entry?.wins ?? 0,
        totalEarnings: entry?.totalEarnings ?? 0,
        createdAt: w.createdAt.toISOString(),
      };
    }));
  } catch (err) {
    req.log.error({ err }, "Admin: failed to list players");
    res.status(500).json({ error: "Failed to list players" });
  }
});

router.post("/players/:id/credit", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { amount, reason } = req.body as { amount?: number; reason?: string };
    if (!amount || amount <= 0 || !reason?.trim()) {
      res.status(400).json({ error: "Valid amount and reason required" });
      return;
    }
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, id)).limit(1);
    if (!wallet) { res.status(404).json({ error: "Player not found" }); return; }

    const newBalance = parseFloat(wallet.balance) + amount;
    await db.update(walletsTable).set({ balance: newBalance.toString() }).where(eq(walletsTable.id, id));
    await db.insert(transactionsTable).values({
      walletId: id, type: "credit",
      amount: amount.toString(),
      description: `Admin credit: ${reason.trim()}`,
    });

    const lb = await db.select().from(leaderboardTable).where(eq(leaderboardTable.walletId, id)).limit(1);
    res.json({
      id: wallet.id, playerName: wallet.playerName,
      balance: newBalance, currency: wallet.currency,
      wins: lb[0]?.wins ?? 0, totalEarnings: lb[0]?.totalEarnings ?? 0,
      createdAt: wallet.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Admin: failed to credit player");
    res.status(500).json({ error: "Failed to credit player" });
  }
});

router.post("/players/:id/debit", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { amount, reason } = req.body as { amount?: number; reason?: string };
    if (!amount || amount <= 0 || !reason?.trim()) {
      res.status(400).json({ error: "Valid amount and reason required" });
      return;
    }
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, id)).limit(1);
    if (!wallet) { res.status(404).json({ error: "Player not found" }); return; }

    const current = parseFloat(wallet.balance);
    if (current < amount) {
      res.status(400).json({ error: `Insufficient balance (${current} ETB)` });
      return;
    }
    const newBalance = current - amount;
    await db.update(walletsTable).set({ balance: newBalance.toString() }).where(eq(walletsTable.id, id));
    await db.insert(transactionsTable).values({
      walletId: id, type: "debit",
      amount: amount.toString(),
      description: `Admin debit: ${reason.trim()}`,
    });

    const lb = await db.select().from(leaderboardTable).where(eq(leaderboardTable.walletId, id)).limit(1);
    res.json({
      id: wallet.id, playerName: wallet.playerName,
      balance: newBalance, currency: wallet.currency,
      wins: lb[0]?.wins ?? 0, totalEarnings: lb[0]?.totalEarnings ?? 0,
      createdAt: wallet.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Admin: failed to debit player");
    res.status(500).json({ error: "Failed to debit player" });
  }
});

router.post("/players/:id/rename", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body as { name?: string };
    const trimmed = name?.trim() ?? "";
    if (trimmed.length < 2 || trimmed.length > 30) {
      res.status(400).json({ error: "Name must be 2–30 characters" });
      return;
    }
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, id)).limit(1);
    if (!wallet) { res.status(404).json({ error: "Player not found" }); return; }

    await db.update(walletsTable).set({ playerName: trimmed }).where(eq(walletsTable.id, id));
    await db.update(leaderboardTable).set({ playerName: trimmed }).where(eq(leaderboardTable.walletId, id));

    const lb = await db.select().from(leaderboardTable).where(eq(leaderboardTable.walletId, id)).limit(1);
    res.json({
      id: wallet.id, playerName: trimmed,
      balance: parseFloat(wallet.balance), currency: wallet.currency,
      wins: lb[0]?.wins ?? 0, totalEarnings: lb[0]?.totalEarnings ?? 0,
      createdAt: wallet.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Admin: failed to rename player");
    res.status(500).json({ error: "Failed to rename player" });
  }
});

router.get("/games", requireAdmin, async (req, res) => {
  try {
    const games = await db.select().from(gamesTable).orderBy(desc(gamesTable.createdAt)).limit(50);
    res.json(games.map((g) => ({
      id: g.id,
      status: g.status,
      playerCount: g.playerCount,
      prizePool: g.prizePool,
      entryFee: g.entryFee,
      winnerName: g.winnerName ?? null,
      createdAt: g.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Admin: failed to list games");
    res.status(500).json({ error: "Failed to list games" });
  }
});

export default router;
