import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";
import GSTDeadlineBanner from "@/components/gst/GSTDeadlineBanner";
import OnboardingModal from "./OnboardingModal";
import GlobalCommandPalette from "@/components/dashboard/GlobalCommandPalette";
import AiCopilot from "@/components/dashboards/enterprise/AiCopilot";
import InternalStaffChat from "@/components/layout/InternalStaffChat";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";

import { useEffect } from "react";

export default function AppLayout() {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile top nav */}
      <MobileNav />

      {/* Main content */}
      <main id="main-scroll-container" className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden mobile-main-padding lg:p-6">
        <div className="max-w-7xl mx-auto space-y-3">
          <SubscriptionBanner />
          <GSTDeadlineBanner />
          <Outlet />
        </div>
      </main>
      <OnboardingModal />
      <GlobalCommandPalette />
      <AiCopilot />
      <InternalStaffChat />
    </div>
  );
}