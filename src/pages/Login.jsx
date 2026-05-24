import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/api/supabase";

export default function Login() {
  const [isStaff, setIsStaff] = useState(false);
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userCode, setUserCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please enter email and password");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        console.log("[v0] Admin login successful", data.user.id);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!companyId || !userCode || !password) {
        throw new Error("Please enter Company ID, User Code, and Password");
      }

      // Staff login through company staff table
      const { data, error: staffError } = await supabase.rpc("staff_login", {
        p_company_id: companyId.trim(),
        p_user_code: userCode.trim(),
        p_password: password,
      });

      if (staffError) throw staffError;
      if (!data?.user_id) throw new Error("Invalid credentials");

      console.log("[v0] Staff login successful", data.user_id);
      // Store staff session
      sessionStorage.setItem("staff_id", data.user_id);
      sessionStorage.setItem("company_id", companyId);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Staff login failed");
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
          EasyBMT
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px", fontSize: "14px" }}>
          Enterprise Billing & Management System
        </p>

        {/* Role Toggle */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px",
          background: "#f5f5f5",
          padding: "4px",
          borderRadius: "8px",
        }}>
          <button
            onClick={() => setIsStaff(false)}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: "6px",
              background: !isStaff ? "#667eea" : "transparent",
              color: !isStaff ? "white" : "#666",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            Administrator
          </button>
          <button
            onClick={() => setIsStaff(true)}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              borderRadius: "6px",
              background: isStaff ? "#667eea" : "transparent",
              color: isStaff ? "white" : "#666",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            Staff
          </button>
        </div>

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

        <form onSubmit={isStaff ? handleStaffLogin : handleAdminLogin}>
          {!isStaff ? (
            // Admin Login
            <>
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

              <div style={{ marginBottom: "30px" }}>
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
            </>
          ) : (
            // Staff Login
            <>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: "#333", fontWeight: "600", marginBottom: "8px" }}>
                  Company ID
                </label>
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="Enter company ID"
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
                  User Code
                </label>
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="Enter your user code"
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
            </>
          )}

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
              transition: "all 0.3s",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #eee", paddingTop: "20px" }}>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}>
              Sign up
            </Link>
          </p>
          <p style={{ color: "#999", fontSize: "12px", margin: "10px 0 0 0" }}>
            <Link to="/forgot-password" style={{ color: "#667eea", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
