import { Router } from "express";
import { db, walletsTable, gamesTable, gamePlayersTable, leaderboardTable, transactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();
const DEFAULT_WALLET_ID = 1;
const ENTRY_FEE = 10;
const CALL_INTERVAL_MS = 30000;
const TOTAL_NUMBERS = 500;
const CARD_SIZE = 25;

function generateCardNumbers(): number[] {
  const nums = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums.slice(0, CARD_SIZE).sort((a, b) => a - b);
}

async function getOrCreateActiveGame() {
  const existing = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "lobby"))
    .orderBy(desc(gamesTable.createdAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [game] = await db
    .insert(gamesTable)
    .values({ status: "lobby", calledNumbers: "[]", prizePool: 0, entryFee: ENTRY_FEE, playerCount: 0 })
    .returning();
  return game;
}

async function advanceGame() {
  const game = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "playing"))
    .orderBy(desc(gamesTable.updatedAt))
    .limit(1)
    .then((r) => r[0]);

  if (!game) return;

  const called: number[] = JSON.parse(game.calledNumbers || "[]");
  const remaining = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).filter((n) => !called.includes(n));

  if (remaining.length === 0) {
    await db.update(gamesTable).set({ status: "finished" }).where(eq(gamesTable.id, game.id));
    return;
  }

  const next = remaining[Math.floor(Math.random() * remaining.length)];
  const newCalled = [...called, next];

  const players = await db.select().from(gamePlayersTable).where(eq(gamePlayersTable.gameId, game.id));
  let winnerId: number | null = null;
  let winnerName: string | null = null;

  for (const player of players) {
    const cardNums: number[] = JSON.parse(player.cardNumbers || "[]");
    const marked: number[] = [...JSON.parse(player.markedNumbers || "[]")];
    if (cardNums.includes(next)) marked.push(next);

    const hasBingo = cardNums.every((n) => marked.includes(n));
    await db.update(gamePlayersTable)
      .set({ markedNumbers: JSON.stringify(marked), hasBingo })
      .where(eq(gamePlayersTable.id, player.id));

    if (hasBingo && !winnerId) {
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, player.walletId)).limit(1);
      winnerId = player.walletId;
      winnerName = wallet?.playerName ?? "Player";
    }
  }

  const nextCallAt = new Date(Date.now() + CALL_INTERVAL_MS);

  if (winnerId !== null) {
    const prize = game.prizePool;
    await db.update(gamesTable).set({
      calledNumbers: JSON.stringify(newCalled),
      lastCalledNumber: next,
      status: "finished",
      winnerId,
      winnerName,
      nextCallAt,
    }).where(eq(gamesTable.id, game.id));

    const [winnerWallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, winnerId)).limit(1);
    if (winnerWallet) {
      const newBal = parseFloat(winnerWallet.balance) + prize;
      await db.update(walletsTable).set({ balance: newBal.toString() }).where(eq(walletsTable.id, winnerId));
      await db.insert(transactionsTable).values({
        walletId: winnerId,
        type: "credit",
        amount: prize.toString(),
        description: `Bingo win! Game #${game.id}`,
      });
    }

    const existing = await db.select().from(leaderboardTable).where(eq(leaderboardTable.walletId, winnerId)).limit(1);
    if (existing.length > 0) {
      await db.update(leaderboardTable).set({
        wins: existing[0].wins + 1,
        totalEarnings: existing[0].totalEarnings + prize,
      }).where(eq(leaderboardTable.walletId, winnerId));
    } else {
      await db.insert(leaderboardTable).values({
        walletId: winnerId,
        playerName: winnerName ?? "Player",
        wins: 1,
        totalEarnings: prize,
      });
    }

    setTimeout(() => {
      db.insert(gamesTable).values({ status: "lobby", calledNumbers: "[]", prizePool: 0, entryFee: ENTRY_FEE, playerCount: 0 }).then(() => {});
    }, 5000);
  } else {
    await db.update(gamesTable).set({
      calledNumbers: JSON.stringify(newCalled),
      lastCalledNumber: next,
      nextCallAt,
    }).where(eq(gamesTable.id, game.id));

    setTimeout(advanceGame, CALL_INTERVAL_MS);
  }
}

