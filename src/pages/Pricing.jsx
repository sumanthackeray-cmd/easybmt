import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Zap, Star, Building2, Gift, Crown, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SEO from "@/components/SEO";
import confetti from "canvas-confetti";
import OfferDialog from "@/components/subscription/OfferDialog";

import siteLogo from "../../assets/site_logo.png";

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
    cta: "Get Started", ctaClass: "bg-info text-white hover:bg-info/90",
    stamp: "3 Months Completely Free"
  },
  {
    id: "professional", name: "Professional", price: 999, period: "month", icon: Star,
    color: "text-primary", border: "border-primary/40", badge: "Most Popular & Offer",
    description: "For growing businesses & distributors",
    features: ["Unlimited invoices", "Multi-user (5 users)", "AI Insights & Analytics", "Custom branding & logo", "Cloud backup", "Priority support", "GSTR-1/3B reports"],
    cta: "Go Professional", ctaClass: "gold-gradient text-black font-black",
    highlighted: true,
    stamp: "3 Months Completely Free"
  },
  {
    id: "enterprise", name: "Enterprise", price: 2499, period: "month", icon: Building2,
    color: "text-purple", border: "border-purple/30", badge: "Best Value & Offer",
    description: "For large enterprises & multi-branch",
    features: ["Everything in Professional", "Multi-branch support", "Unlimited users", "AI automation", "API access", "Dedicated account manager"],
    cta: "Contact Sales", ctaClass: "bg-purple text-white hover:bg-purple/90",
    stamp: "3 Months Completely Free"
  },
];

const FAQS = [
  { q: "Can I upgrade or downgrade?", a: "Yes, anytime. Charges are prorated." },
  { q: "GST invoice for subscription?", a: "Yes, GST-compliant invoice for every payment." },
  { q: "Payment methods accepted?", a: "UPI, Credit/Debit cards, Net Banking via Razorpay." },
  { q: "Is my data safe?", a: "Yes, AES-256 encryption with isolated storage per business." },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);
  const [offerPopup, setOfferPopup] = useState({ isOpen: false, planName: "" });

  const handleSubscribeClick = (plan) => {
    if (plan.price === 0) {
      navigate("/register");
      return;
    }
    setOfferPopup({ isOpen: true, planName: plan.name });
  };

  React.useEffect(() => {
    // Flower rain on pricing visit
    const end = Date.now() + 2 * 1000;
    const colors = ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7'];
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 1000 });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 1000 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const discount = billing === "yearly" ? 0.2 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white pb-16">
      <SEO title="Pricing - EasyBMT" description="Simple, transparent pricing for all business sizes. Start your 14-day free trial today." />
      
      {/* Navigation Header */}
      <nav className="flex items-center justify-between py-4 px-6 md:px-12 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={siteLogo} alt="EasyBMT Logo" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="text-sm font-bold bg-primary text-black px-4 py-2 rounded-lg shadow-md hover:bg-primary/90 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">EasyBMT Plans</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Choose Your <span className="gold-text">Plan</span></h1>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">Transparent pricing, no hidden fees. All features you need to manage your business efficiently.</p>
          <div className="inline-flex items-center gap-1 bg-secondary rounded-full p-1 mt-8">
            <button onClick={() => setBilling("monthly")}
              className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", billing === "monthly" ? "bg-primary text-black shadow-md" : "text-muted-foreground hover:text-foreground")}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")}
              className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2", billing === "yearly" ? "bg-primary text-black shadow-md" : "text-muted-foreground hover:text-foreground")}>
              Yearly <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded-full font-extrabold">-20%</span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const finalPrice = plan.price > 0 ? Math.round(plan.price * (1 - discount)) : 0;
            return (
              <div key={plan.id} className={cn(
                "relative bg-card border rounded-2xl p-6 flex flex-col gap-6 transition-all duration-300 hover:shadow-xl",
                plan.border,
                plan.highlighted && "ring-2 ring-primary/50 shadow-[0_8px_30px_hsla(36,90%,55%,0.15)] scale-[1.02] md:-translate-y-2"
              )}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className={cn("px-4 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow-sm",
                      plan.highlighted ? "gold-gradient text-black" : "bg-primary/20 text-primary border border-primary/30"
                    )}>{plan.badge}</span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", plan.highlighted ? "gold-gradient" : "bg-secondary")}>
                    <Icon className={cn("w-6 h-6", plan.highlighted ? "text-black" : plan.color)} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>
                </div>

                <div className="py-2 border-b border-border/50 relative">
                  <div className="absolute -right-2 -top-4 rotate-[15deg] bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md border border-red-700/50 z-10">
                    {plan.stamp}
                  </div>
                  {plan.price === 0 ? (
                    <div className="text-4xl font-black">FREE</div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black">₹{finalPrice.toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground text-sm pb-1.5">/{plan.period}</span>
                    </div>
                  )}
                  {billing === "yearly" && plan.price > 0 && (
                    <p className="text-[12px] text-muted-foreground line-through mt-1">₹{plan.price.toLocaleString("en-IN")}/month</p>
                  )}
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px]">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-medium">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn("w-full py-6 font-bold text-[15px] shadow-sm", plan.ctaClass)}
                  onClick={() => handleSubscribeClick(plan)}
                >
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* All plans include */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-black text-lg mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" /> 
              All Plans Include
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              {["GST Compliant Invoices", "Secure Data Storage", "Mobile App Access", "Email Support", "Auto Backup", "Data Export", "OTP Login", "Regular Updates"].map(f => (
                <div key={f} className="flex items-center gap-3 text-[13px] text-muted-foreground font-medium">
                  <Check className="w-4 h-4 text-primary shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h3 className="font-black text-lg mb-2">Frequently Asked Questions</h3>
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-bold hover:bg-secondary/50 transition-colors">
                  {faq.q}
                  <span className="text-primary font-black text-xl ml-4">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-[13px] text-muted-foreground leading-relaxed font-medium">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-primary/10 border border-primary/20 rounded-2xl p-8 text-center shadow-inner">
          <h2 className="font-black text-2xl mb-2">Still not sure? <span className="gold-text">Try Free for 14 Days</span></h2>
          <p className="text-muted-foreground text-base mb-6 max-w-md mx-auto">No credit card required. Get full access to all Professional features and see if EasyBMT is right for you.</p>
          <Button onClick={() => navigate("/register")} className="gold-gradient text-black font-black px-8 py-6 text-lg shadow-lg hover:scale-105 transition-transform">
            Start Free Trial Now
          </Button>
          <p className="mt-4 text-xs text-muted-foreground font-medium">Trusted by over 50,000 businesses across India.</p>
        </div>
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
