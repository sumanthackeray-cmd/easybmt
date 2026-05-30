import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from "react-router-dom";
import siteLogo from "../../assets/site_logo.png";

export default function PrivacyPolicy() {
  return (
    <>
      <style>{`
        :root {
          --primary: #F97316;
          --primary-dark: #EA580C;
          --bg: #F8FAFC;
          --card: #FFFFFF;
          --text: #0F172A;
          --muted: #64748B;
          --border: #E2E8F0;
          --success: #10B981;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        .privacy-page {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.8;
          min-height: 100vh;
        }
        
        .privacy-container {
          width: 100%;
          max-width: 1100px;
          margin: auto;
          padding: 50px 20px 100px;
        }
        
        /* HEADER */
        .hero {
          background: linear-gradient(135deg, #fff7ed, #ffffff);
          border: 1px solid #fed7aa;
          border-radius: 28px;
          padding: 50px;
          margin-bottom: 40px;
          position: relative;
          overflow: hidden;
        }
        
        .hero::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: rgba(249, 115, 22, 0.08);
          border-radius: 50%;
          top: -100px;
          right: -100px;
        }
        
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
        }
        
        .brand h1 {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
        }
        
        .policy-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #fed7aa;
          color: var(--primary-dark);
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 18px;
        }
        
        .hero h2 {
          font-size: 52px;
          line-height: 1.1;
          font-weight: 800;
          margin-bottom: 20px;
          max-width: 700px;
        }
        
        .hero h2 span {
          color: var(--primary);
        }
        
        .hero p {
          max-width: 780px;
          font-size: 18px;
          color: var(--muted);
          margin: 0;
        }
        
        .last-update {
          margin-top: 28px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .tag {
          background: #fff;
          border: 1px solid var(--border);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
        
        /* TOC */
        .toc {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 35px;
          margin-bottom: 40px;
        }
        
        .toc h3 {
          font-size: 18px;
          margin-bottom: 20px;
          font-weight: 700;
        }
        
        .toc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 14px;
        }
        
        .toc a {
          text-decoration: none;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 14px 16px;
          border-radius: 14px;
          color: #334155;
          transition: .2s;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .toc a:hover {
          border-color: #fdba74;
          transform: translateY(-2px);
        }
        
        /* SECTIONS */
        .section {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 28px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 22px;
        }
        
        .section-number {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fb923c, #f97316);
          color: #fff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .section h2 {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
        }
        
        .section p {
          color: #475569;
          margin-bottom: 16px;
        }
        
        .section ul {
          margin-top: 18px;
          padding-left: 0;
        }
        
        .section ul li {
          list-style: none;
          padding: 14px 0 14px 28px;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
          color: #475569;
          margin: 0;
        }
        
        .section ul li::before {
          content: '';
          width: 10px;
          height: 10px;
          background: var(--primary);
          border-radius: 50%;
          position: absolute;
          left: 0;
          top: 22px;
        }
        
        .notice {
          background: #fff7ed;
          border: 1px solid #fdba74;
          border-left: 5px solid var(--primary);
          padding: 22px;
          border-radius: 16px;
          margin-top: 20px;
        }
        
        .notice strong {
          color: #c2410c;
        }
        
        /* CONTACT */
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        
        .contact-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
        }
        
        .contact-card span {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          font-weight: 700;
          display: block;
          margin-bottom: 10px;
        }
        
        .contact-card a {
          color: var(--primary-dark);
          font-weight: 700;
          text-decoration: none;
        }
        
        /* FOOTER */
        .footer {
          text-align: center;
          margin-top: 60px;
          color: #94a3b8;
          font-size: 14px;
        }
        
        /* MOBILE */
        @media(max-width: 768px) {
          .hero {
            padding: 30px;
          }
          .hero h2 {
            font-size: 36px;
          }
          .section {
            padding: 28px;
          }
        }
      `}</style>

      <div className="privacy-page dark:bg-[#0B0B0F] dark:text-[#D1D1E0]">

        {/* Self-contained sticky header — same as Contact/About pages */}
        <header className="w-full py-3 px-4 md:px-10 flex items-center justify-between sticky top-0 z-50 bg-white/90 dark:bg-[#0B0B0F]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <img src={siteLogo} alt="EasyBMT" className="h-7 w-auto object-contain" />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="/#features" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="/#modules" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">ERP Modules</a>
            <a href="/#pricing" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="/#faq" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Right buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://wa.me/919801200459"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              title="WhatsApp Support"
            >
              <svg className="w-7 h-7 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-4.655c1.667.988 3.536 1.509 5.44 1.51h.005c5.447 0 9.878-4.427 9.882-9.875.002-2.639-1.02-5.12-2.881-6.983C17.472 2.133 15.001.993 12.01.993c-5.452 0-9.887 4.434-9.89 9.885-.001 1.942.5 3.826 1.455 5.503L2.512 21.147l4.38-1.802zm12.822-6.09c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </a>
            <Link to="/login" className="hidden sm:inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors bg-white dark:bg-transparent">Login</Link>
            <Link to="/register" className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm shadow-amber-200 dark:shadow-none">Free Trial →</Link>
          </div>
        </header>

        <div className="privacy-container">
          {/* HERO */}
          {/* HERO */}
          <div className="bg-gradient-to-br from-[#fff7ed] to-[#ffffff] dark:from-[#111118] dark:to-[#111118] border border-[#fed7aa] dark:border-[#2A2A3A] flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden py-12 md:py-20 px-6 md:px-12 lg:px-16 rounded-[32px] mb-12 shadow-sm">
            
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E8721C]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#E8721C]/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
            
            <div className="relative z-10 w-full lg:w-[60%]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-[14px] bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center shadow-lg shadow-[#E8721C]/20 shrink-0">
                  <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#111118] dark:text-white tracking-tight">EasyBMT</h1>
              </div>

              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#1A1A28] border border-[#fed7aa] dark:border-[#2A2A3A] text-[#EA580C] dark:text-[#E8721C] px-4 py-2 rounded-full text-sm font-bold mb-6 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                🇮🇳 DPDP Act 2023 Compliant Privacy Framework
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#111118] dark:text-white leading-[1.1] mb-6 tracking-tight">
                Privacy Policy for <br className="hidden lg:block" />
                <span className="text-[#F97316]">EasyBMT Billing Software</span>
              </h2>

              <p className="text-lg md:text-xl text-[#64748B] dark:text-white/70 max-w-2xl leading-relaxed mb-8">
                EasyBMT respects your privacy and is committed to protecting your business and personal data.
                This Privacy Policy explains how we collect, process, store, use, and secure information when you use EasyBMT ERP, GST Billing, POS, Inventory, Accounting, and Business Management services.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">Effective Date: 28 May 2026</div>
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">India DPDP Act 2023 Ready</div>
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">GST & Business Compliance</div>
              </div>
            </div>

            {/* Right Side Security Icon (visible on large screens) */}
            <div className="hidden lg:flex w-[40%] justify-end items-center relative z-10 pr-8">
               <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E8721C] to-[#D4641A] blur-3xl opacity-20 rounded-[48px] scale-110 group-hover:scale-125 transition-transform duration-700 animate-pulse"></div>
                  <div className="w-72 h-72 rounded-[48px] bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center shadow-2xl shadow-[#E8721C]/30 relative z-10 transform rotate-6 group-hover:rotate-0 transition-all duration-500 hover:scale-105">
                     <ShieldCheck className="w-36 h-36 text-white drop-shadow-md" strokeWidth={1.5} />
                  </div>
               </div>
            </div>
          </div>

          {/* TOC */}
          <div className="toc dark:bg-[#111118] dark:border-[#2A2A3A]">
            <h3 className="dark:text-white">Privacy Policy Contents</h3>
            <div className="toc-grid">
              <a href="#s1" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">01. Information We Collect</a>
              <a href="#s2" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">02. How We Use Data</a>
              <a href="#s3" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">03. Legal Basis</a>
              <a href="#s4" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">04. Business & GST Data</a>
              <a href="#s5" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">05. Sharing of Data</a>
              <a href="#s6" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">06. Data Storage & Security</a>
              <a href="#s7" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">07. Cookies & Tracking</a>
              <a href="#s8" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">08. User Rights</a>
              <a href="#s9" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">09. Data Retention</a>
              <a href="#s10" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">10. Children's Privacy</a>
              <a href="#s11" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">11. Account Deletion</a>
              <a href="#s12" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">12. Contact Information</a>
            </div>
          </div>

          {/* SECTION 1 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s1">
            <div className="section-title">
              <div className="section-number">01</div>
              <h2 className="dark:text-white">Information We Collect</h2>
            </div>
            <p className="dark:text-white/70">
              We collect information necessary to provide billing, accounting, inventory, POS, GST, and business management services.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Name, email address, phone number, and business profile information.</li>
              <li className="dark:border-[#2A2A3A]">GSTIN, PAN, invoice records, customer records, supplier records, and accounting data.</li>
              <li className="dark:border-[#2A2A3A]">Payment and subscription details processed securely through trusted payment providers.</li>
              <li className="dark:border-[#2A2A3A]">Device information, IP address, browser type, and usage analytics.</li>
              <li className="dark:border-[#2A2A3A]">Camera permission for barcode and QR scanning.</li>
              <li className="dark:border-[#2A2A3A]">Bluetooth permissions for thermal printer connection.</li>
              <li className="dark:border-[#2A2A3A]">Location access for delivery tracking and Bluetooth device discovery.</li>
              <li className="dark:border-[#2A2A3A]">Offline sync and cache data for faster business operations.</li>
            </ul>
          </div>

          {/* SECTION 2 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s2">
            <div className="section-title">
              <div className="section-number">02</div>
              <h2 className="dark:text-white">How We Use Your Information</h2>
            </div>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Provide GST billing, POS, inventory, accounting, and ERP services.</li>
              <li className="dark:border-[#2A2A3A]">Generate invoices, e-way bills, reports, and tax summaries.</li>
              <li className="dark:border-[#2A2A3A]">Enable thermal printing and barcode scanning functionality.</li>
              <li className="dark:border-[#2A2A3A]">Synchronize data securely between devices and cloud servers.</li>
              <li className="dark:border-[#2A2A3A]">Improve platform performance, analytics, and security.</li>
              <li className="dark:border-[#2A2A3A]">Send login alerts, OTP verification emails, invoices, and notifications.</li>
              <li className="dark:border-[#2A2A3A]">Prevent fraud, abuse, unauthorized access, and suspicious activities.</li>
              <li className="dark:border-[#2A2A3A]">Comply with Indian taxation and legal obligations.</li>
            </ul>
          </div>

          {/* SECTION 3 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s3">
            <div className="section-title">
              <div className="section-number">03</div>
              <h2 className="dark:text-white">Legal Basis for Processing</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT processes personal and business data in compliance with:
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Digital Personal Data Protection Act, 2023 (India).</li>
              <li className="dark:border-[#2A2A3A]">Information Technology Act, 2000.</li>
              <li className="dark:border-[#2A2A3A]">GST Act and Indian taxation regulations.</li>
              <li className="dark:border-[#2A2A3A]">Contractual necessity for providing subscribed services.</li>
              <li className="dark:border-[#2A2A3A]">User consent for permissions, notifications, and communications.</li>
            </ul>
          </div>

          {/* SECTION 4 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s4">
            <div className="section-title">
              <div className="section-number">04</div>
              <h2 className="dark:text-white">Business & GST Data Protection</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT uses advanced tenant-isolated architecture to ensure complete separation of business data.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Each company’s data is isolated securely using company-level identifiers.</li>
              <li className="dark:border-[#2A2A3A]">Branch-level access control prevents unauthorized cross-branch access.</li>
              <li className="dark:border-[#2A2A3A]">Role-based permissions restrict access according to staff roles.</li>
              <li className="dark:border-[#2A2A3A]">Audit logs maintain records of important business actions.</li>
              <li className="dark:border-[#2A2A3A]">Firestore Security Rules enforce backend-level protection.</li>
              <li className="dark:border-[#2A2A3A]">Offline cached data syncs automatically when internet is restored.</li>
            </ul>
            <div className="notice dark:bg-[#211100] dark:border-[#D4641A]">
              <strong className="dark:text-[#E8721C]">Important:</strong> EasyBMT never sells customer business data, accounting records, invoice history, or GST data to third parties.
            </div>
          </div>

          {/* SECTION 5 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s5">
            <div className="section-title">
              <div className="section-number">05</div>
              <h2 className="dark:text-white">Sharing of Information</h2>
            </div>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Government authorities when legally required under Indian law.</li>
              <li className="dark:border-[#2A2A3A]">Payment gateways for subscription processing.</li>
              <li className="dark:border-[#2A2A3A]">Email and notification providers for OTP and alerts.</li>
              <li className="dark:border-[#2A2A3A]">Cloud hosting and infrastructure providers under strict confidentiality agreements.</li>
              <li className="dark:border-[#2A2A3A]">Law enforcement agencies when required by valid legal process.</li>
            </ul>
          </div>

          {/* SECTION 6 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s6">
            <div className="section-title">
              <div className="section-number">06</div>
              <h2 className="dark:text-white">Data Security & Encryption</h2>
            </div>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">HTTPS/TLS encryption for all data transmission.</li>
              <li className="dark:border-[#2A2A3A]">Secure Firebase Authentication and Firestore security rules.</li>
              <li className="dark:border-[#2A2A3A]">Role-based access control and branch-level restrictions.</li>
              <li className="dark:border-[#2A2A3A]">Encrypted cloud infrastructure and protected APIs.</li>
              <li className="dark:border-[#2A2A3A]">Automatic session validation and login protection.</li>
              <li className="dark:border-[#2A2A3A]">Security monitoring, audit logging, and fraud detection systems.</li>
            </ul>
          </div>

          {/* SECTION 7 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s7">
            <div className="section-title">
              <div className="section-number">07</div>
              <h2 className="dark:text-white">Cookies & Tracking Technologies</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT uses cookies and secure local storage technologies for:
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Maintaining login sessions.</li>
              <li className="dark:border-[#2A2A3A]">Improving app performance and offline caching.</li>
              <li className="dark:border-[#2A2A3A]">Saving user preferences and language settings.</li>
              <li className="dark:border-[#2A2A3A]">Security monitoring and fraud prevention.</li>
            </ul>
          </div>

          {/* SECTION 8 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s8">
            <div className="section-title">
              <div className="section-number">08</div>
              <h2 className="dark:text-white">Your Rights Under DPDP Act</h2>
            </div>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Right to access your stored personal data.</li>
              <li className="dark:border-[#2A2A3A]">Right to correct inaccurate information.</li>
              <li className="dark:border-[#2A2A3A]">Right to request account deletion.</li>
              <li className="dark:border-[#2A2A3A]">Right to withdraw consent for optional permissions.</li>
              <li className="dark:border-[#2A2A3A]">Right to grievance redressal under Indian law.</li>
            </ul>
          </div>

          {/* SECTION 9 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s9">
            <div className="section-title">
              <div className="section-number">09</div>
              <h2 className="dark:text-white">Data Retention Policy</h2>
            </div>
            <p className="dark:text-white/70">
              Financial and GST-related records may be retained for up to 8 years as required under Indian tax laws and compliance regulations.
            </p>
            <p className="dark:text-white/70 mt-4">
              User account data may remain securely archived for fraud prevention, audit compliance, dispute resolution, and legal obligations.
            </p>
          </div>

          {/* SECTION 10 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s10">
            <div className="section-title">
              <div className="section-number">10</div>
              <h2 className="dark:text-white">Children's Privacy</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT services are intended only for businesses and adults above 18 years of age. We do not knowingly collect personal data from children.
            </p>
          </div>

          {/* SECTION 11 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s11">
            <div className="section-title">
              <div className="section-number">11</div>
              <h2 className="dark:text-white">Account Deletion & Data Removal</h2>
            </div>
            <p className="dark:text-white/70">
              Users may request account deletion by contacting our support team.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Business compliance records may be retained if required by law.</li>
              <li className="dark:border-[#2A2A3A]">Some audit logs may remain stored for security and fraud prevention.</li>
              <li className="dark:border-[#2A2A3A]">Deleted accounts cannot always be restored.</li>
            </ul>
          </div>

          {/* SECTION 12 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="s12">
            <div className="section-title">
              <div className="section-number">12</div>
              <h2 className="dark:text-white">Contact Information</h2>
            </div>
            <p className="dark:text-white/70">
              For privacy concerns, legal requests, data deletion requests, or grievance reporting:
            </p>
            <div className="contact-grid">
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Support Email</span>
                <a href="mailto:support@easybmt.com" className="dark:text-[#E8721C]">support@easybmt.com</a>
              </div>
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Privacy Officer</span>
                <a href="mailto:privacy@easybmt.com" className="dark:text-[#E8721C]">privacy@easybmt.com</a>
              </div>
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Official Website</span>
                <a href="https://easybmt.com" className="dark:text-[#E8721C]">www.easybmt.com</a>
              </div>
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Business Contact</span>
                <a href="https://easybmt.com/contact" className="dark:text-[#E8721C]">Contact EasyBMT</a>
              </div>
            </div>
          </div>

          <div className="footer dark:text-[#8A8A9E]">
            © 2026 EasyBMT. All Rights Reserved. | Easy Business Management Tool
          </div>
        </div>
      </div>
    </>
  );
}
