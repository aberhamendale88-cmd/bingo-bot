import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Trophy, Medal } from "lucide-react";

export function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard({
    query: {
      queryKey: getGetLeaderboardQueryKey(),
      refetchInterval: 10000,
    }
  });

  return (
    <div className="flex flex-col space-y-6 p-4 pb-10">
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <Trophy className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest text-foreground">Top Winners</h2>
        <p className="text-sm text-muted-foreground mt-1">The most legendary players</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-4">Loading ranks...</div>
        ) : leaderboard?.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8 bg-card border border-border rounded-xl">No games played yet.</div>
        ) : (
          leaderboard?.map((entry) => {
            const isFirst = entry.rank === 1;
            const isSecond = entry.rank === 2;
            const isThird = entry.rank === 3;
            
            return (
              <div 
                key={entry.rank} 
                className={`flex items-center justify-between p-4 rounded-xl border relative overflow-hidden shadow-lg transition-all ${
                  isFirst 
                    ? 'bg-gradient-to-r from-primary/20 to-card border-primary/50' 
                    : isSecond 
                      ? 'bg-gradient-to-r from-gray-300/20 to-card border-gray-300/30' 
                      : isThird 
                        ? 'bg-gradient-to-r from-amber-700/20 to-card border-amber-700/30'
                        : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black font-mono text-sm ${
                    isFirst ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                    isSecond ? 'bg-gray-300 text-gray-900 shadow-[0_0_10px_rgba(209,213,219,0.5)]' :
                    isThird ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(180,83,9,0.5)]' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {entry.rank}
                  </div>
                  <div>
                    <div className="font-bold text-base text-foreground tracking-wide flex items-center gap-2">
                      {entry.playerName}
                      {isFirst && <Medal className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{entry.wins} Wins</div>
                  </div>
                </div>
                <div className={`text-right font-mono relative z-10 ${isFirst ? 'text-primary drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-foreground'}`}>
                  <div className="font-black text-lg">{entry.totalEarnings}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">ETB</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
