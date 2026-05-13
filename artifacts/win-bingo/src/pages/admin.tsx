import { useState, useCallback } from "react";
import {
  useAdminListPlayers,
  useAdminListGames,
  useAdminLogin,
  useAdminCreditPlayer,
  useAdminDebitPlayer,
  useAdminRenamePlayer,
  getAdminListPlayersQueryKey,
  getAdminListGamesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogIn, Users, Gamepad2, PlusCircle,
  MinusCircle, Pencil, Check, X, Trophy, Wallet,
  ShieldCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

type AdminPlayer = {
  id: number;
  playerName: string;
  balance: number;
  currency: string;
  wins: number;
  totalEarnings: number;
  createdAt: string;
};

type Tab = "players" | "games";

type ActionType = "credit" | "debit" | "rename" | null;

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const login = useAdminLogin();
  const { toast } = useToast();

  const handleLogin = () => {
    login.mutate(
      { data: { password } },
      {
        onSuccess: (data) => {
          if (data.ok) {
            onLogin(password);
          } else {
            toast({ variant: "destructive", title: "Access denied", description: data.error ?? "Wrong password." });
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: "Login failed", description: "Could not reach the server." });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 mb-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Win Bingo — Management Console</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xl">
          <Input
            data-testid="input-admin-password"
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="bg-muted border-border h-12 font-mono"
            autoFocus
          />
          <Button
            data-testid="button-admin-login"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest"
            onClick={handleLogin}
            disabled={!password || login.isPending}
          >
            {login.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
            Enter
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player, token, onUpdated }: { player: AdminPlayer; token: string; onUpdated: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<ActionType>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [newName, setNewName] = useState(player.playerName);

  const credit = useAdminCreditPlayer();
  const debit = useAdminDebitPlayer();
  const rename = useAdminRenamePlayer();

  const headers = { "x-admin-token": token };

  const handleCredit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !reason.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Amount and reason are required." });
      return;
    }
    credit.mutate(
      { id: player.id, data: { amount: amt, reason }, headers } as any,
      {
        onSuccess: () => {
          toast({ title: "Credited", description: `+${amt} ETB added to ${player.playerName}` });
          setAction(null); setAmount(""); setReason("");
          onUpdated();
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e.message }),
      }
    );
  };

  const handleDebit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !reason.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Amount and reason are required." });
      return;
    }
    debit.mutate(
      { id: player.id, data: { amount: amt, reason }, headers } as any,
      {
        onSuccess: () => {
          toast({ title: "Debited", description: `-${amt} ETB removed from ${player.playerName}` });
          setAction(null); setAmount(""); setReason("");
          onUpdated();
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e.message }),
      }
    );
  };

  const handleRename = () => {
    if (newName.trim().length < 2) {
      toast({ variant: "destructive", title: "Too short", description: "Name must be at least 2 characters." });
      return;
    }
    rename.mutate(
      { id: player.id, data: { name: newName.trim() }, headers } as any,
      {
        onSuccess: () => {
          toast({ title: "Renamed", description: `Player renamed to ${newName.trim()}` });
          setAction(null);
          onUpdated();
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Failed", description: e.message }),
      }
    );
  };

  const isPending = credit.isPending || debit.isPending || rename.isPending;

  return (
    <div
      data-testid={`card-player-${player.id}`}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => { setExpanded((v) => !v); setAction(null); }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-black text-sm">{player.playerName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{player.playerName}</p>
            <p className="text-xs text-muted-foreground font-mono">ID #{player.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono font-bold text-emerald-400 text-sm">{player.balance.toFixed(2)} ETB</p>
            <p className="text-xs text-muted-foreground">{player.wins} wins</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card rounded-lg p-2 border border-border">
              <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-mono font-bold text-xs">{player.balance.toFixed(0)} ETB</p>
            </div>
            <div className="bg-card rounded-lg p-2 border border-border">
              <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Wins</p>
              <p className="font-mono font-bold text-xs">{player.wins}</p>
            </div>
            <div className="bg-card rounded-lg p-2 border border-border">
              <PlusCircle className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Earned</p>
              <p className="font-mono font-bold text-xs">{player.totalEarnings} ETB</p>
            </div>
          </div>

          {/* Action Buttons */}
          {action === null && (
            <div className="flex gap-2">
              <Button
                data-testid={`button-credit-${player.id}`}
                size="sm"
                className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 font-bold text-xs uppercase tracking-wider h-9"
                onClick={() => setAction("credit")}
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Credit
              </Button>
              <Button
                data-testid={`button-debit-${player.id}`}
                size="sm"
                className="flex-1 bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30 font-bold text-xs uppercase tracking-wider h-9"
                onClick={() => setAction("debit")}
              >
                <MinusCircle className="w-3.5 h-3.5 mr-1.5" /> Debit
              </Button>
              <Button
                data-testid={`button-rename-${player.id}`}
                size="sm"
                variant="outline"
                className="flex-1 border-border text-muted-foreground hover:text-primary hover:border-primary/50 font-bold text-xs uppercase tracking-wider h-9"
                onClick={() => { setAction("rename"); setNewName(player.playerName); }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Rename
              </Button>
            </div>
          )}

          {(action === "credit" || action === "debit") && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {action === "credit" ? "Add ETB" : "Remove ETB"}
              </p>
              <Input
                data-testid={`input-amount-${player.id}`}
                type="number"
                placeholder="Amount (ETB)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-card border-border h-10 font-mono text-sm"
              />
              <Input
                data-testid={`input-reason-${player.id}`}
                type="text"
                placeholder="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-card border-border h-10 text-sm"
                onKeyDown={(e) => e.key === "Enter" && (action === "credit" ? handleCredit() : handleDebit())}
              />
              <div className="flex gap-2">
                <Button
                  data-testid={`button-confirm-${action}-${player.id}`}
                  size="sm"
                  className={`flex-1 h-9 font-bold text-xs uppercase tracking-wider ${action === "credit" ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}`}
                  onClick={action === "credit" ? handleCredit : handleDebit}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Confirm
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-border" onClick={() => { setAction(null); setAmount(""); setReason(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {action === "rename" && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Name</p>
              <Input
                data-testid={`input-rename-${player.id}`}
                type="text"
                maxLength={30}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-card border-border h-10 font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  data-testid={`button-confirm-rename-${player.id}`}
                  size="sm"
                  className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider"
                  onClick={handleRename}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="h-9 border-border" onClick={() => setAction(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/50 font-mono">
            Joined {format(new Date(player.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      )}
    </div>
  );
}

export function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("players");
  const queryClient = useQueryClient();

  const playersQuery = useAdminListPlayers({
    query: {
      queryKey: getAdminListPlayersQueryKey(),
      enabled: !!token,
      refetchInterval: 15000,
    },
    request: { headers: { "x-admin-token": token ?? "" } } as any,
  });

  const gamesQuery = useAdminListGames({
    query: {
      queryKey: getAdminListGamesQueryKey(),
      enabled: !!token && tab === "games",
      refetchInterval: 15000,
    },
    request: { headers: { "x-admin-token": token ?? "" } } as any,
  });

  const invalidatePlayers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getAdminListPlayersQueryKey() });
  }, [queryClient]);

  if (!token) return <LoginScreen onLogin={setToken} />;

  const players: AdminPlayer[] = (playersQuery.data as AdminPlayer[] | undefined) ?? [];
  const totalBalance = players.reduce((s, p) => s + p.balance, 0);
  const totalWins = players.reduce((s, p) => s + p.wins, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-black uppercase tracking-widest text-primary text-sm">Admin</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-destructive h-8"
            onClick={() => setToken(null)}
          >
            Log out
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-black font-mono">{players.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Players</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-black font-mono text-emerald-400">{totalBalance.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total ETB</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-black font-mono">{totalWins}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Wins</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-border">
          <button
            data-testid="tab-players"
            onClick={() => setTab("players")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "players" ? "bg-card border border-border text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-3.5 h-3.5" /> Players
          </button>
          <button
            data-testid="tab-games"
            onClick={() => setTab("games")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "games" ? "bg-card border border-border text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Games
          </button>
        </div>

        {/* Players Tab */}
        {tab === "players" && (
          <div className="space-y-2">
            {playersQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : players.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10 bg-card border border-border rounded-xl">
                No players yet.
              </div>
            ) : (
              players.map((p) => (
                <PlayerRow key={p.id} player={p} token={token} onUpdated={invalidatePlayers} />
              ))
            )}
          </div>
        )}

        {/* Games Tab */}
        {tab === "games" && (
          <div className="space-y-2">
            {gamesQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !gamesQuery.data || (gamesQuery.data as any[]).length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10 bg-card border border-border rounded-xl">
                No games yet.
              </div>
            ) : (
              (gamesQuery.data as any[]).map((g: any) => (
                <div
                  key={g.id}
                  data-testid={`card-game-${g.id}`}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">Game #{g.id}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        g.status === "playing" ? "bg-primary/10 text-primary border-primary/30"
                        : g.status === "finished" ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {g.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {format(new Date(g.createdAt), "MMM d, h:mm a")}
                    </p>
                    {g.winnerName && (
                      <p className="text-xs text-primary font-bold mt-1">Winner: {g.winnerName}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-muted-foreground">{g.playerCount} players</p>
                    <p className="font-mono font-bold text-sm text-primary">{g.prizePool} ETB</p>
                    <p className="text-[10px] text-muted-foreground">Entry: {g.entryFee} ETB</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
