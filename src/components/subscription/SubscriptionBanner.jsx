import { useQuery } from "@tanstack/react-query";
import { getUserSubscription } from "@/lib/subscription";
import { Crown, X, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function SubscriptionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, percentage: 0 });

  const { data: sub } = useQuery({
    queryKey: ["userSubscription"],
    queryFn: getUserSubscription,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!sub?.trial_end || !sub?.trial_start) return;

    const calculateTime = () => {
      const now = new Date();
      const end = new Date(sub.trial_end);
      end.setHours(23, 59, 59, 999); // Set to end of day
      const start = new Date(sub.trial_start);
      
      const totalTime = end.getTime() - start.getTime();
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, percentage: 100 });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const percentage = Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / totalTime) * 100));
      
      setTimeLeft({ days, hours, percentage });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000 * 60); // update every minute
    return () => clearInterval(interval);
  }, [sub]);

  if (!sub || dismissed) return null;
  if (sub.status === "active" && sub.plan !== "free") return null;

  const isExpired = sub.status === "expired" || (sub.status === "trial" && timeLeft.days === 0 && timeLeft.hours === 0);

  if (!isExpired && sub.status === "active") return null;

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 ${
      isExpired 
        ? "bg-gradient-to-r from-[#059669] to-[#0F766E] text-white" 
        : "bg-gradient-to-r from-[#F97316] to-amber-500 text-white"
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
      
      {/* Progress Bar (Bottom) */}
      {!isExpired && (
        <div className="absolute bottom-0 left-0 h-1 bg-black/20 w-full">
          <div 
            className="h-full bg-white/40 transition-all duration-1000 ease-linear" 
            style={{ width: `${timeLeft.percentage}%` }}
          />
        </div>
      )}

      <div className="relative px-5 py-3.5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 flex items-center gap-3 w-full">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shrink-0">
            {isExpired ? <Crown className="w-5 h-5 text-white" /> : <Crown className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h4 className="font-black text-base leading-none mb-1 shadow-black/10 text-shadow-sm">
              {isExpired ? "3 Months Completely Free, Use Unlimited" : "Free Trial Active"}
            </h4>
            <p className="text-white/90 text-[13px] font-medium leading-tight">
              {isExpired 
                ? "Enjoy unlimited access to all premium features without interruptions."
                : "Upgrade your workspace to unlock unlimited invoices and advanced reports."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          {!isExpired && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/15 rounded-lg backdrop-blur-sm border border-white/10 shrink-0">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <div className="flex gap-1 text-[13px] font-bold text-white">
                <span>{timeLeft.days}d</span>
                <span className="text-white/50">:</span>
                <span>{timeLeft.hours}h</span>
                <span className="text-white/70 font-medium ml-1 text-[11px] uppercase tracking-wider hidden sm:inline">Left</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link to="/subscription" className="shrink-0">
              <Button size="sm" className={`bg-white hover:bg-white/90 font-black text-xs h-8 px-4 shadow-sm transition-all hover:scale-105 active:scale-95 ${isExpired ? "text-[#0F766E]" : "text-[#F97316]"}`}>
                {isExpired ? "View Plans" : "Upgrade Now"}
              </Button>
            </Link>
            
            <button 
              onClick={() => setDismissed(true)} 
              className="p-1.5 rounded-md hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}