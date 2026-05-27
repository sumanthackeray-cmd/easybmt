import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  User, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      staggerChildren: 0.08,
      duration: 0.4,
      ease: "easeOut"
    } 
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function StaffDashboard({ data }) {
  const { user } = useAuth();
  
  const safeData = useMemo(() => ({
    invoices: data?.invoices || [],
    products: data?.products || []
  }), [data]);

  const myInvoices = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return safeData.invoices.filter(i => 
      (i.created_by === user?.email || i.created_by === user?.uid) && 
      (i.created_date?.startsWith(today) || i.date?.startsWith(today))
    );
  }, [safeData.invoices, user]);

  const mySaleVolume = useMemo(() => {
    return myInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  }, [myInvoices]);

  const firstName = user?.full_name?.split(" ")[0] || "Staff";

  return (
    <motion.div 
      className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <motion.div 
        variants={cardVariants}
        className="relative overflow-hidden bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none -translate-y-4 translate-x-4">
          <User className="w-56 h-56" />
        </div>
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Welcome back, <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">{firstName}</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Your shift is active. Have a great day ahead!
          </p>
        </div>
        
        <div className="relative z-10 shrink-0">
          <Link to="/pos">
            <button className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 dark:shadow-violet-950/40 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
              <ShoppingBag className="w-4 h-4" />
              Open POS Register
            </button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.08] pointer-events-none -translate-y-1/2 translate-x-1/2 bg-blue-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Bills Today</p>
                  <h3 className="text-3xl font-black text-foreground tracking-tight">{myInvoices.length}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl transition-transform group-hover:scale-105">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI 2 */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.08] pointer-events-none -translate-y-1/2 translate-x-1/2 bg-emerald-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Sale Volume</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₹{mySaleVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-transform group-hover:scale-105">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI 3 */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.08] pointer-events-none -translate-y-1/2 translate-x-1/2 bg-amber-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current Shift</p>
                  <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">Active</h3>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl transition-transform group-hover:scale-105">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI 4 */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.08] pointer-events-none -translate-y-1/2 translate-x-1/2 bg-indigo-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Access Level</p>
                  <h3 className="text-xl font-black text-foreground tracking-tight mt-1 capitalize">
                    {user?.role?.replace('_', ' ') || 'Staff'}
                  </h3>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-transform group-hover:scale-105">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions / Links */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link 
                  to="/inventory" 
                  className="p-4 bg-muted/40 hover:bg-muted/80 border border-border/60 rounded-2xl hover:border-violet-500/30 transition-all duration-200 group flex flex-col justify-between h-28"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-sm text-foreground">View Inventory</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">Check stock levels & live availability</p>
                </Link>
                
                <Link 
                  to="/customers" 
                  className="p-4 bg-muted/40 hover:bg-muted/80 border border-border/60 rounded-2xl hover:border-violet-500/30 transition-all duration-200 group flex flex-col justify-between h-28"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-sm text-foreground">Customers</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">Search and view customer profiles</p>
                </Link>

                <Link 
                  to="/invoices" 
                  className="p-4 bg-muted/40 hover:bg-muted/80 border border-border/60 rounded-2xl hover:border-violet-500/30 transition-all duration-200 group flex flex-col justify-between h-28"
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-sm text-foreground">Recent Bills</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">Reprint or review today's bills</p>
                </Link>
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/50">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Need quick actions? Open the POS Register to generate bills in real-time.</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security / Isolation Alert */}
        <motion.div variants={cardVariants}>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Restricted Access Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-200/90 text-sm leading-relaxed shadow-sm">
                <p className="mb-3 font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <span>🔒</span> Data Isolation Active
                </p>
                <p className="text-xs space-y-2">
                  Your dashboard is currently running in Staff Mode based on your <strong>{user?.role?.toUpperCase() || 'CASHIER'}</strong> permissions.
                </p>
                <p className="text-xs mt-2 text-muted-foreground dark:text-amber-200/70">
                  Enterprise analytics, gross profit calculations, full inventory valuation, and GST liability reports are restricted to executives and management. If you need access to these modules, please contact your store Owner or Administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
