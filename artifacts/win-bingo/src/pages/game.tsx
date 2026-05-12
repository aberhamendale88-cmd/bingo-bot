import { useEffect, useState, useMemo, useRef } from "react";
import {
  useGetGameState,
  useGetPlayerCard,
  useJoinGame,
  getGetGameStateQueryKey,
  getGetPlayerCardQueryKey,
  getGetWalletQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function Game() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gameState, isLoading: isGameStateLoading } = useGetGameState({
    query: {
      queryKey: getGetGameStateQueryKey(),
      refetchInterval: 5000,
    }
  });

  const { data: playerCard, isLoading: isPlayerCardLoading } = useGetPlayerCard({
    query: {
      queryKey: getGetPlayerCardQueryKey(),
      enabled: !!gameState && gameState.status !== "lobby",
      refetchInterval: 5000,
    }
  });

  const joinGame = useJoinGame();

  const handleJoinGame = () => {
    joinGame.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Joined Game", description: "You have successfully joined the game!" });
        queryClient.invalidateQueries({ queryKey: getGetGameStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerCardQueryKey() });
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "Failed to join", description: error.message || "Unknown error" });
      }
    });
  };

  const hasJoined = !!playerCard;

  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  
  useEffect(() => {
    if (gameState?.lastCalledNumber) {
      setFlashNumber(gameState.lastCalledNumber);
      const t = setTimeout(() => setFlashNumber(null), 1000);
      return () => clearTimeout(t);
    }
  }, [gameState?.lastCalledNumber]);

  return (
    <div className="flex flex-col space-y-6 p-4 pb-10">
      {/* Status Bar */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-lg shadow-black/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</span>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${gameState?.status === 'playing' ? 'bg-primary animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]' : gameState?.status === 'finished' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
              <span className="font-mono font-bold uppercase tracking-widest text-sm">
                {gameState?.status || "Loading..."}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Prize Pool</span>
            <div className="font-mono font-bold text-primary mt-1 shadow-primary">
              {gameState?.prizePool ? `${gameState.prizePool} ETB` : "---"}
            </div>
          </div>
        </div>

        {gameState?.status === 'lobby' && (
          <div className="flex flex-col space-y-3 pt-3 border-t border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Entry Fee: <strong className="text-foreground">{gameState.entryFee} ETB</strong></span>
              <span className="text-muted-foreground">Players: <strong className="text-foreground">{gameState.playerCount}</strong></span>
            </div>
            {!hasJoined ? (
              <Button 
                onClick={handleJoinGame} 
                disabled={joinGame.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
              >
                {joinGame.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Join Game
              </Button>
            ) : (
              <div className="w-full py-2 text-center rounded bg-accent/20 border border-accent text-accent font-bold uppercase tracking-widest text-sm">
                Waiting for game to start...
              </div>
            )}
          </div>
        )}

        {gameState?.status === 'finished' && gameState.winnerName && (
          <div className="flex flex-col items-center justify-center pt-3 border-t border-border py-4 bg-primary/10 rounded-lg mt-2 border border-primary/30">
            <span className="text-primary uppercase font-black tracking-widest text-xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">Winner</span>
            <span className="font-mono font-bold text-lg mt-1">{gameState.winnerName}</span>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      {gameState?.status === 'playing' && (
        <>
          <div className="flex justify-between items-end gap-4">
            <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5"></div>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider relative z-10">Last Call</span>
              <span className={`font-mono text-5xl font-black mt-2 relative z-10 transition-all duration-300 ${flashNumber ? 'text-primary drop-shadow-[0_0_20px_rgba(245,158,11,1)] scale-110' : 'text-foreground'}`}>
                {gameState.lastCalledNumber || "-"}
              </span>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-center">Next in</span>
              <span className="font-mono text-2xl font-bold text-accent mt-1">
                {gameState.nextCallIn}s
              </span>
            </div>
          </div>

          {playerCard && (
            <div className="space-y-3">
              <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest pl-1">Your Card</h3>
              <div className="grid grid-cols-5 gap-2 p-3 bg-card border border-border rounded-xl shadow-lg">
                {playerCard.numbers.map((num, i) => {
                  const isMarked = playerCard.markedNumbers.includes(num);
                  return (
                    <div 
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded text-sm font-mono font-bold transition-all duration-300 ${
                        isMarked 
                          ? 'bg-accent text-accent-foreground shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-accent-foreground/20' 
                          : 'bg-muted text-muted-foreground border border-border/50'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest pl-1">All Numbers</h3>
            <div className="bg-card border border-border rounded-xl p-3 shadow-inner h-[200px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 500 }).map((_, i) => {
                  const num = i + 1;
                  const isCalled = gameState.calledNumbers.includes(num);
                  return (
                    <div 
                      key={num}
                      className={`text-[9px] h-6 flex items-center justify-center rounded font-mono transition-colors duration-500 ${
                        isCalled 
                          ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                          : 'text-muted-foreground/30'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
