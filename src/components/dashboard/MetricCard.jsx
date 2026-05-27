import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const THEMES = {
  gold:   { border: "border-yellow-500/30 dark:border-yellow-500/40", bg: "bg-yellow-50 dark:bg-yellow-500/10", icon: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400", value: "text-yellow-700 dark:text-yellow-400", sparkline: "#eab308", shadow: "hover:shadow-yellow-500/20" },
  green:  { border: "border-emerald-500/30 dark:border-emerald-500/40", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400", value: "text-emerald-700 dark:text-emerald-400", sparkline: "#10b981", shadow: "hover:shadow-emerald-500/20" },
  red:    { border: "border-red-500/30 dark:border-red-500/40", bg: "bg-red-50 dark:bg-red-500/10", icon: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400", value: "text-red-700 dark:text-red-400", sparkline: "#ef4444", shadow: "hover:shadow-red-500/20" },
  blue:   { border: "border-blue-500/30 dark:border-blue-500/40", bg: "bg-blue-50 dark:bg-blue-500/10", icon: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400", value: "text-blue-700 dark:text-blue-400", sparkline: "#3b82f6", shadow: "hover:shadow-blue-500/20" },
  purple: { border: "border-purple-500/30 dark:border-purple-500/40", bg: "bg-purple-50 dark:bg-purple-500/10", icon: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400", value: "text-purple-700 dark:text-purple-400", sparkline: "#a855f7", shadow: "hover:shadow-purple-500/20" },
  teal:   { border: "border-teal-500/30 dark:border-teal-500/40", bg: "bg-teal-50 dark:bg-teal-500/10", icon: "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400", value: "text-teal-700 dark:text-teal-400", sparkline: "#14b8a6", shadow: "hover:shadow-teal-500/20" },
  orange: { border: "border-orange-500/30 dark:border-orange-500/40", bg: "bg-orange-50 dark:bg-orange-500/10", icon: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400", value: "text-orange-700 dark:text-orange-400", sparkline: "#f97316", shadow: "hover:shadow-orange-500/20" },
};

// Simple CountUp implementation that handles strings like "₹1,964.70"
function CountUpValue({ valueStr }) {
  const [displayValue, setDisplayValue] = useState(valueStr);
  const animationRef = useRef(null);

  useEffect(() => {
    // If not a string with numbers, just return
    if (typeof valueStr !== 'string') {
      setDisplayValue(valueStr);
      return;
    }
    
    // Extract the raw number, removing ₹ and commas
    const numMatch = valueStr.replace(/[₹, ]/g, '').match(/^-?\d+(?:\.\d+)?/);
    if (!numMatch) {
      setDisplayValue(valueStr);
      return;
    }
    
    const targetNum = parseFloat(numMatch[0]);
    if (isNaN(targetNum) || targetNum === 0) {
      setDisplayValue(valueStr);
      return;
    }

    const hasDecimals = valueStr.includes('.');
    const decimalPlaces = hasDecimals ? (valueStr.split('.')[1]?.length || 0) : 0;
    
    let startTimestamp = null;
    const duration = 800; // 800ms
    const prefix = valueStr.includes('₹') ? '₹' : '';

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentNum = targetNum * easeProgress;
      
      // Format back to Indian Numbering System
      let formattedNum = currentNum.toLocaleString('en-IN', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      });
      
      setDisplayValue(`${prefix}${formattedNum}`);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(valueStr); // Ensure exact final value
      }
    };
    
    animationRef.current = requestAnimationFrame(step);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [valueStr]);

  return <>{displayValue}</>;
}

export default function MetricCard({ label, value, icon: Icon, color = "gold", sub, trend, trendLabel, sparklineData, onClickAction }) {
  const t = THEMES[color] || THEMES.gold;
  const isUp = trend > 0;
  const isDown = trend < 0;

  return (
    <div className={`bg-white dark:bg-card border ${t.border} rounded-xl p-4 flex flex-col gap-2 transition-all duration-300 hover:-translate-y-1 shadow-sm ${t.shadow} relative overflow-hidden group`}>
      <div className="flex items-start justify-between relative z-10">
        <div className={`w-9 h-9 rounded-lg ${t.icon} flex items-center justify-center shrink-0 shadow-inner`}>
          {typeof Icon === "string" ? (
            <span className="text-base leading-none">{Icon}</span>
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex flex-col items-end`}>
            <div className={`flex items-center gap-1 text-[12px] font-black ${isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {trend !== 0 ? `${Math.abs(trend)}%` : "—"}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative z-10 mt-1">
        <p className={`text-2xl font-black ${t.value} tracking-tight leading-none mb-1.5`}>
          <CountUpValue valueStr={value} />
        </p>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-slate-700 dark:text-foreground">{label}</p>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          {sub && (
            <p className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground flex items-center gap-1">
              {sub}
            </p>
          )}
          {onClickAction && (
            <button onClick={onClickAction} className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline ml-auto">
              View
            </button>
          )}
        </div>
      </div>

      {/* Background Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-300">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={t.sparkline} 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={true}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}