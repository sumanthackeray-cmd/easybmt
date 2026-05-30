import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2, 
  ArrowRight, 
  Hash,
  ShieldAlert,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Check,
  Moon,
  Sun,
  User,
  Phone,
  RefreshCw,
  Menu,
  X,
  Home,
  Zap,
  Tag,
  Info,
  FileText
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useTenant } from "@/hooks/useTenant";
import { ownerLogin } from "@/modules/auth/authService";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/api/firebase";
import { clearAllLocalData } from "@/lib/localDB";

import siteLogo from "../../assets/site_logo.png";
import SEO from "@/components/SEO";
import "../landing.css";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { registerNewCompany, loading, error: tenantError } = useTenant();
  
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const { theme, setTheme } = useTheme();

  const otpInputsRef = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  const validateGstin = (value) => {
    if (!value) return true;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(value.trim().toUpperCase());
  };

  const getPasswordStrength = (v) => {
    if (!v) return { score: 0, label: 'Enter a strong password', color: 'text-[#ADADBE]', bars: 0 };
    let sc = 0;
    if (v.length >= 8) sc++;
    if (/[A-Z]/.test(v)) sc++;
    if (/[0-9]/.test(v)) sc++;
    if (/[^A-Za-z0-9]/.test(v)) sc++;
    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong ✓'];
    const colors = ['text-[#EF4444]', 'text-[#EF4444]', 'text-[#F59E0B]', 'text-[#F59E0B]', 'text-[#22C55E]'];
    const barColors = ['bg-[#EF4444]', 'bg-[#EF4444]', 'bg-[#F59E0B]', 'bg-[#F59E0B]', 'bg-[#22C55E]'];
    return { score: sc, label: labels[sc], color: colors[sc], barColor: barColors[sc], bars: sc };
  };

  const pwStrength = getPasswordStrength(password);

  const getFriendlyErrorMessage = (error) => {
    const msg = error?.message || String(error);
    if (msg.includes("internal")) return "An unexpected error occurred. Please try again or contact support.";
    if (msg.includes("unavailable")) return "Service is temporarily unavailable. Please try again later.";
    if (msg.includes("already-exists") || msg.includes("already-in-use")) return "This email is already registered. Please sign in.";
    if (msg.includes("network-request-failed")) return "Network error. Please check your internet connection.";
    return msg;
  };

  const getMaskedEmail = (emailStr) => {
    if (!emailStr) return "";
    const parts = emailStr.split("@");
    if (parts.length !== 2) return emailStr;
    const [name, domain] = parts;
    if (name.length <= 2) {
      return `${name}***@${domain}`;
    }
    return `${name.substring(0, 2)}***@${domain}`;
  };

  const handleOtpFocus = (index) => {
    // Scroll the focused OTP box into view smoothly on mobile
    setTimeout(() => {
      otpInputsRef.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
    }, 100);
  };

  const handleOtpChange = (val, index) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal) {
      const newOtp = [...otpValues];
      newOtp[index] = "";
      setOtpValues(newOtp);
      return;
    }

    const newOtp = [...otpValues];
    newOtp[index] = cleanVal[cleanVal.length - 1]; // take the last typed digit
    setOtpValues(newOtp);

    // Automatically focus the next input box if digit typed
    if (index < 5) {
      const nextInput = otpInputsRef.current[index + 1];
      nextInput?.focus();
      // Scroll into view on mobile
      setTimeout(() => {
        nextInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otpValues[index] === "" && index > 0) {
        const newOtp = [...otpValues];
        newOtp[index - 1] = "";
        setOtpValues(newOtp);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otpValues];
        newOtp[index] = "";
        setOtpValues(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtpValues(newOtp);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    localStorage.clear();
    await clearAllLocalData().catch(console.error);

    if (!fullName.trim()) return setError("Full Name is required.");
    if (!companyName.trim()) return setError("Business Name is required.");
    if (!email.trim()) return setError("Email Address is required.");
    if (!mobile.trim()) return setError("Mobile Number is required.");
    if (!/^\d{10}$/.test(mobile.trim())) return setError("Mobile Number must be a valid 10-digit number.");
    if (gstin && !validateGstin(gstin)) return setError("Invalid GSTIN format. Example: 27AAPCM1234F1Z5");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setIsProcessing(true);
    try {
      const sendOtpFn = httpsCallable(getFunctions(app), 'sendRegistrationOtp');
      const res = await sendOtpFn({ email: email.trim().toLowerCase() });
      setOtpSent(true);
      setResendTimer(60);
      setOtpValues(["", "", "", "", "", ""]);
      setDevOtpCode("");
      
      if (res.data?.developmentOtp) {
        setDevOtpCode(res.data.developmentOtp);
        toast.info("Development Mode: SMTP not configured. OTP generated.");
      } else {
        toast.success(`OTP Sent! Please check ${email} for the verification code.`);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsResending(true);
    try {
      const sendOtpFn = httpsCallable(getFunctions(app), 'sendRegistrationOtp');
      const res = await sendOtpFn({ email: email.trim().toLowerCase() });
      setResendTimer(60);
      setOtpValues(["", "", "", "", "", ""]);
      setDevOtpCode("");
      
      if (res.data?.developmentOtp) {
        setDevOtpCode(res.data.developmentOtp);
        toast.info("Development Mode: SMTP not configured. New OTP generated.");
      } else {
        toast.success(`OTP Resent! Please check ${email} for the new verification code.`);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");

    const otpCode = otpValues.join("");
    if (!otpCode || otpCode.length !== 6) {
      return setError("Please enter a valid 6-digit OTP.");
    }

    setIsVerifyingOtp(true);
    try {
      const verifyOtpFn = httpsCallable(getFunctions(app), 'verifyRegistrationOtp');
      await verifyOtpFn({ email: email.trim().toLowerCase(), otp: otpCode.trim() });
      
      // If OTP verified, proceed with registration
      const response = await registerNewCompany({
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password: password,
        admin_name: fullName.trim(),
        phone: mobile.trim()
      });

      if (response && response.success) {
        toast.success("Registration Successful! Logging you in...");
        await ownerLogin(email.trim().toLowerCase(), password);
        navigate("/settings?tab=company_profile", { replace: true });
      } else {
        setError("Failed to register company. Please try again.");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err) || "Invalid or expired OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white dark:bg-[#0B0B0F] text-[#3A3A4A] dark:text-[#D1D1E0] font-sans selection:bg-[#E8721C] selection:text-white transition-colors duration-300">
      
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[205] transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <div 
        className={`fixed top-0 left-0 h-screen w-72 bg-white dark:bg-[#111118] border-r border-[#E8E8EE] dark:border-white/10 z-[210] shadow-2xl transition-all duration-300 flex flex-col justify-between pt-[calc(10px+env(safe-area-inset-top,0px))] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex flex-col gap-6">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-[#E8E8EE] dark:border-white/10 pb-4">
            <Link to="/" className="flex items-center gap-2" onClick={() => setIsSidebarOpen(false)}>
              <span className="font-black gold-text text-2xl transition-all">EasyBMT</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
            </Link>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-full hover:bg-[#F0F0F6] dark:hover:bg-white/10 bg-white dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] shadow-sm text-[#7A7A8C] dark:text-white transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="flex flex-col gap-1">
            {[
              { label: "Home", to: "/", icon: Home },
              { label: "Features", to: "/#features", icon: Zap },
              { label: "Pricing", to: "/#pricing", icon: Tag },
              { label: "About", to: "/#modules", icon: Info },
              { label: "Privacy", to: "/privacy", icon: ShieldCheck },
              { label: "Terms", to: "/terms", icon: FileText },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to || 
                (link.to.startsWith("/#") && location.pathname === "/" && location.hash === link.to.substring(1)) ||
                (link.to === "/" && location.pathname === "/" && location.hash === "");

              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all duration-200 group relative text-[13px] ${
                    isActive 
                      ? "bg-[#E8721C]/15 text-[#E8721C] border border-[#E8721C]/30 shadow-sm" 
                      : "text-[#3A3A4A] dark:text-[#D1D1E0] hover:bg-[#F0F0F6] dark:hover:bg-white/5 hover:text-[#E8721C] dark:hover:text-[#E8721C] border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r bg-[#E8721C] shadow-[0_0_8px_rgba(232,114,28,0.5)] animate-in slide-in-from-left-1 duration-200" />
                  )}
                  <Icon className={`shrink-0 transition-transform group-hover:scale-110 w-[18px] h-[18px] ${isActive ? "text-[#E8721C]" : "text-[#7A7A8C] dark:text-[#8A8A9E] group-hover:text-[#E8721C]"}`} />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer/Contact Area */}
        <div className="p-4 border-t border-[#E8E8EE] dark:border-white/10 bg-[#FAFAFC] dark:bg-[#0E0E14] rounded-b-2xl">
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#F0F0F6] dark:bg-white/5 border border-[#DDDDE8] dark:border-white/5">
            <p className="text-[10px] font-black text-[#7A7A8C] dark:text-[#8A8A9E] uppercase tracking-wider">Contact support</p>
            <a 
              href="mailto:info@easybmt.com" 
              className="text-[13px] font-bold text-[#E8721C] hover:text-[#D4641A] transition-colors"
            >
              info@easybmt.com
            </a>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="landing-page shrink-0 !min-h-0 !h-0">
        <nav 
          className="landing-nav dark:bg-[#0B0B0F]/90 dark:border-white/10 flex items-center justify-between"
          style={{ 
            paddingTop: "env(safe-area-inset-top, 0px)",
            height: "calc(45px + env(safe-area-inset-top, 0px))"
          }}
        >
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-xl hover:bg-[#F0F0F6] dark:hover:bg-white/10 text-[#3A3A4A] dark:text-white transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="nav-logo">
              <img src={siteLogo} alt="EasyBMT Site Logo" className="landing-site-logo" />
            </Link>
          </div>
          
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/#features">Features</Link></li>
            <li><Link to="/#pricing">Pricing</Link></li>
            <li><Link to="/#modules">About</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
          </ul>

          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/919801200459" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
              <svg className="w-8 h-8 md:w-9 md:h-9 fill-[#25D366] hover:fill-[#20ba56] transition-colors" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-4.655c1.667.988 3.536 1.509 5.44 1.51h.005c5.447 0 9.878-4.427 9.882-9.875.002-2.639-1.02-5.12-2.881-6.983C17.472 2.133 15.001.993 12.01.993c-5.452 0-9.887 4.434-9.89 9.885-.001 1.942.5 3.826 1.455 5.503L2.512 21.147l4.38-1.802zm12.822-6.09c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </a>
          </div>
        </nav>
      </div>

      <div className="flex-1 flex w-full pt-[calc(45px+env(safe-area-inset-top,0px))] min-h-0 overflow-hidden">
        <SEO 
          title="Sign Up for EasyBMT — Start 14-Day Free Billing Trial" 
          description="Create your company account in under 5 minutes. Auto-populate business details via GSTIN database lookup, add products with HSN tax slabs, and start printing barcode sheets and invoices instantly." 
        />
        {/* LEFT PANEL - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-[45%] flex-col justify-between pt-8 pb-10 px-12 relative overflow-hidden bg-[#F5F5F7] dark:bg-[#111118] border-r border-[#E8E8EE] dark:border-none transition-colors duration-300">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E8721C]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none translate-x-1/2 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#E8721C]/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
          
          <div className="relative z-10 mt-6">
            <div className="space-y-6 max-w-md">
              <h1 className="text-4xl md:text-5xl font-black text-[#111118] dark:text-white leading-[1.1] tracking-tight transition-colors duration-300">
                Create your <br/><span className="text-[#E8721C]">Workspace.</span>
              </h1>
              <p className="text-lg text-[#3A3A4A] dark:text-white/70 leading-relaxed font-medium transition-colors duration-300">
                Trusted by modern businesses for smart GST billing, inventory control, and seamless financial management.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">10K<span className="text-[#E8721C]">+</span></h3>
                <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">Registered Users</p>
              </div>
              <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">₹1000Cr<span className="text-[#E8721C]">+</span></h3>
                <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">Billed Monthly</p>
              </div>
              <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none col-span-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">4.9</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-5 h-5 text-[#E8721C] fill-[#E8721C]" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">App Rating across all platforms</p>
                </div>
              </div>
            </div>
            
            {/* Desktop Left-Side Firebase Secure Card */}
            <div className="mt-8 bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm shadow-sm dark:shadow-none relative z-10">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 fill-none" viewBox="0 0 24 24">
                  <path d="M3.89 19.3L12 .45l8.11 18.85L12 23.55 3.89 19.3z" fill="#0284C7" opacity="0.1" />
                  <path d="M20.07 18.93L12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01l7.8-1.2c.15-.02.23-.19.17-.331z" fill="#FFCA28" />
                  <path d="M12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01V.45z" fill="#F57C00" />
                  <path d="M17.43 19.31l-5.18-9.82c-.08-.15-.3-.15-.38 0L9.04 14.8l-2.61-4.99c-.08-.16-.31-.16-.39.01L3.9 19.31c-.06.13.04.28.18.27l13.16-1c.15-.01.24-.16.19-.27z" fill="#FF5252" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] text-[#7A7A8C] dark:text-white/40 font-extrabold uppercase tracking-widest leading-none">Security Infrastructure</div>
                  <div className="text-lg font-black text-[#111118] dark:text-white leading-tight">Google Firebase</div>
                </div>
              </div>
              <div className="w-full h-px bg-slate-100 dark:bg-white/10 my-2.5"></div>
              <ul className="text-xs text-[#7A7A8C] dark:text-white/70 space-y-2 list-none !m-0 !p-0 w-full text-left">
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#E8721C] font-bold">✔</span> 256-bit SSL Database Partitioning</li>
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#E8721C] font-bold">✔</span> Automatic Real-Time Database Isolation</li>
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#E8721C] font-bold">✔</span> 99.9% Uptime with Auto Failover Recovery</li>
              </ul>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[#7A7A8C] dark:text-white/50 text-sm font-medium transition-colors duration-300">
            <p>© {new Date().getFullYear()} Easy Business Management Tool</p>
            <div className="flex gap-4">
              <a href="https://easybmt.com/privacy" className="hover:text-[#111118] dark:hover:text-white transition-colors">Privacy</a>
              <a href="https://easybmt.com/terms" className="hover:text-[#111118] dark:hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Auth Form */}
        <div className="w-full lg:w-[55%] flex flex-col h-full overflow-y-auto px-6 sm:px-12 md:px-24 relative bg-white dark:bg-[#14141F] transition-colors duration-300">
          <div className="max-w-[440px] w-full mx-auto my-auto py-4 sm:py-8 relative flex-shrink-0">
            
            <div className="mb-5">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111118] dark:text-white tracking-tight mb-1.5 transition-colors duration-300">Register Business</h2>
              <p className="text-sm sm:text-[15px] text-[#7A7A8C] dark:text-[#8A8A9E] font-medium transition-colors duration-300">Start your 14-day free trial. No credit card required.</p>
            </div>

          {(error || tenantError) && (
            <div className="mb-5 p-3 sm:p-4 rounded-xl bg-[#FEF2F2] dark:bg-[#3A1313] border border-[#EF4444]/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
              <p className="text-[13px] sm:text-sm font-medium text-[#EF4444]">{error || tenantError}</p>
            </div>
          )}

          <form onSubmit={otpSent ? handleVerifyAndRegister : handleSendOtp} className="space-y-4">
            
            {/* Full Name & Mobile Number */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Mobile Number *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-4 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                    placeholder="10-digit number"
                    pattern="[0-9]{10}"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Business Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                  placeholder="e.g. Acme Corporation"
                />
              </div>
            </div>

            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">GSTIN <span className="text-[#ADADBE] font-normal">(Optional)</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-4 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E] uppercase"
                  placeholder="27AAPCM1234F1Z5"
                />
              </div>
            </div>

            {/* Admin Info */}
            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Admin Email *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                    placeholder="••••••••"
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ADADBE] hover:text-[#7A7A8C] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Confirm *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-4 pr-10 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E] ${confirmPassword && password !== confirmPassword ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#DDDDE8] dark:border-[#2A2A3A]'}`}
                    placeholder="••••••••"
                  />
                  {confirmPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ADADBE] hover:text-[#7A7A8C] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && !otpSent && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <div className="flex gap-1 mb-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.bars ? pwStrength.barColor : 'bg-[#E8E8EE] dark:bg-[#2A2A3A]'}`}></div>
                  ))}
                </div>
                <p className={`text-xs font-bold ${pwStrength.color}`}>{pwStrength.label}</p>
              </div>
            )}

            {/* Premium OTP Verification Section */}
            {otpSent && (
              <div className="space-y-4 mt-6 p-5 bg-[#F5F5F7] dark:bg-[#1A1A28] rounded-2xl border border-[#E8E8EE] dark:border-[#2A2A3A] animate-in fade-in slide-in-from-bottom-2">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] flex items-center justify-between">
                  <span>Enter OTP Verification Code</span>
                  <button 
                    type="button" 
                    onClick={() => setOtpSent(false)}
                    className="text-xs text-[#E8721C] hover:text-[#D4641A] font-bold"
                  >
                    Change Details?
                  </button>
                </label>
                
                <p className="text-xs text-[#7A7A8C] dark:text-[#8A8A9E] font-medium leading-relaxed">
                  Enter the 6-digit verification code sent to your email:<br/>
                  <span className="font-bold text-[#111118] dark:text-white mt-1 block text-sm">{getMaskedEmail(email)}</span>
                </p>

                {/* 6 character grid */}
                <div className="flex gap-2 justify-between mt-4" onPaste={handlePaste}>
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      required
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onFocus={() => handleOtpFocus(idx)}
                      className="w-12 h-14 text-center font-black text-2xl bg-white dark:bg-[#0B0B0F] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white shadow-sm"
                    />
                  ))}
                </div>

                {/* Countdown Timer & Resend Button */}
                <div className="flex items-center justify-between mt-4 pt-2 border-t border-[#E8E8EE] dark:border-[#2A2A3A] text-xs font-semibold">
                  {resendTimer > 0 ? (
                    <span className="text-[#7A7A8C]">Resend code in <span className="text-[#E8721C] font-bold">{resendTimer}s</span></span>
                  ) : (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendOtp}
                      className="text-[#E8721C] hover:text-[#D4641A] flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Resend Verification OTP
                    </button>
                  )}
                </div>

                {devOtpCode && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-center animate-in fade-in slide-in-from-top-1">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                      ⚠️ Development Mode (SMTP not configured)
                    </p>
                    <p className="text-sm font-black text-amber-950 dark:text-amber-200 mt-1">
                      Use Verification Code: <span className="font-bold text-[#E8721C] text-lg tracking-widest ml-1">{devOtpCode}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {!otpSent ? (
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-[#E8721C] hover:bg-[#D4641A] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#E8721C]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Continue <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isVerifyingOtp || loading}
                className="w-full py-3.5 px-4 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#22C55E]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isVerifyingOtp || loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Verify & Complete Registration <CheckCircle2 className="w-5 h-5" /></>
                )}
              </button>
            )}
          </form>

          <p className="mt-8 text-center text-[#7A7A8C] dark:text-[#8A8A9E] font-medium transition-colors duration-300">
            Already have an account?{' '}
            <Link to="/login" className="text-[#E8721C] font-bold hover:text-[#D4641A] transition-colors">
              Sign In
            </Link>
          </p>

          {/* Mobile-Only Firebase Secure Locker Card */}
          <div className="lg:hidden mt-8 w-full shrink-0">
            <div className="flex flex-col items-center gap-4 bg-[#F8FAFC] dark:bg-[#1C1C2C] border border-slate-200 dark:border-[#2C2C3C] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 fill-none" viewBox="0 0 24 24">
                  <path d="M3.89 19.3L12 .45l8.11 18.85L12 23.55 3.89 19.3z" fill="#0284C7" opacity="0.1" />
                  <path d="M20.07 18.93L12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01l7.8-1.2c.15-.02.23-.19.17-.331z" fill="#FFCA28" />
                  <path d="M12.16.45c-.08-.18-.34-.18-.42 0L3.83 18.93c-.06.14.02.3.17.32l8 1c.03 0 .07 0 .1-.01V.45z" fill="#F57C00" />
                  <path d="M17.43 19.31l-5.18-9.82c-.08-.15-.3-.15-.38 0L9.04 14.8l-2.61-4.99c-.08-.16-.31-.16-.39.01L3.9 19.31c-.06.13.04.28.18.27l13.16-1c.15-.01.24-.16.19-.27z" fill="#FF5252" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest leading-none">Security Infrastructure</div>
                  <div className="text-base font-black text-slate-900 dark:text-white leading-tight">Google Firebase</div>
                </div>
              </div>
              <div className="w-full h-px bg-slate-200 dark:bg-white/10 my-1"></div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-none !m-0 !p-0 w-full text-left">
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> 256-bit SSL Database Partitioning</li>
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> Automatic Real-Time Database Isolation</li>
                <li className="flex items-center gap-2 before:hidden"><span className="text-[#F57C00] font-bold">✔</span> 99.9% Uptime with Auto Failover Recovery</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
