import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/api/supabase";
import { sendOTP, verifyOTP } from "@/api/otpService";

export default function Register() {
  const [step, setStep] = useState("details"); // details, otp, success
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email.trim()) throw new Error("Email is required");
      if (!companyName.trim()) throw new Error("Company name is required");
      if (!password) throw new Error("Password is required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      if (password !== confirmPassword) throw new Error("Passwords don't match");

      const result = await sendOTP(email.trim().toLowerCase(), "signup");
      
      if (result.success) {
        setStep("otp");
        console.log("[v0] OTP sent to", email);
      } else {
        throw new Error(result.error || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!otp || otp.length !== 6) throw new Error("Please enter 6-digit OTP");

      const verifyResult = await verifyOTP(email.trim().toLowerCase(), otp, "signup");
      
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || "Invalid OTP");
      }

      // Create account in Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            company_name: companyName,
            gstin: gstin || null,
            role: "admin",
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Registration failed");

      console.log("[v0] Account created", authData.user.id);

      // Create company record
      const { error: companyError } = await supabase
        .from("branches")
        .insert([
          {
            id: authData.user.id,
            name: companyName,
            owner_id: authData.user.id,
            gstin: gstin || null,
          },
        ]);

      if (companyError) console.error("[v0] Company creation error:", companyError);

      setStep("success");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
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
          padding: "60px 40px",
          textAlign: "center",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "#667eea",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "40px",
            color: "white",
          }}>
            ✓
          </div>
          <h2 style={{ color: "#333", marginTop: 0 }}>Registration Successful!</h2>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Your account has been created. You can now login with your email and password.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "14px 40px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
        <h1 style={{ textAlign: "center", color: "#333", marginTop: 0, marginBottom: "30px" }}>
          {step === "details" ? "Create Account" : "Verify Email"}
        </h1>

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

        {step === "details" ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
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

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAACX1234H1Z0"
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

            <div style={{ marginBottom: "20px" }}>
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

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#ccc" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <p style={{ color: "#666", textAlign: "center", marginBottom: "20px" }}>
              We've sent a verification code to <strong>{email}</strong>
            </p>

            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                Enter 6-digit OTP
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
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep("details")}
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

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #eee", paddingTop: "20px" }}>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
