import React from "react";
import { Link } from "react-router-dom";
import { Compass, Target, Shield, Zap, Award, Users, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import siteLogo from "../../assets/site_logo.png";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-primary/30">
      <SEO 
        title="About Us - EasyBMT" 
        description="Learn more about EasyBMT's vision, mission, and the smart company behind India's leading GST billing and POS management tool." 
      />

      {/* Modern Header */}
      <header className="w-full py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={siteLogo} alt="EasyBMT Logo" className="h-8 w-auto object-contain" />
        </Link>
        <Link to="/" className="text-sm font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-success/5 pt-20 pb-24 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-5xl mx-auto text-center z-10 relative">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-full mb-6 inline-block">
            Our Story & Legacy
          </span>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            Pioneering the Operating System for <br className="hidden md:block"/>
            <span className="text-primary drop-shadow-sm">Modern Businesses</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
            EasyBMT is built with a singular dedication: to empower retail merchants, distributors, and enterprise business owners with secure, lightning-fast, and tax-compliant software.
          </p>
        </div>
      </div>

      {/* Vision & Mission Row */}
      <div className="max-w-6xl mx-auto px-6 py-12 w-full z-10 relative -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vision Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Compass className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Our Vision</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">
                To design the future of business management in India. We envision a retail landscape where every store, vendor, and wholesale distributor is powered by intelligent, secure cloud technology that operates seamlessly, eliminates tedious administrative overheads, and keeps them competitive in a fast-evolving digital world.
              </p>
            </div>
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Future-Proof Ecosystem</span>
            </div>
          </div>

          {/* Mission Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-success/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-success/10 dark:bg-success/20 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Our Mission</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">
                To build high-performance, accessible, and compliant business tools. We strive to simplify invoicing, inventory syncing, and financial ledger accounting through secure automated technology. By harnessing Google Cloud and real-time syncing, we remove the technical friction, ensuring operations never stop.
              </p>
            </div>
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Zero Complexity, High Growth</span>
            </div>
          </div>

        </div>
      </div>

      {/* Philosophy / Who We Are */}
      <div className="bg-white dark:bg-[#0E1422] border-t border-b border-slate-200 dark:border-slate-800/60 py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-full inline-block">
              Why We Exist
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              A Complete Operating Suite Built by Operators, for Smart Operators
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              We realized that traditional ERP and billing systems are either overly complex, painfully slow, or lacked real security. Shop owners in India spent more time battling spreadsheets than building relationships with their customers.
            </p>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              We created EasyBMT to change that forever. With sub-100ms loading speeds, real-time Google Firebase data isolation, advanced barcode systems, automated GST calculations, and multi-branch management, we give you the tools of retail giants in an interface that is extremely intuitive.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">100% Tax Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Google Cloud Vault</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Offline Resilience</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-black text-primary mb-1">10k+</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Merchants</div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Powering everyday transactions in India.</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-black text-success mb-1">4.9/5</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Merchant Rating</div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Loved for its speed, simplicity, and support.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-black text-blue-500 mb-1">100ms</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Dual-Mode POS</div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Incredibly fast, offline-first barcode scanning.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-black text-[#7C3AED] mb-1">99.9%</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Uptime SLA</div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Guaranteed real-time sync with Google Firebase.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Core Values Section */}
      <div className="max-w-6xl mx-auto px-6 py-24 w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-full mb-4 inline-block">
            Our Foundation
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Values That Guide Us</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">
            We are dedicated to building a high-fidelity environment that helps your business thrive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-slate-200/10 dark:shadow-none hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Absolute Security</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Google Firebase servers ensure your invoices and critical stock numbers remain safe, partitioned, and private.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-slate-200/10 dark:shadow-none hover:shadow-yellow-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Uncompromised Speed</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Vite-powered modules load under 100ms, enabling you to check out queues at lightning speed.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-slate-200/10 dark:shadow-none hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Merchant Centricity</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Every single feature is shaped by actual merchant feedback, ensuring practical layouts and real-world tools.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md shadow-slate-200/10 dark:shadow-none hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Seamless Compliance</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Automated ledger reports, GSTR filing formats, and GST-compliant custom bills take the worry out of taxation.
            </p>
          </div>

        </div>
      </div>

      {/* CTA section */}
      <div className="bg-gradient-to-br from-primary/10 to-[#7C3AED]/10 border-t border-slate-200 dark:border-slate-800 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-black tracking-tight">Ready to see it in action?</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Join thousands of smart retailers across India who have transformed their sales, POS, and stock management.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Button asChild size="lg" className="gold-gradient text-black font-black hover:opacity-90 shadow-lg px-8">
              <Link to="/register">
                Start 14-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="w-full py-8 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-[#070A12]">
        <span>© {new Date().getFullYear()} EasyBMT Business Management Tool. All rights reserved.</span>
      </footer>
    </div>
  );
}