router.get("/state", async (req, res) => {
  try {
    const game = await getOrCreateActiveGame()
      .catch(async () => {
        const playing = await db.select().from(gamesTable)
          .where(eq(gamesTable.status, "playing"))
          .orderBy(desc(gamesTable.updatedAt))
          .limit(1);
        return playing[0] ?? null;
      });

    const allActive = await db.select().from(gamesTable)
      .where(eq(gamesTable.status, "playing"))
      .orderBy(desc(gamesTable.updatedAt))
      .limit(1);

    const activeGame = allActive[0] ?? game;
    if (!activeGame) {
      res.status(404).json({ error: "No game found" });
      return;
    }

    const playerCount = await db.select().from(gamePlayersTable)
      .where(eq(gamePlayersTable.gameId, activeGame.id))
      .then((r) => r.length);

    const now = Date.now();
    const nextCallAt = activeGame.nextCallAt ? activeGame.nextCallAt.getTime() : now + CALL_INTERVAL_MS;
    const nextCallIn = Math.max(0, Math.round((nextCallAt - now) / 1000));

    res.json({
      id: activeGame.id,
      status: activeGame.status,
      calledNumbers: JSON.parse(activeGame.calledNumbers || "[]"),
      nextCallIn,
      playerCount,
      prizePool: activeGame.prizePool,
      entryFee: activeGame.entryFee,
      lastCalledNumber: activeGame.lastCalledNumber ?? null,
      winnerId: activeGame.winnerId ?? null,
      winnerName: activeGame.winnerName ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get game state");
    res.status(500).json({ error: "Failed to get game state" });
  }
});

router.post("/join", async (req, res) => {
  try {
    const game = await getOrCreateActiveGame();

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, DEFAULT_WALLET_ID)).limit(1);
    if (!wallet) {
      res.status(404).json({ success: false, message: "Wallet not found", wallet: { id: 0, balance: 0, currency: "ETB" } });
      return;
    }

    const balance = parseFloat(wallet.balance);
    if (balance < ENTRY_FEE) {
      res.status(400).json({ success: false, message: `Insufficient balance. Need ${ENTRY_FEE} ETB.`, wallet: { id: wallet.id, balance, currency: wallet.currency } });
      return;
    }

    const existingPlayer = await db.select().from(gamePlayersTable)
      .where(and(eq(gamePlayersTable.gameId, game.id), eq(gamePlayersTable.walletId, wallet.id)))
      .limit(1);
    if (existingPlayer.length > 0) {
      res.json({ success: false, message: "Already joined this game", wallet: { id: wallet.id, balance, currency: wallet.currency } });
      return;
    }

    const newBalance = balance - ENTRY_FEE;
    await db.update(walletsTable).set({ balance: newBalance.toString() }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "debit",
      amount: ENTRY_FEE.toString(),
      description: `Entry fee for Game #${game.id}`,
    });

    const cardNumbers = generateCardNumbers();
    await db.insert(gamePlayersTable).values({
      gameId: game.id,
      walletId: wallet.id,
      cardNumbers: JSON.stringify(cardNumbers),
      markedNumbers: "[]",
      hasBingo: false,
    });

    const newPrizePool = game.prizePool + ENTRY_FEE;
    const newPlayerCount = (game.playerCount ?? 0) + 1;
    await db.update(gamesTable).set({ prizePool: newPrizePool, playerCount: newPlayerCount, status: "playing", nextCallAt: new Date(Date.now() + CALL_INTERVAL_MS) })
      .where(eq(gamesTable.id, game.id));

    setTimeout(advanceGame, CALL_INTERVAL_MS);

    res.json({
      success: true,
      message: "Joined game successfully!",
      wallet: { id: wallet.id, balance: newBalance, currency: wallet.currency },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to join game");
    res.status(500).json({ error: "Failed to join game" });
  }
});

router.get("/card", async (req, res) => {
  try {
    const playingGame = await db.select().from(gamesTable)
      .where(eq(gamesTable.status, "playing"))
      .orderBy(desc(gamesTable.updatedAt))
      .limit(1);

    const lobbyGame = await db.select().from(gamesTable)
      .where(eq(gamesTable.status, "lobby"))
      .orderBy(desc(gamesTable.createdAt))
      .limit(1);

    const game = playingGame[0] ?? lobbyGame[0];
    if (!game) {
      res.json({ gameId: 0, numbers: [], markedNumbers: [] });
      return;
    }

    const [player] = await db.select().from(gamePlayersTable)
      .where(and(eq(gamePlayersTable.gameId, game.id), eq(gamePlayersTable.walletId, DEFAULT_WALLET_ID)))
      .limit(1);

    if (!player) {
      res.json({ gameId: game.id, numbers: [], markedNumbers: [] });
      return;
    }

    res.json({
      gameId: game.id,
      numbers: JSON.parse(player.cardNumbers || "[]"),
      markedNumbers: JSON.parse(player.markedNumbers || "[]"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get player card");
    res.status(500).json({ error: "Failed to get player card" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const entries = await db.select().from(leaderboardTable)
      .orderBy(desc(leaderboardTable.wins))
      .limit(10);

    res.json(entries.map((e, i) => ({
      rank: i + 1,
      playerName: e.playerName,
      wins: e.wins,
      totalEarnings: e.totalEarnings,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

export default router;
