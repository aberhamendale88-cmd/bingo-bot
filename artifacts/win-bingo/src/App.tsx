import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Game } from "@/pages/game";
import { Wallet } from "@/pages/wallet";
import { Leaderboard } from "@/pages/leaderboard";
import { Admin } from "@/pages/admin";
import { useEffect, useState, createContext, useContext } from "react";
import { isTelegramApp, telegramReady, getTelegramDisplayName } from "@/lib/telegram";

interface TelegramContextValue {
  playerName: string | null;
  isFromTelegram: boolean;
  setPlayerName: (name: string) => void;
}

const TelegramContext = createContext<TelegramContextValue>({
  playerName: null,
  isFromTelegram: false,
  setPlayerName: () => {},
});

export function useTelegramContext() {
  return useContext(TelegramContext);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isFromTelegram] = useState(() => isTelegramApp());

  useEffect(() => {
    document.documentElement.classList.add("dark");

    if (!isTelegramApp()) return;
    telegramReady();

    const displayName = getTelegramDisplayName();
    if (displayName) setPlayerName(displayName);

    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    fetch("/api/telegram/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; playerName?: string }) => {
        if (data.ok && data.playerName) {
          setPlayerName(data.playerName);
          queryClient.invalidateQueries();
        }
      })
      .catch(() => {});
  }, []);

  return (
    <TelegramContext.Provider value={{ playerName, isFromTelegram, setPlayerName }}>
      {children}
    </TelegramContext.Provider>
  );
}

function PlayerRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Game} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TelegramProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/admin" component={Admin} />
              <Route component={PlayerRouter} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TelegramProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
