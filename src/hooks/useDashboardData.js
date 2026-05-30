import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isOverdue, getMonth } from "@/lib/gst-utils";
import { useShopSettings } from "./useShopSettings";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/localDB";

export function useDashboardData(startDate, endDate) {
  const { shopSettings } = useShopSettings();
  const businessType = shopSettings.business_type || "retail";
  const { user, companyId, authChecked } = useAuth();
  const queryClient = useQueryClient();
  const isOwnDataOnly = user?.permissions?.dashboard?.own_data_only || (user?.hierarchy_level && user?.hierarchy_level > 1);
  const isDataReady = !!user && !!companyId && authChecked;

  const activeBranchId = user?.branch_id && user?.branch_id !== 'null' && user?.branch_id !== 'all' 
    ? user.branch_id 
    : (localStorage.getItem('selectedBranch') || localStorage.getItem('branch_id') || 'main');

  const { data: rawInvoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const invoices = useMemo(() => {
    if (isOwnDataOnly) {
      return rawInvoices.filter(i => i.created_by === user?.email || i.created_by === user?.uid || i.userId === user?.id);
    }
    return rawInvoices;
  }, [rawInvoices, isOwnDataOnly, user]);

  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const { data: branchInventory = [], refetch: refetchBranchInventory } = useQuery({
    queryKey: ["branchInventory", activeBranchId],
    queryFn: async () => {
      if (!activeBranchId) return [];
      try {
        const companyId = localStorage.getItem("company_id");
        if (!companyId) return [];
        const inventory = await db.inventory
          .where('branchId')
          .equals(activeBranchId)
          .toArray();
        return inventory.filter(inv => inv.companyId === companyId);
      } catch (e) {
        console.error("Failed to query branch inventory for dashboard", e);
        return [];
      }
    },
    enabled: isDataReady && !!activeBranchId,
  });

  const mappedProducts = useMemo(() => {
    if (!activeBranchId) return products;
    return products.map(p => {
      const inv = branchInventory.find(i => i.productId === p.id);
      return { ...p, stock: inv ? Number(inv.quantity ?? 0) : (p.stock ?? 0) };
    });
  }, [products, branchInventory, activeBranchId]);

  const { data: rawPurchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const purchases = useMemo(() => {
    if (isOwnDataOnly) {
      return rawPurchases.filter(p => 
        p.created_by === user?.email || 
        p.created_by === user?.uid || 
        p.userId === user?.id || 
        p._lastModifiedBy === user?.email
      );
    }
    return rawPurchases;
  }, [rawPurchases, isOwnDataOnly, user]);

  const { data: rawExpenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const expenses = useMemo(() => {
    if (isOwnDataOnly) {
      return rawExpenses.filter(e => 
        e.created_by === user?.email || 
        e.created_by === user?.uid || 
        e.userId === user?.id || 
        e._lastModifiedBy === user?.email
      );
    }
    return rawExpenses;
  }, [rawExpenses, isOwnDataOnly, user]);

  const { data: rawLoans = [], refetch: refetchLoans } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isDataReady,
  });

  const loans = useMemo(() => {
    if (isOwnDataOnly) {
      return rawLoans.filter(l => 
        l.created_by === user?.email || 
        l.created_by === user?.uid || 
        l.userId === user?.id
      );
    }
    return rawLoans;
  }, [rawLoans, isOwnDataOnly, user]);

  useEffect(() => {
    let timeoutId = null;
    const handleDataUpdated = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["branchInventory"] });
        queryClient.invalidateQueries({ queryKey: ["loans"] });
      }, 150);
    };
    window.addEventListener("easybmt-data-updated", handleDataUpdated);
    return () => {
      window.removeEventListener("easybmt-data-updated", handleDataUpdated);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [queryClient]);

  const refetchAll = () => {
    if (!isDataReady) return;
    refetchInvoices();
    refetchCustomers();
    refetchProducts();
    refetchPurchases();
    refetchExpenses();
    refetchLoans();
    refetchBranchInventory();
  };

  const inRange = (dateStr) => {
    if (!dateStr || !startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const filteredInvoices = useMemo(() => invoices.filter(i => i.type === "sale" && inRange(i.date)), [invoices, startDate, endDate]);
  const filteredPurchases = useMemo(() => purchases.filter(p => inRange(p.date)), [purchases, startDate, endDate]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.date)), [expenses, startDate, endDate]);

  const totalSales = filteredInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalTax = filteredInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalPurchases = filteredPurchases.reduce((s, p) => s + (p.grand_total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const outstanding = invoices.filter(i => i.status !== "paid" && i.type === "sale").reduce((s, i) => s + (i.grand_total || 0) - (i.paid_amount || 0), 0);
  const overdueInvoices = invoices.filter(isOverdue);
  const lowStock = mappedProducts.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 10));
  const outStock = mappedProducts.filter(p => p.stock === 0);
  const totalLoanOutstanding = loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);

  const prevStart = startDate ? (() => { const d = new Date(startDate); d.setDate(d.getDate() - Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))); return d.toISOString().split("T")[0]; })() : null;
  const prevEnd = startDate ? (() => { const d = new Date(startDate); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })() : null;
  const prevSales = invoices.filter(i => i.type === "sale" && i.date >= prevStart && i.date <= prevEnd).reduce((s, i) => s + (i.grand_total || 0), 0);
  const salesTrend = prevSales > 0 ? Math.round(((totalSales - prevSales) / prevSales) * 100) : 0;

  // Daily chart data (last 14 days within range or within period)
  const dailyData = useMemo(() => {
    const periodDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const days = Math.min(periodDays, 30);
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
      const dayKey = d.toISOString().split("T")[0];
      const daySales = filteredInvoices.filter(inv => inv.date === dayKey).reduce((s, inv) => s + (inv.grand_total || 0), 0);
      const dayPurchases = filteredPurchases.filter(p => p.date === dayKey).reduce((s, p) => s + (p.grand_total || 0), 0);
      const dayExp = filteredExpenses.filter(e => e.date === dayKey).reduce((s, e) => s + (e.amount || 0), 0);
      return {
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        sales: daySales,
        expense: dayExp,
        profit: daySales - dayPurchases - dayExp
      };
    });
  }, [filteredInvoices, filteredPurchases, filteredExpenses, endDate, startDate]);

  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const mk = d.toISOString().slice(0, 7);
    const sales = invoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, inv) => s + (inv.grand_total || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === mk).reduce((s, p) => s + (p.grand_total || 0), 0);
    const exp = expenses.filter(e => getMonth(e.date) === mk).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: d.toLocaleString("en-IN", { month: "short" }),
      Sales: sales,
      Purchases: purch,
      Expenses: exp,
      Profit: sales - purch - exp,
    };
  }), [invoices, purchases, expenses]);

  return {
    shopSettings,
    businessType,
    invoices,
    customers,
    products: mappedProducts,
    purchases,
    expenses,
    loans,
    filteredInvoices,
    filteredPurchases,
    filteredExpenses,
    totalSales,
    totalTax,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    outstanding,
    overdueInvoices,
    lowStock,
    outStock,
    totalLoanOutstanding,
    salesTrend,
    dailyData,
    monthlyData,
    isDataReady,
    refetchAll
  };
}
