import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Menu, X, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import { useLanguage } from "@/lib/LanguageContext";
import { useBackButton } from "@/hooks/useBackButton";

import { Users, MoreHorizontal, Bot } from "lucide-react";

const BOTTOM_NAV = [
  { path: "/", icon: LayoutDashboard, label: "Home", tKey: "nav.dashboard" },
  { path: "/pos", icon: Zap, label: "POS", tKey: "nav.pos" },
  { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
  { action: "open-ai-copilot", icon: Bot, label: "AI Copilot", tKey: "AI Copilot" },
  { path: "/customers", icon: Users, label: "Customers", tKey: "nav.customers" },
  { path: "/settings", icon: MoreHorizontal, label: "More", tKey: "nav.settings" },
];

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useBackButton(() => setOpen(false), open);

  const isPOS = location.pathname.toLowerCase().includes('pos');

  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Reset visibility on route change
  useEffect(() => {
    setIsVisible(true);
    const container = document.getElementById("main-scroll-container");
    if (container) {
      setHasScrolled(container.scrollTop > 0);
    }
  }, [location.pathname]);

  // LinkedIn style scroll behavior — optimized for 60fps on mobile
  useEffect(() => {
    if (isPOS) return; // Unchanged on POS pages

    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    let lastScrollY = 0;
    let ticking = false;
    const threshold = 12; // 12px scroll threshold to prevent flickering

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          setHasScrolled(currentScrollY > 10);

          if (Math.abs(currentScrollY - lastScrollY) < threshold) {
            ticking = false;
            return;
          }

          if (currentScrollY <= 15) {
            // Always show when close to the top
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 60) {
            // Scrolling down - hide
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY) {
            // Scrolling up - show
            setIsVisible(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    // Passive listener — browser can start scrolling instantly without
    // waiting for JS. Direct container binding is faster than window capture.
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isPOS, location.pathname]);

  // Global swipe-to-open sidebar logic
  useEffect(() => {
    let touchstartX = 0;
    let touchstartY = 0;

    const handleTouchStart = (e) => {
      touchstartX = e.changedTouches[0].screenX;
      touchstartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      const touchendX = e.changedTouches[0].screenX;
      const touchendY = e.changedTouches[0].screenY;
      
      const distanceX = touchendX - touchstartX;
      const distanceY = Math.abs(touchendY - touchstartY);
      
      // Swipe Right (Left to Right)
      // Must be a clear horizontal swipe (distanceX > 50 and distanceY < 50)
      if (distanceX > 50 && distanceY < 50) {
        // Only trigger if started near the left edge (within 30px)
        if (touchstartX < 30) {
          setOpen(true);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <>
      {/* Top bar for mobile */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md px-4 flex items-center justify-between transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        isPOS ? "py-3 border-b border-border" : "",
        !isPOS && !isVisible ? "-translate-y-full shadow-none" : "translate-y-0",
        !isPOS && hasScrolled && isVisible ? "shadow-lg border-b-transparent bg-card/98" : "border-b border-border/50"
      )}
      style={{ paddingTop: 'var(--safe-top)', height: 'var(--mobile-header-h)' }}
      >
        <div className="flex items-center gap-2">
          <span className={cn("font-black gold-text", isPOS ? "text-xl" : "text-base")}>EasyBMT</span>
        </div>
        <div className="flex items-center gap-[5px]">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-internal-chat'))}
            className="p-1 rounded-full hover:bg-accent transition-colors active:scale-95 flex items-center justify-center"
            title="Internal Staff Message Box"
          >
            <Info className="w-4 h-4 text-primary" />
          </button>
          <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className={cn("rounded-lg hover:bg-accent transition-colors active:scale-95", isPOS ? "p-2.5" : "p-1.5")}>
                  {open ? <X className={isPOS ? "w-7 h-7" : "w-6 h-6"} /> : <Menu className={isPOS ? "w-7 h-7" : "w-6 h-6"} />}
                </button>
              </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[240px] bg-sidebar border-r border-sidebar-border">
            <div className="h-full overflow-y-auto">
              <Sidebar mobile onClose={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/97 backdrop-blur-xl border-t border-border safe-area-pb transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        !isPOS && !isVisible ? "translate-y-full shadow-none" : "translate-y-0",
        !isPOS && hasScrolled && isVisible ? "shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" : ""
      )}>
        <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {BOTTOM_NAV.map((item) => {
            if (item.action) {
              return (
                <button
                  key={item.action}
                  onClick={() => window.dispatchEvent(new CustomEvent(item.action))}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-bold transition-all duration-200 relative select-none text-muted-foreground"
                >
                  <div className="flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200 hover:bg-accent/50">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-bold transition-all duration-200 relative select-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gold-gradient" />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                    isActive ? "bg-primary/15 scale-110" : "hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                </div>
                <span className={cn("leading-none", isActive ? "text-primary" : "")}>{t(item.tKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}