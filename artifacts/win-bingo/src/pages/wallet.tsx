import { useGetWallet, useGetWalletHistory, useTopUpWallet, getGetWalletQueryKey, getGetWalletHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, ArrowUpRight, ArrowDownRight, PlusCircle } from "lucide-react";

export function Wallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState("");

  const { data: wallet, isLoading: isWalletLoading } = useGetWallet({
    query: { queryKey: getGetWalletQueryKey() }
  });

  const { data: history, isLoading: isHistoryLoading } = useGetWalletHistory({
    query: { queryKey: getGetWalletHistoryQueryKey() }
  });

  const topUp = useTopUpWallet();

  const handleTopUp = (amount: number) => {
    topUp.mutate(
      { data: { amount } },
      {
        onSuccess: () => {
          toast({ title: "Top up successful", description: `Added ${amount} ETB to your wallet.` });
          queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWalletHistoryQueryKey() });
          setCustomAmount("");
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Top up failed", description: err.message || "An error occurred." });
        }
      }
    );
  };

  const presetAmounts = [50, 100, 200, 500];

  return (
    <div className="flex flex-col space-y-6 p-4 pb-10">
      {/* Balance Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-full blur-3xl w-32 h-32 transform translate-x-1/2 -translate-y-1/2"></div>
        <span className="text-sm text-muted-foreground uppercase font-bold tracking-widest relative z-10">Available Balance</span>
        <div className="mt-2 font-mono text-4xl font-black text-foreground relative z-10 flex items-baseline gap-2">
          {isWalletLoading ? "---" : wallet?.balance.toFixed(2)} 
          <span className="text-xl text-primary font-bold">ETB</span>
        </div>
      </div>

      {/* Top Up Section */}
      <div className="space-y-4">
        <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest pl-1">Quick Top Up</h3>
        <div className="grid grid-cols-2 gap-3">
          {presetAmounts.map(amount => (
            <Button
              key={amount}
              variant="outline"
              className="bg-card border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50 h-12 font-mono font-bold text-base"
              onClick={() => handleTopUp(amount)}
              disabled={topUp.isPending}
            >
              + {amount} ETB
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <Input 
            type="number" 
            placeholder="Custom Amount" 
            className="bg-card font-mono text-base h-12"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <Button 
            className="h-12 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            onClick={() => handleTopUp(Number(customAmount))}
            disabled={!customAmount || Number(customAmount) <= 0 || topUp.isPending}
          >
            {topUp.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5 mr-2" />}
            Add
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-sm text-muted-foreground uppercase font-bold tracking-widest pl-1">Transactions</h3>
        <div className="space-y-3">
          {isHistoryLoading ? (
            <div className="text-center text-muted-foreground text-sm py-4">Loading history...</div>
          ) : history?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 bg-card border border-border rounded-xl">No transactions yet.</div>
          ) : (
            history?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                    {tx.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{tx.description}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{format(new Date(tx.createdAt), "MMM d, h:mm a")}</div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${tx.type === 'credit' ? 'text-accent' : 'text-foreground'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
