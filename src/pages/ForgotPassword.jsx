import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import app from "@/firebase/config";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const functions = getFunctions(app);
      const sendPasswordResetEmail = httpsCallable(functions, "sendPasswordResetEmail");
      const res = await sendPasswordResetEmail({ email: email.trim().toLowerCase() });
      
      if (res.data?.developmentOtp) {
        toast.info(`Dev Mode OTP: ${res.data.developmentOtp}`, { autoClose: false });
      }
      
      setStep(2);
    } catch (err) {
      console.error("OTP send error:", err);
      if (err.message && err.message.includes("No account found")) {
        setError("No account found with this email address.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setError("");
    setStep(3); // Move to password reset step
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const functions = getFunctions(app);
      const resetPasswordWithOtp = httpsCallable(functions, "resetPasswordWithOtp");
      
      // Call backend to verify OTP and update password
      await resetPasswordWithOtp({ 
        email: email.trim().toLowerCase(), 
        otp: otp.trim(), 
        newPassword 
      });

      // If successful, log the user in automatically
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), newPassword);
      
      // Redirect to dashboard
      navigate("/");
    } catch (err) {
      console.error("Password reset error:", err);
      if (err.message && (err.message.includes("Invalid or expired") || err.message.includes("Incorrect OTP") || err.message.includes("expired"))) {
        setError("Invalid or expired OTP. Please go back and request a new one.");
        setStep(2); // Send back to OTP step
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={step === 1 ? Mail : step === 2 ? KeyRound : Lock}
      title={step === 1 ? "Reset password" : step === 2 ? "Enter OTP" : "Create new password"}
      subtitle={
        step === 1 
          ? "Enter your email and we'll send you an OTP" 
          : step === 2 
          ? `We sent a 6-digit code to ${email}`
          : "Your new password must be different from previous used passwords."
      }
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</>
            ) : "Send OTP"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">6-Digit Verification Code</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="otp"
                type="text"
                autoFocus
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-10 h-12 tracking-widest text-lg font-medium"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || otp.length !== 6}>
            Verify OTP
          </Button>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Didn't receive the code? Go back
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting password...</>
            ) : "Reset Password & Login"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
