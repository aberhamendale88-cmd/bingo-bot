import { Link, useLocation } from "wouter";
import { Trophy, Wallet as WalletIcon, Dices } from "lucide-react";
import { useGetWallet, getGetWalletQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const { data: wallet } = useGetWallet({
    query: {
      queryKey: getGetWalletQueryKey(),
    }
  });

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground pb-[70px]">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto w-full">
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight uppercase text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              Win Bingo
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Balance</span>
            <span className="font-mono font-bold text-emerald-400">
              {wallet ? `${wallet.balance.toFixed(2)} ${wallet.currency}` : "--- ETB"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 z-50 w-full border-t border-border bg-card pb-safe">
        <div className="flex items-center justify-around h-[70px] max-w-md mx-auto">
          <Link href="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <Dices className={`w-6 h-6 ${location === "/" ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : ""}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Play</span>
          </Link>
          <Link href="/leaderboard" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/leaderboard" ? "text-primary" : "text-muted-foreground"}`}>
            <Trophy className={`w-6 h-6 ${location === "/leaderboard" ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : ""}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Ranks</span>
          </Link>
          <Link href="/wallet" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/wallet" ? "text-primary" : "text-muted-foreground"}`}>
            <WalletIcon className={`w-6 h-6 ${location === "/wallet" ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : ""}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Wallet</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
