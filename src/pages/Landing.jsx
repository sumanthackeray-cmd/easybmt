import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import SEO from "@/components/SEO";
import { Check, Zap, Star, Building2, Gift, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import OfferDialog from "@/components/subscription/OfferDialog";
import "../landing.css";

const PLANS = [
  {
    id: "free", name: "Free Trial", price: 0, period: "14 days", icon: Gift,
    color: "text-muted-foreground", border: "border-border", badge: "Special Offer",
    description: "Try all features free for 14 days",
    features: ["Up to 25 invoices", "Up to 50 products", "Basic GST reports", "Watermarked invoices", "Single user"],
    cta: "Start Free Trial", ctaClass: "bg-secondary text-foreground hover:bg-secondary/80",
    stamp: "3 Months Completely Free"
  },
  {
    id: "starter", name: "Starter", price: 499, period: "month", icon: Zap,
    color: "text-info", border: "border-info/30", badge: "Special Offer",
    description: "Perfect for small shops & kirana stores",
    features: ["500 invoices/month", "Unlimited products", "GST billing & reports", "Barcode printing", "E-Waybill support", "WhatsApp sharing"],
    cta: "Get Starter", ctaClass: "bg-info text-white hover:bg-info/90",
    stamp: "3 Months Completely Free"
  },
  {
    id: "professional", name: "Professional", price: 999, period: "month", icon: Star,
    color: "text-primary", border: "border-primary/40", badge: "Most Popular & Offer",
    description: "For growing businesses & distributors",
    features: ["Unlimited invoices", "Multi-user (5 users)", "AI Insights & Analytics", "Custom branding & logo", "Cloud backup", "Priority support", "GSTR-1/3B reports"],
    cta: "Go Professional", ctaClass: "gold-gradient text-black font-black hover:opacity-90",
    highlighted: true,
    stamp: "3 Months Completely Free"
  },
  {
    id: "enterprise", name: "Enterprise", price: 2499, period: "month", icon: Building2,
    color: "text-[#7C3AED]", border: "border-[#7C3AED]/30", badge: "Best Value & Offer",
    description: "For large enterprises & multi-branch",
    features: ["Everything in Professional", "Multi-branch support", "Unlimited users", "AI automation", "API access", "Dedicated account manager"],
    cta: "Contact Sales", ctaClass: "!bg-[#7C3AED] !text-white hover:opacity-90",
    stamp: "3 Months Completely Free"
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Interactive UI states
  const [billing, setBilling] = useState("monthly"); // "monthly" or "yearly"
  const [openFaq, setOpenFaq] = useState(null); // FAQ collapsible index
  const [activeFeatureTab, setActiveFeatureTab] = useState("pos"); // active feature tab category
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // mobile nav open state
  const [offerPopup, setOfferPopup] = useState({ isOpen: false, planName: "" }); // offer popup
  
  // Tab-specific selectors (like switching between P&L and Balance sheet screenshots)
  const [selectedErpScreen, setSelectedErpScreen] = useState("pl"); // "pl" or "bs"

  const handleSubscribeClick = (plan) => {
    if (plan.price === 0) {
      navigate("/register");
      return;
    }
    setOfferPopup({ isOpen: true, planName: plan.name });
  };

  // If user is already logged in, seamlessly redirect them to the secure dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Flower rain
        const end = Date.now() + 2 * 1000;
        const colors = ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7'];
        const frame = () => {
          confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 10000 });
          confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 10000 });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
        observer.disconnect(); // Only run once
      }
    });
    
    const el = document.getElementById("pricing");
    if (el) observer.observe(el);
    
    return () => observer.disconnect();
  }, []);

  // Price calculations based on billing state (Yearly gets 20% discount)
  const discount = billing === "yearly" ? 0.2 : 0;
  const calculatePrice = (basePrice) => {
    if (basePrice === 0) return "FREE";
    const discounted = Math.round(basePrice * (1 - discount));
    return discounted.toLocaleString("en-IN");
  };

  const toggleBilling = () => {
    setBilling((prev) => (prev === "monthly" ? "yearly" : "monthly"));
  };

  const handleFaqToggle = (index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  // Comprehensive feature categories compiled directly from project analysis
  const featureTabs = [
    {
      id: "pos",
      label: "Dual-Mode POS",
      title: "Lightning-Fast Point of Sale for <em>Retail, Fashion & Supermarkets</em>",
      description: "Get specialized cash registers that speed up checkout counters and connect directly to your inventory.",
      bullets: [
        "Specialized Fashion POS with tailor alteration tasks mapping & measurements tracking.",
        "Supermarket POS with fast barcode scanners support & hardware weight scales.",
        "Interactive customer style profiles and CRM preferences memory.",
        "Automatic loyalty program tiers (Silver, Gold, Platinum) with points tracking."
      ],
      panelCards: [
        { icon: "⚡", title: "Quick Counter POS", desc: "Process B2C bills in milliseconds. Cash, card, UPI, and Split pay." },
        { icon: "👗", title: "Fashion Tailor Mapping", desc: "Map alterations to cart items, assign to tailors, and track delivery dates." },
        { icon: "🛒", title: "Supermarket Systems", desc: "Manage cashier counters, FEFO expiry dates, and department reports." },
        { icon: "🏷️", title: "Smart Offers Engine", desc: "Run BOGO deals, spend discounts, and custom pricing campaigns instantly." }
      ]
    },
    {
      id: "inventory",
      label: "Warehouse & Stock",
      title: "SAP-Style <em>Warehouse & Stock Hub</em>",
      description: "Track inventory at rack level, synchronize stock across branches, and prevent low-stock bottlenecks.",
      bullets: [
        "Live stock levels sync between bills, purchase orders, and branches.",
        "Multi-warehouse storage with custom row, column, and rack mapping.",
        "Inter-branch stock transfers with secure gateway transit approvals.",
        "Integrated batch barcodes labels generator and sheet layout printing."
      ],
      panelCards: [
        { icon: "📦", title: "Live Sync Engine", desc: "Auto-sync stock levels instantly as sales are processed at any counter." },
        { icon: "🚚", title: "Stock Transfers", desc: "Send stock between branch outlets with verification codes." },
        { icon: "🏭", title: "Warehouse Racks", desc: "Know the exact shelf location of every SKU inside your warehouses." },
        { icon: "🖨️", title: "Barcode Generator", desc: "Generate custom HSN barcodes and print sheets for packaging." }
      ]
    },
    {
      id: "erp",
      label: "ERP Bookkeeping",
      title: "Auto-Generated <em>Finance & Accounting Ledger</em>",
      description: "Know your actual profitability metrics without waiting for accountants at the end of the year.",
      bullets: [
        "Live generated Profit & Loss (P&L) statements and Balance Sheets.",
        "Complete double-entry accounting ledgers, Trial Balance, and cashflow charts.",
        "State-wise IGST, CGST, and SGST automated tax distribution.",
        "One-click GSTR-1 and GSTR-3B filing data exports."
      ],
      // We will render the real P&L and Balance Sheet screenshots on the right for this tab!
      showScreenshot: true,
      panelCards: []
    },
    {
      id: "hrms",
      label: "Workforce & HRMS",
      title: "Integrated <em>Attendance, Shift & Payroll System</em>",
      description: "Coordinate workforce shifts, calculate payroll, and compute legal payouts seamlessly.",
      bullets: [
        "Cashier shift loggers with opening float and cash drawer verification.",
        "Employee biometric attendance trackers and salary computation grids.",
        "Automatic ESI, PF, and professional tax calculations.",
        "Role-based granular page access security configurations."
      ],
      panelCards: [
        { icon: "🕒", title: "Shift Cash Drawers", desc: "Verify opening cash and closing drawer tallies for all cashiers." },
        { icon: "👥", title: "Workforce Payroll", desc: "Compute monthly salary slips with allowances and deductions." },
        { icon: "🛡️", title: "Access Permissions", desc: "Lock POS, warehouse, or ledgers based on staff role permission gates." },
        { icon: "💼", title: "Staff Directory", desc: "Manage employee files, contracts, shifts, and leaves in one spot." }
      ]
    },
    {
      id: "ai",
      label: "AI Intelligence",
      title: "Predictive <em>AI Anomaly & Forecasting Engine</em>",
      description: "Harness enterprise-level intelligence to predict cashflow, flag anomalies, and optimize pricing.",
      bullets: [
        "Daily automated revenue forecasting models with trend analysis.",
        "Net profit predictions based on loose stock and manufacturing costing.",
        "Risk alerts for outstanding accounts receivable (A/R) invoices.",
        "Natural language processing assistant for instant business reports Q&A."
      ],
      panelCards: [
        { icon: "🔮", title: "Revenue Forecasting", desc: "See cashflow trends and predicted revenue peaks next month." },
        { icon: "🚨", title: "Risk Anomalies", desc: "Get flagged immediately on missing tax files or bad debt invoices." },
        { icon: "🤖", title: "AI Copilot Q&A", desc: "Ask 'what was my top profit department this week?' for instant charts." },
        { icon: "📊", title: "Turnover Ratio", desc: "Analyze slow-moving inventory items to free up warehouse space." }
      ]
    },
    {
      id: "manufacturing",
      label: "Manufacturing ERP",
      title: "Advanced <em>BOM Costing & Production Control</em>",
      description: "Manage raw material conversions, determine costing, and track production stages dynamically.",
      bullets: [
        "Dynamic Bill of Materials (BOM) multi-level composition setups.",
        "Raw materials inventory auto-deduction upon production execution.",
        "Finished goods automatic costing calculations based on labor and inputs.",
        "Manufacturing pipeline stages monitoring from request to stock."
      ],
      panelCards: [
        { icon: "🛠️", title: "Bill of Materials", desc: "Link components, packaging, and raw materials to make a final SKU." },
        { icon: "🌾", title: "Auto Raw Deduction", desc: "Auto-consume ingredients and update packaging stock counts." },
        { icon: "💰", title: "Finished Costing", desc: "Calculate exact cost per unit based on input rates and overheads." },
        { icon: "⛓️", title: "Pipeline Tracking", desc: "Approve production orders and monitor floor stage transitions." }
      ]
    }
  ];

  const faqs = [
    {
      q: "Can I upgrade or downgrade my plan at any time?",
      a: "Yes! EasyBMT is completely flexible. You can upgrade, downgrade, or cancel your plan at any time directly from your billing portal. Charges will be prorated automatically."
    },
    {
      q: "Will I get a proper GST invoice for my subscription payment?",
      a: "Absolutely! We issue 100% GST-compliant B2B invoices for all subscription purchases so you can easily claim your input tax credit (ITC)."
    },
    {
      q: "Which payment methods do you accept?",
      a: "We accept all major payment modes including UPI, Credit & Debit Cards, Net Banking, and popular wallets via our secure Razorpay integration."
    },
    {
      q: "Is my business data secure on EasyBMT?",
      a: "Data security is our top priority. EasyBMT uses bank-grade AES-256 encryption at rest and in transit. Your database is isolated, and auto-backups are processed daily on secure cloud infrastructure."
    },
    {
      q: "Can I use the app offline when the internet is unstable?",
      a: "Yes! Our mobile and desktop client applications feature high-fidelity offline caching, allowing you to create invoices, search products, and record bills offline. Data is auto-synced the moment you get back online."
    },
    {
      q: "Do you charge extra for e-waybills or WhatsApp sharing?",
      a: "No, there are no hidden fees. E-waybill generation and WhatsApp messaging are completely integrated and included in your standard plan quotas."
    }
  ];

  const currentTab = featureTabs.find(t => t.id === activeFeatureTab) || featureTabs[0];

  return (
    <div className="landing-page">
      <SEO 
        title="EasyBMT — GST Billing, Dual-POS & Business Management Software" 
        description="India's leading business management software for modern counters. Generate GST invoices, print barcode labels, track inventory, execute fast POS billing, handle double-entry accounting ledgers, and view real-time Profit & Loss reports. Perfect for retail shops, supermarkets, fashion hubs, and distributors." 
        withSchema={true}
      />

      {/* NAV */}
      <nav className="landing-nav">
        <Link to="/" className="nav-logo">
          <img src="/site_logo.png" alt="EasyBMT Site Logo" className="landing-site-logo" />
        </Link>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#modules">ERP Modules</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-right flex items-center gap-3">
          <a 
            href="https://wa.me/919801200459" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center transition-all hover:scale-110 active:scale-95 mr-2"
          >
            <svg className="w-8 h-8 md:w-9 md:h-9 fill-[#25D366] hover:fill-[#20ba56] transition-colors" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-4.655c1.667.988 3.536 1.509 5.44 1.51h.005c5.447 0 9.878-4.427 9.882-9.875.002-2.639-1.02-5.12-2.881-6.983C17.472 2.133 15.001.993 12.01.993c-5.452 0-9.887 4.434-9.89 9.885-.001 1.942.5 3.826 1.455 5.503L2.512 21.147l4.38-1.802zm12.822-6.09c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
          </a>
          <Link to="/login" className="btn-ghost">Login</Link>
          <Link to="/register" className="btn-cta">Start Free Trial →</Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile Navigation Panel */}
      <div className={`mobile-nav-panel ${isMobileMenuOpen ? "active" : ""}`}>
        <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
        <a href="#modules" onClick={() => setIsMobileMenuOpen(false)}>ERP Modules</a>
        <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
        <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>FAQ</a>
        <div className="px-6 py-2">
          <a 
            href="https://wa.me/919801200459" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-4.655c1.667.988 3.536 1.509 5.44 1.51h.005c5.447 0 9.878-4.427 9.882-9.875.002-2.639-1.02-5.12-2.881-6.983C17.472 2.133 15.001.993 12.01.993c-5.452 0-9.887 4.434-9.89 9.885-.001 1.942.5 3.826 1.455 5.503L2.512 21.147l4.38-1.802zm12.822-6.09c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
            <span>WhatsApp Support</span>
          </a>
        </div>
        <div className="mobile-btns">
          <Link to="/login" className="btn-ghost" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
          <Link to="/register" className="btn-cta" onClick={() => setIsMobileMenuOpen(false)}>Start Free Trial →</Link>
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-blob1"></div>
        <div className="hero-blob2"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <div className="badge-ping"></div>
              <span>India's #1 GST Billing Platform</span>
            </div>

            <h1>Smart billing<br />for <em>every</em> Indian<br />business.</h1>

            <p className="hero-desc">
              GST invoicing, Quick POS, inventory, e-waybills, finance hub, and AI-powered insights — all in one platform. Built for Bharat.
            </p>

            <div className="hero-btns">
              <Link to="/register" className="btn-hero-primary">
                🚀 Start Free Trial
              </Link>
              <a href="#features" className="btn-hero-secondary">
                See All Features →
              </a>
            </div>

            <div className="hero-trust">
              <div className="trust-item">
                <span style={{ color: "var(--green)", fontSize: "16px" }}>✓</span>
                <span>14-day free trial</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span style={{ color: "var(--green)", fontSize: "16px" }}>✓</span>
                <span>No credit card needed</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <span style={{ color: "var(--green)", fontSize: "16px" }}>✓</span>
                <span>100% GST compliant</span>
              </div>
            </div>
          </div>

          {/* REAL Dashboard Screenshot Browser Mockup Frame */}
          <div className="hero-right">
            <div className="dash-wrap">
              <div className="hero-badges-flex">
                {/* Floating badge left */}
                <div className="float-badge fb1">
                  <div className="fb-icon" style={{ background: "rgba(5,150,105,0.1)" }}>📈</div>
                  <div className="fb-text">
                    <strong>Net Profit</strong>
                    <span>₹34,36,242.96 this month</span>
                  </div>
                </div>

                {/* Floating badge right */}
                <div className="float-badge fb2">
                  <div className="fb-icon" style={{ background: "rgba(245,158,11,0.1)" }}>🤖</div>
                  <div className="fb-text">
                    <strong>AI Insight</strong>
                    <span>Revenue up 12% forecast</span>
                  </div>
                </div>
              </div>

              <div className="browser-frame">
                <div className="browser-header">
                  <div className="browser-dots"><span></span><span></span><span></span></div>
                  <div className="browser-address">app.easybmt.com/dashboard</div>
                </div>
                <div className="browser-screen">
                  <img src="/main_dashboard.png" alt="EasyBMT Enterprise Dashboard" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO STRIP */}
      <div className="logo-strip">
        <div className="logo-strip-inner">
          <span className="ls-label">Trusted by businesses across</span>
          <div className="ls-items">
            <span className="ls-item">🏪 Retail Shops</span>
            <span className="ls-item">🍽️ Restaurants</span>
            <span className="ls-item">🏭 Distributors</span>
            <span className="ls-item">👗 Textile Wholesale</span>
            <span className="ls-item">💊 Pharma</span>
            <span className="ls-item">🛒 Kirana Stores</span>
            <span className="ls-item">🔧 Service Businesses</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE FEATURES MATRIX SHOWCASE */}
      <section className="sec features-sec" id="features">
        <div className="sec-inner">
          <div className="sec-tag">Why EasyBMT</div>
          <h2>India's Complete <em>Business ERP</em> Ecosystem</h2>
          <p className="sec-sub">
            Say goodbye to single-purpose applications. Explore our massive suite of modules designed for absolute growth.
          </p>

          {/* Interactive tabs */}
          <div className="features-tabs">
            {featureTabs.map(tab => (
              <button
                key={tab.id}
                className={`feature-tab-btn ${activeFeatureTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveFeatureTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Showcase panel grid */}
          <div className="feature-showcase-panel">
            <div className="panel-left">
              <h3 dangerouslySetInnerHTML={{ __html: currentTab.title }} />
              <p>{currentTab.description}</p>
              <ul className="panel-bullets">
                {currentTab.bullets.map((bullet, index) => (
                  <li key={index}>
                    <span className="bullet-check">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="panel-right">
              {currentTab.showScreenshot ? (
                /* ACTUAL Financial Statement Screenshot Showcase card with tabs switcher */
                <div className="screenshot-frame">
                  <div className="screenshot-selector-bar">
                    <button 
                      className={`screenshot-sel-btn ${selectedErpScreen === "pl" ? "active" : ""}`}
                      onClick={() => setSelectedErpScreen("pl")}
                    >
                      P&amp;L Income Statement
                    </button>
                    <button 
                      className={`screenshot-sel-btn ${selectedErpScreen === "bs" ? "active" : ""}`}
                      onClick={() => setSelectedErpScreen("bs")}
                    >
                      Balance Sheet Ledger
                    </button>
                  </div>
                  <div style={{ background: "#FFF", padding: "8px" }}>
                    <img 
                      src={selectedErpScreen === "pl" ? "/pl_statement.png" : "/balance_sheet.png"} 
                      alt="EasyBMT Financial Ledger Mockup"
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
                    />
                  </div>
                </div>
              ) : (
                /* Standard Mini Features cards list */
                currentTab.panelCards.map((card, index) => (
                  <div key={index} className="mini-feature-card">
                    <div className="mini-feat-icon">{card.icon}</div>
                    <div className="mini-feat-title">{card.title}</div>
                    <div className="mini-feat-desc">{card.desc}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="w-full !py-16 bg-[#FAFAFC] dark:bg-[#0B0B0F] border-y border-[#E8E8EE] dark:border-white/10">
        <div className="max-w-[1240px] !mx-auto !px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 !gap-4 md:!gap-6">
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 !p-5 md:!p-6 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex flex-col justify-center items-start overflow-hidden">
              <h3 className="text-3xl xl:text-4xl font-black text-[#111118] dark:text-white transition-colors duration-300">10K<span className="text-[#E8721C]">+</span></h3>
              <p className="text-[#7A7A8C] dark:text-white/60 text-xs sm:text-sm font-medium !mt-1.5 transition-colors duration-300">Businesses Onboarded</p>
            </div>
            
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 !p-5 md:!p-6 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex flex-col justify-center items-start overflow-hidden">
              <h3 className="text-3xl xl:text-4xl font-black text-[#111118] dark:text-white transition-colors duration-300">₹1000Cr<span className="text-[#E8721C]">+</span></h3>
              <p className="text-[#7A7A8C] dark:text-white/60 text-xs sm:text-sm font-medium !mt-1.5 transition-colors duration-300">Billed Monthly</p>
            </div>
            
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 !p-5 md:!p-6 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex flex-col justify-center items-start overflow-hidden">
              <h3 className="text-3xl xl:text-4xl font-black text-[#111118] dark:text-white transition-colors duration-300">99.9<span className="text-[#E8721C]">%</span></h3>
              <p className="text-[#7A7A8C] dark:text-white/60 text-xs sm:text-sm font-medium !mt-1.5 transition-colors duration-300">Platform Uptime</p>
            </div>
            
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 !p-5 md:!p-6 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none flex flex-col justify-center items-start overflow-hidden">
              <div className="flex flex-wrap items-center !gap-1.5 md:!gap-2">
                <h3 className="text-3xl xl:text-4xl font-black text-[#111118] dark:text-white transition-colors duration-300">4.9</h3>
                <div className="flex !gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 md:w-5 md:h-5 text-[#E8721C] fill-[#E8721C]" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-[#7A7A8C] dark:text-white/60 text-xs sm:text-sm font-medium !mt-1.5 transition-colors duration-300">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="sec hiw-sec" id="how-it-works">
        <div className="sec-inner">
          <div className="sec-tag">How It Works</div>
          <h2>Up and running in <em>minutes</em></h2>
          <p className="sec-sub">No complex setup. No accountant required on day one. Just sign up and start billing.</p>
          <div className="hiw-steps">
            <div className="hiw-step">
              <div className="hiw-num">1</div>
              <div className="hiw-title">Create Account</div>
              <div className="hiw-desc">Sign up free with your GSTIN. Business profile auto-populated from GST database.</div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">2</div>
              <div className="hiw-title">Add Products</div>
              <div className="hiw-desc">Import your product catalogue with HSN codes, GST rates, and opening stock.</div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">3</div>
              <div className="hiw-title">Start Billing</div>
              <div className="hiw-desc">Create GST invoices, share via WhatsApp or email, accept payments instantly.</div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">4</div>
              <div className="hiw-title">Track Business</div>
              <div className="hiw-desc">Real-time dashboard shows revenue, profit, GST liability, and AI predictions.</div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">5</div>
              <div className="hiw-title">File GST Returns</div>
              <div className="hiw-desc">One-click GSTR-1 & GSTR-3B. No data entry errors, no missed deadlines.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec pricing-sec" id="pricing">
        <div className="sec-inner">
          <div className="sec-tag">Pricing Plans</div>
          <h2>Simple, <em>transparent</em> pricing</h2>
          <p className="sec-sub">No hidden charges. No per-invoice fees. One flat subscription for unlimited growth.</p>

          <div className="flex justify-center !mb-10">
            <div className="inline-flex items-center gap-1 bg-secondary rounded-full !p-1.5 !mt-6">
              <button onClick={() => setBilling("monthly")}
                className={cn("!px-6 !h-10 rounded-full text-sm font-bold transition-all flex items-center justify-center", billing === "monthly" ? "bg-primary text-black" : "text-muted-foreground")}>
                Monthly
              </button>
              <button onClick={() => setBilling("yearly")}
                className={cn("!px-6 !h-10 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2", billing === "yearly" ? "bg-primary text-black" : "text-muted-foreground")}>
                Yearly <span className="text-[10px] bg-success/20 text-success !px-2 !py-0.5 rounded-full font-extrabold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8 xl:gap-y-5 !mt-8">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const finalPrice = plan.price > 0 ? Math.round(plan.price * (1 - discount)) : 0;
              return (
                <div key={plan.id} className={cn(
                  "relative bg-card border rounded-2xl !p-6 flex flex-col gap-4 transition-all duration-300 text-left !overflow-visible",
                  plan.border,
                  plan.highlighted && "ring-2 ring-primary/40 shadow-[0_0_32px_hsla(36,90%,55%,0.12)] scale-[1.01]"
                )}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                      <span className={cn("!px-4 !py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow-sm",
                        plan.highlighted ? "gold-gradient text-black" : "!bg-white !text-[#7C3AED] border !border-[#7C3AED]/30"
                      )}>{plan.badge}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", plan.highlighted ? "gold-gradient" : "bg-secondary")}>
                      <Icon className={cn("w-6 h-6", plan.highlighted ? "text-black" : plan.color)} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg !m-0 !p-0 text-foreground !pb-1">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground !m-0 !p-0">{plan.description}</p>
                    </div>
                  </div>

                  <div className="!mt-2 !mb-2 relative">
                    <div className="absolute -right-2 -top-2 rotate-[15deg] bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-md border border-red-700/50 z-10">
                      {plan.stamp}
                    </div>
                    {plan.price === 0 ? (
                      <div className="text-4xl font-black text-foreground">FREE</div>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-foreground">₹{finalPrice.toLocaleString("en-IN")}</span>
                        <span className="text-muted-foreground text-sm !pb-1">/{plan.period}</span>
                      </div>
                    )}
                    {billing === "yearly" && plan.price > 0 && (
                      <p className="text-[11px] text-muted-foreground line-through !mt-1">₹{plan.price.toLocaleString("en-IN")}/month</p>
                    )}
                  </div>

                  <ul className="flex flex-col gap-3 flex-1 !m-0 !p-0 list-none">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm !m-0 !p-0 before:hidden">
                        <Check className="w-4 h-4 text-success shrink-0 !mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick(plan)}
                    className={cn("w-full font-bold text-center !py-3 !px-4 rounded-xl transition-colors !mt-4 block", plan.ctaClass)}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-2xl !p-6 !mt-8 text-left">
            <h3 className="font-bold text-base !mb-5 !m-0 !p-0 text-foreground">🔒 All Plans Include</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {["GST Compliant Invoices", "Secure Data Storage", "Mobile App Access", "Email Support", "Auto Backup", "Data Export", "Email OTP Verification", "Regular Updates"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-success shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sec testi-sec" id="testimonials">
        <div className="sec-inner">
          <div className="sec-tag">Customer Stories</div>
          <h2>Loved by businesses <em>across India</em></h2>
          <div className="testi-grid">
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">"EasyBMT transformed how we handle billing. The GST filing alone saved us 8 hours every month. The AI insights flag things I'd never notice — like payment patterns and risk alerts."</div>
              <div className="testi-author">
                <div className="ta-ava" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber-dark)" }}>RK</div>
                <div><div className="ta-name">Rajesh Kumar</div><div className="ta-biz">Textile Wholesale, Surat</div></div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">"We manage 4 outlets from one screen. Branch-wise P&L, consolidated GST, stock transfers — it's like having a full ERP at a fraction of the cost. Game changer."</div>
              <div className="testi-author">
                <div className="ta-ava" style={{ background: "rgba(59,130,246,0.15)", color: "var(--blue-dark)" }}>PS</div>
                <div><div className="ta-name">Priya Sharma</div><div className="ta-biz">Electronics Retail, Delhi</div></div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">"The Quick POS is blazing fast. 300+ transactions per day at our restaurant without lag. Setup took 20 minutes and the WhatsApp invoice sharing is a big hit with customers."</div>
              <div className="testi-author">
                <div className="ta-ava" style={{ background: "rgba(5,150,105,0.15)", color: "var(--green)" }}>AM</div>
                <div><div className="ta-name">Anand Mehta</div><div className="ta-biz">Restaurant Chain, Mumbai</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec faq-sec" id="faq">
        <div className="sec-inner">
          <div className="sec-tag">FAQ</div>
          <h2>Frequently Asked <em>Questions</em></h2>
          <p className="sec-sub">Everything you need to know about our subscription plans, compliance, security, and offline support.</p>
          
          <div className="faq-grid">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className={`faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => handleFaqToggle(i)}
              >
                <div className="faq-q">
                  <span>{faq.q}</span>
                  <span className="faq-arrow">▶</span>
                </div>
                <div className="faq-a">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GOOGLE FIREBASE DATA LOCKER BANNER (LIGHT PREMIUM THEME) */}
      <section className="w-full !py-16 bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#F1F5F9] text-slate-900 border-y border-[#E2E8F0] relative overflow-hidden text-left transition-colors duration-300">
        {/* Subtle decorative glowing background shapes */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFCA28]/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0284C7]/8 rounded-full blur-[120px] pointer-events-none -translate-x-1/4 translate-y-1/3"></div>
        
        <div className="max-w-[1240px] !mx-auto !px-6 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left max-w-3xl">
            {/* Locker SVG Icon with golden/blue glow */}
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-[#0284C7]/10 border border-[#0284C7]/20 flex items-center justify-center shadow-md relative animate-pulse">
              <svg className="w-8 h-8 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="absolute -top-1.5 -right-1.5 bg-[#FF5252] text-[9px] font-black text-white px-1.5 py-0.5 rounded-full border border-white shadow">
                100% SAFE
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#F57C00] bg-[#FFCA28]/20 px-2.5 py-1 rounded-md">Enterprise Security</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-[#0284C7] bg-[#0284C7]/15 px-2.5 py-1 rounded-md">Real-Time Isolation</span>
              </div>
              {/* Force text-slate-900 using !important-style prefix to override global h2 color */}
              <h2 className="text-2xl md:text-3xl font-black tracking-tight !text-[#0F172A] !m-0 !p-0 leading-tight">
                Your Data is 100% Protected inside <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F57C00] to-[#E65100] font-black">Google Firebase</span> Cloud Vault
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed !m-0 !p-0 !mt-2">
                We prioritize your financial records security above all else. EasyBMT is backed by <strong>Google Firebase Secure Servers</strong>. Every tax invoice generated, stock count logged, and journal ledger entered is instantly encrypted and replicated across Google’s highly resilient, military-grade cloud architecture.
              </p>
            </div>
          </div>
          
          {/* Card: High Contrast Light Mode Glass Box */}
          <div className="flex flex-col items-center gap-4 bg-white border border-[#E2E8F0] !p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 w-full lg:w-auto shrink-0 max-w-sm hover:-translate-y-1">
            <div className="flex items-center gap-3">
              {/* Firebase Vector Icon */}
              <svg className="w-8 h-8 fill-none" viewBox="0 0 24 24">
                <path d="M3.89 19.3L12 .45l8.11 18.85L12 23.55 3.89 19.3z" fill="#0284C7" opacity="0.1" />
                <path d="M20.07 18.93L12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01l7.8-1.2c.15-.02.23-.19.17-.331z" fill="#FFCA28" />
                <path d="M12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01V.45z" fill="#F57C00" />
                <path d="M17.43 19.31l-5.18-9.82c-.08-.15-.3-.15-.38 0L9.04 14.8l-2.61-4.99c-.08-.16-.31-.16-.39.01L3.9 19.31c-.06.13.04.28.18.27l13.16-1c.15-.01.24-.16.19-.27z" fill="#FF5252" />
              </svg>
              <div className="text-left">
                <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest leading-none">Security Infrastructure</div>
                <div className="text-lg font-black text-slate-900 leading-tight">Google Firebase</div>
              </div>
            </div>
            <div className="w-full h-px bg-slate-200 my-1"></div>
            <ul className="text-xs text-slate-600 space-y-2.5 list-none !m-0 !p-0 w-full text-left">
              <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> 256-bit SSL Database Partitioning</li>
              <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> Automatic Real-Time Database Isolation</li>
              <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> 99.9% Uptime with Auto Failover Recovery</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <h2>Ready to scale your business operations?</h2>
        <p>Start your 14-day premium free trial today. Join thousands of smart business owners across India who trust EasyBMT for complete compliance and billing.</p>
        <div className="cta-btns">
          <Link to="/register" className="btn-hero-primary" style={{ fontSize: "16px", padding: "16px 36px" }}>
            🚀 Start Free Trial Now
          </Link>
          <Link to="/login" className="btn-hero-secondary" style={{ fontSize: "16px", padding: "16px 36px" }}>
            Sign In to Dashboard →
          </Link>
        </div>
        <div className="cta-note">
          <span>✓ No Credit Card Required</span> &nbsp; • &nbsp; <span>✓ Setup in Under 5 Minutes</span> &nbsp; • &nbsp; <span>✓ 100% Tax Compliant</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="fl">EasyBMT</div>
          <p>India's leading smart GST billing, fast POS, and enterprise-grade ERP dashboard designed completely for Indian shops, kiranas, and businesses.</p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#features">ERP Modules</a></li>
            <li><a href="#pricing">Pricing Plans</a></li>
            <li><Link to="/register">Free Trial</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="mailto:support@easybmt.com">Support Helpline</a></li>
            <li><Link to="/register">Partner Program</Link></li>
            <li><Link to="/login">Client Portal</Link></li>
          </ul>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} EasyBMT Business Management Tool. All rights reserved.</span>
        <span>Made in ❤️ india</span>
      </div>
      
      <OfferDialog 
        isOpen={offerPopup.isOpen}
        planName={offerPopup.planName}
        onClose={() => setOfferPopup({ isOpen: false, planName: "" })}
        onProceed={() => navigate("/register")}
      />
    </div>
  );
}
