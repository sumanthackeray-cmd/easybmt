import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabase";
import { sendOTP, verifyOTP } from "@/api/otpService";

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email', 'otp', 'password'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await sendOTP(email, 'reset_password');
      if (result.success) {
        setStep('otp');
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await verifyOTP(email, otp, 'reset_password');
      if (result.success) {
        setStep('password');
      } else {
        setError(result.error || "Invalid OTP");
      }
    } catch (err) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;

      // Password reset link sent
      setError("");
      setStep('email');
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "20px",
    }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        width: "100%",
        maxWidth: "480px",
        padding: "40px",
      }}>
        <h1 style={{ textAlign: "center", color: "#333", marginTop: 0, marginBottom: "10px" }}>
          {step === 'email' ? "Reset Password" : step === 'otp' ? "Verify OTP" : "Set New Password"}
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px", fontSize: "14px" }}>
          {step === 'email' ? "Enter your email to receive a reset code" : step === 'otp' ? "Check your email for the verification code" : "Create your new password"}
        </p>

        {error && (
          <div style={{
            background: "#fee",
            border: "1px solid #fcc",
            color: "#c00",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "14px",
                background: loading || !email ? "#ccc" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: loading || !email ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending OTP..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Enter 6-digit Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  textAlign: "center",
                  fontSize: "24px",
                  letterSpacing: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{
                width: "100%",
                padding: "14px",
                background: loading || otp.length !== 6 ? "#ccc" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={() => setStep("email")}
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                color: "#667eea",
                border: "1px solid #667eea",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "12px",
              }}
            >
              Change Email
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              style={{
                width: "100%",
                padding: "14px",
                background: loading || !newPassword || newPassword !== confirmPassword ? "#ccc" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: loading || !newPassword || newPassword !== confirmPassword ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #eee", paddingTop: "20px" }}>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
            <Link to="/login" style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}>
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
