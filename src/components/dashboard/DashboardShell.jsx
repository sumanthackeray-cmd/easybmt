import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import DownloadButton from "@/components/DownloadButton";

export default function DashboardShell({ children, startDate, endDate, onDateChange, onRefresh, isRefreshing }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  // Extract first name, skip titles like Mr., Mrs., Dr., Shri, etc.
  const _rawName = user?.full_name || user?.name || "";
  const _nameParts = _rawName.split(" ").filter(Boolean);
  const _titles = ["mr", "mr.", "mrs", "mrs.", "ms", "ms.", "dr", "dr.", "prof", "prof.", "shri", "smt"];
  const firstName = _nameParts.length === 0
    ? "User"
    : (_nameParts.length > 1 && _titles.includes(_nameParts[0].toLowerCase()))
      ? _nameParts[1]
      : _nameParts[0];
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = time.getHours();
  let greetingText = "Namaste";
  let emoji = "🙏";
  if (currentHour >= 5 && currentHour < 12) {
    greetingText = "Good Morning";
    emoji = "☀️";
  } else if (currentHour >= 12 && currentHour < 17) {
    greetingText = "Good Afternoon";
    emoji = "🌤️";
  } else if (currentHour >= 17 && currentHour < 21) {
    greetingText = "Good Evening";
    emoji = "🌇";
  } else {
    greetingText = "Good Night";
    emoji = "🌙";
  }

  return (
    <div className="animate-fade-up space-y-4 pb-20 md:pb-0 relative">
      {/* 🚀 API LOADING PROGRESS BAR 🚀 */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-background">
          <div className="h-full bg-primary animate-progress-indeterminate"></div>
        </div>
      )}

      {/* 👑 HEADER 👑 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight">
            {greetingText}, <span className="text-amber-600 dark:text-primary">{firstName}</span> {emoji}
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground mt-1 font-medium">
            <span>{time.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="font-mono text-primary font-bold">{time.toLocaleTimeString(language === "hi" ? "hi-IN" : "en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateChange}
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 shrink-0 border-border/50 hover:bg-secondary/40 rounded-lg shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
          <DownloadButton />
          <Link to="/invoices" className="hidden md:block">
            <Button className="gold-gradient text-black font-bold gap-2 text-sm h-9 hover:scale-105 transition-transform shadow-md shadow-amber-500/20">
              <Plus className="w-4 h-4" /> {language === "hi" ? "नया बिल बनाएँ" : "New Invoice"}
            </Button>
          </Link>
        </div>
      </div>
      
      {children}

      {/* Mobile FAB removed as per user request to clean up UI */}
    </div>
  );
}
