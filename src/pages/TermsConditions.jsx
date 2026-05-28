import React from 'react';
import { Scale, ShieldCheck } from 'lucide-react';

export default function TermsConditions() {
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
        
        .terms-page {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.8;
          min-height: 100vh;
        }
        
        .terms-container {
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
        
        .terms-badge {
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

      <div className="terms-page dark:bg-[#0B0B0F] dark:text-[#D1D1E0]">
        <div className="terms-container">
          {/* HERO */}
          <div className="bg-gradient-to-br from-[#fff7ed] to-[#ffffff] dark:from-[#111118] dark:to-[#111118] border border-[#fed7aa] dark:border-[#2A2A3A] flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden py-12 md:py-20 px-6 md:px-12 lg:px-16 rounded-[32px] mb-12 shadow-sm">
            
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E8721C]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#E8721C]/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
            
            <div className="relative z-10 w-full lg:w-[60%]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-[14px] bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center shadow-lg shadow-[#E8721C]/20 shrink-0">
                  <Scale className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#111118] dark:text-white tracking-tight">EasyBMT</h1>
              </div>

              <div className="inline-flex items-center gap-2 bg-white dark:bg-[#1A1A28] border border-[#fed7aa] dark:border-[#2A2A3A] text-[#EA580C] dark:text-[#E8721C] px-4 py-2 rounded-full text-sm font-bold mb-6 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                🇮🇳 DPDP Act 2023 & India SaaS Compliant Terms
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#111118] dark:text-white leading-[1.1] mb-6 tracking-tight">
                Terms & Conditions for <br className="hidden lg:block" />
                <span className="text-[#F97316]">EasyBMT SaaS Platform</span>
              </h2>

              <p className="text-lg md:text-xl text-[#64748B] dark:text-white/70 max-w-2xl leading-relaxed mb-8">
                Please read these Terms carefully before using EasyBMT. By accessing or using our billing software, POS system, inventory tools, GST services, or mobile applications, you agree to comply with these Terms under Indian laws and regulations.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">Effective Date: 28 May 2026</div>
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">Secure Cloud Platform</div>
                <div className="bg-white dark:bg-[#1A1A28] border border-[#E2E8F0] dark:border-[#2A2A3A] px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-[#334155] dark:text-[#D1D1E0]">India SaaS Terms</div>
              </div>
            </div>

            {/* Right Side Security Icon */}
            <div className="hidden lg:flex w-[40%] justify-end items-center relative z-10 pr-8">
               <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E8721C] to-[#D4641A] blur-3xl opacity-20 rounded-[48px] scale-110 group-hover:scale-125 transition-transform duration-700 animate-pulse"></div>
                  <div className="w-72 h-72 rounded-[48px] bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center shadow-2xl shadow-[#E8721C]/30 relative z-10 transform rotate-6 group-hover:rotate-0 transition-all duration-500 hover:scale-105">
                     <Scale className="w-36 h-36 text-white drop-shadow-md" strokeWidth={1.5} />
                  </div>
               </div>
            </div>
          </div>

          {/* TOC */}
          <div className="toc dark:bg-[#111118] dark:border-[#2A2A3A]">
            <h3 className="dark:text-white">Quick Navigation</h3>
            <div className="toc-grid">
              <a href="#acceptance" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">01. Acceptance of Terms</a>
              <a href="#services" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">02. Services Provided</a>
              <a href="#accounts" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">03. Accounts & Security</a>
              <a href="#payments" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">04. Payments & Billing</a>
              <a href="#userdata" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">05. User Data & Ownership</a>
              <a href="#privacy" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">06. Privacy & Security</a>
              <a href="#restrictions" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">07. Prohibited Activities</a>
              <a href="#liability" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">08. Limitation of Liability</a>
              <a href="#termination" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">09. Termination</a>
              <a href="#law" className="dark:bg-[#1A1A28] dark:border-[#2A2A3A] dark:text-[#D1D1E0] dark:hover:border-[#E8721C]">10. Governing Law</a>
            </div>
          </div>

          {/* SECTION 1 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="acceptance">
            <div className="section-title">
              <div className="section-number">01</div>
              <h2 className="dark:text-white">Acceptance of Terms</h2>
            </div>
            <p className="dark:text-white/70">
              By accessing or using EasyBMT website, web application, mobile application, APIs, cloud services, billing tools, POS modules, inventory systems, or related services, you agree to be legally bound by these Terms & Conditions.
            </p>
            <div className="notice dark:bg-[#211100] dark:border-[#D4641A]">
              <strong className="dark:text-[#E8721C]">Important:</strong> If you do not agree with any part of these Terms, you must immediately discontinue use of EasyBMT services.
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="services">
            <div className="section-title">
              <div className="section-number">02</div>
              <h2 className="dark:text-white">Services Provided</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT provides high-performance, secure business management and GST billing software solutions including:
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">GST Billing & Invoicing</li>
              <li className="dark:border-[#2A2A3A]">Inventory Management & Stock Tracking</li>
              <li className="dark:border-[#2A2A3A]">Barcode & QR Code Billing</li>
              <li className="dark:border-[#2A2A3A]">Point of Sale (POS) Billing System</li>
              <li className="dark:border-[#2A2A3A]">Accounting, Ledger & Financial Reports</li>
              <li className="dark:border-[#2A2A3A]">Customer & Supplier Relationship Management</li>
              <li className="dark:border-[#2A2A3A]">Cloud Data Synchronization</li>
              <li className="dark:border-[#2A2A3A]">Mobile App & Offline Billing Features</li>
            </ul>
          </div>

          {/* SECTION 3 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="accounts">
            <div className="section-title">
              <div className="section-number">03</div>
              <h2 className="dark:text-white">Accounts & Security</h2>
            </div>
            <p className="dark:text-white/70">
              Users are responsible for maintaining confidentiality of login credentials, passwords, OTPs, and company access information.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">You must provide accurate and verifiable business details during registration.</li>
              <li className="dark:border-[#2A2A3A]">You are responsible for all activities performed using your account or credentials.</li>
              <li className="dark:border-[#2A2A3A]">EasyBMT may suspend accounts involved in suspicious or fraudulent activities.</li>
              <li className="dark:border-[#2A2A3A]">Email and OTP verification may be mandatory for account activation and password resets.</li>
            </ul>
          </div>

          {/* SECTION 4 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="payments">
            <div className="section-title">
              <div className="section-number">04</div>
              <h2 className="dark:text-white">Payments & Subscription</h2>
            </div>
            <p className="dark:text-white/70">
              Certain EasyBMT services may require paid subscriptions, module purchases, or premium plans.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">All payments are non-refundable unless required by applicable Indian law.</li>
              <li className="dark:border-[#2A2A3A]">Subscription plans and pricing may change with prior electronic notice.</li>
              <li className="dark:border-[#2A2A3A]">Failure to pay subscription fees may result in limited, view-only access or account suspension.</li>
              <li className="dark:border-[#2A2A3A]">Applicable taxes including Goods & Services Tax (GST) apply on all invoices.</li>
            </ul>
          </div>

          {/* SECTION 5 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="userdata">
            <div className="section-title">
              <div className="section-number">05</div>
              <h2 className="dark:text-white">User Data & Ownership</h2>
            </div>
            <p className="dark:text-white/70">
              Users retain complete ownership of their business data uploaded or generated within the EasyBMT platform.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Invoices, inventory records, customer profiles, and ledger reports belong solely to the customer.</li>
              <li className="dark:border-[#2A2A3A]">EasyBMT only processes this data to provide, secure, and maintain the subscription services.</li>
              <li className="dark:border-[#2A2A3A]">You are solely responsible for maintaining lawful and accurate business records.</li>
              <li className="dark:border-[#2A2A3A]">Uploading illegal, fraudulent, or malicious content is strictly prohibited.</li>
            </ul>
          </div>

          {/* SECTION 6 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="privacy">
            <div className="section-title">
              <div className="section-number">06</div>
              <h2 className="dark:text-white">Privacy & Data Protection</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT follows reasonable security practices under Indian Information Technology Act, 2000 and Digital Personal Data Protection (DPDP) Act, 2023.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Encrypted HTTPS/TLS communication for all requests.</li>
              <li className="dark:border-[#2A2A3A]">Secure cloud database architecture with strict tenant isolation.</li>
              <li className="dark:border-[#2A2A3A]">Role-based access controls and branch-level isolation rules.</li>
              <li className="dark:border-[#2A2A3A]">Audit logging & monitoring of critical business operations.</li>
              <li className="dark:border-[#2A2A3A]">Offline secure sync systems with local encryption.</li>
            </ul>
          </div>

          {/* SECTION 7 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="restrictions">
            <div className="section-title">
              <div className="section-number">07</div>
              <h2 className="dark:text-white">Prohibited Activities</h2>
            </div>
            <p className="dark:text-white/70">
              To ensure platform integrity, users agree not to engage in:
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Reverse engineering, decompiling, or copying the platform's proprietary code.</li>
              <li className="dark:border-[#2A2A3A]">Using EasyBMT for illegal billing, tax evasion, or tax fraud.</li>
              <li className="dark:border-[#2A2A3A]">Uploading malware, viruses, or harmful automation scripts.</li>
              <li className="dark:border-[#2A2A3A]">Unauthorized API access, vulnerability scraping, or bulk data extraction.</li>
              <li className="dark:border-[#2A2A3A]">Sharing paid credentials or customer slots in violation of subscription terms.</li>
            </ul>
          </div>

          {/* SECTION 8 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="liability">
            <div className="section-title">
              <div className="section-number">08</div>
              <h2 className="dark:text-white">Limitation of Liability</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT and its affiliates shall not be liable for:
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Loss of profits, revenue, or business interruption due to platform downtime.</li>
              <li className="dark:border-[#2A2A3A]">User-side accounting, invoicing, or tax filing calculation errors.</li>
              <li className="dark:border-[#2A2A3A]">Internet outages, local network issues, or third-party API failures.</li>
              <li className="dark:border-[#2A2A3A]">Government GST portal latency or downtime.</li>
              <li className="dark:border-[#2A2A3A]">Unauthorized access caused by weak user passwords or leaked OTPs.</li>
            </ul>
          </div>

          {/* SECTION 9 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="termination">
            <div className="section-title">
              <div className="section-number">09</div>
              <h2 className="dark:text-white">Termination</h2>
            </div>
            <p className="dark:text-white/70">
              EasyBMT reserves the right to suspend or terminate accounts violating these Terms or applicable Indian laws.
            </p>
            <ul className="dark:text-[#D1D1E0]">
              <li className="dark:border-[#2A2A3A]">Fraudulent activities, tax scams, or malicious behavior may result in immediate suspension.</li>
              <li className="dark:border-[#2A2A3A]">Users may request account closure and data download at any time.</li>
              <li className="dark:border-[#2A2A3A]">Data retention after termination continues as legally required by Indian tax authorities.</li>
            </ul>
          </div>

          {/* SECTION 10 */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]" id="law">
            <div className="section-title">
              <div className="section-number">10</div>
              <h2 className="dark:text-white">Governing Law</h2>
            </div>
            <p className="dark:text-white/70">
              These Terms shall be governed by and interpreted under the laws of India.
            </p>
            <p className="dark:text-white/70">
              Any disputes arising from these Terms or use of EasyBMT services shall fall under the exclusive jurisdiction of the competent courts of India.
            </p>
          </div>

          {/* CONTACT INFO */}
          <div className="section dark:bg-[#111118] dark:border-[#2A2A3A]">
            <div className="section-title">
              <h2 className="dark:text-white">Contact & Support</h2>
            </div>
            <div className="contact-grid">
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Support Email</span>
                <a href="mailto:info@easybmt.com" className="dark:text-[#E8721C]">info@easybmt.com</a>
              </div>
              <div className="contact-card dark:bg-[#1A1A28] dark:border-[#2A2A3A]">
                <span className="dark:text-[#8A8A9E]">Official Website</span>
                <a href="https://easybmt.com" className="dark:text-[#E8721C]">www.easybmt.com</a>
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
