import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["lobby", "playing", "finished"] }).notNull().default("lobby"),
  calledNumbers: text("called_numbers").notNull().default("[]"),
  playerCount: integer("player_count").notNull().default(0),
  prizePool: integer("prize_pool").notNull().default(0),
  entryFee: integer("entry_fee").notNull().default(10),
  lastCalledNumber: integer("last_called_number"),
  nextCallAt: timestamp("next_call_at", { withTimezone: true }),
  winnerId: integer("winner_id"),
  winnerName: text("winner_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const gamePlayersTable = pgTable("game_players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gamesTable.id),
  walletId: integer("wallet_id").notNull(),
  cardNumbers: text("card_numbers").notNull().default("[]"),
  markedNumbers: text("marked_numbers").notNull().default("[]"),
  hasBingo: boolean("has_bingo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  playerName: text("player_name").notNull(),
  wins: integer("wins").notNull().default(0),
  totalEarnings: integer("total_earnings").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;

export const insertGamePlayerSchema = createInsertSchema(gamePlayersTable).omit({ id: true, createdAt: true });
export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;
export type GamePlayer = typeof gamePlayersTable.$inferSelect;
