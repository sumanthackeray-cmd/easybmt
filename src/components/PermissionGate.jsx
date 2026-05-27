/**
 * PermissionGate.jsx
 * ==================
 * Shows a beautiful full-screen permission request flow on first app launch.
 * Uses Capacitor's native permission APIs to request Android runtime permissions.
 * Saves granted/denied state to localStorage so it only asks once.
 */

import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

// Individual permission item config
const PERMISSION_ITEMS = [
  {
    id: "camera",
    icon: "📷",
    title: "Camera",
    description: "Barcode & QR scanner for quick product lookup",
    required: false,
  },
  {
    id: "microphone",
    icon: "🎤",
    title: "Microphone",
    description: "Voice search & hands-free voice input",
    required: false,
  },
  {
    id: "contacts",
    icon: "👥",
    title: "Contacts",
    description: "Import customer contacts directly from your phone",
    required: false,
  },
  {
    id: "location",
    icon: "📍",
    title: "Location",
    description: "Bluetooth printer discovery & delivery tracking",
    required: false,
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "Notifications",
    description: "Payment reminders & order status alerts",
    required: false,
  },
  {
    id: "storage",
    icon: "💾",
    title: "Storage",
    description: "Save & share invoice PDFs locally",
    required: false,
  },
];

const STORAGE_KEY = "easybmt_permissions_requested_v2";

export default function PermissionGate({ children }) {
  const [showGate, setShowGate] = useState(false);
  const [grantedMap, setGrantedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("list"); // "list" | "done"

  // Check if we are on native Android and haven't asked before
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const alreadyAsked = localStorage.getItem(STORAGE_KEY);
    if (isNative && !alreadyAsked) {
      setShowGate(true);
    }
  }, []);

  // Request a single permission category using native API
  const requestPermission = useCallback(async (id) => {
    try {
      // Use Capacitor's permissions API if available
      if (window.Capacitor?.Plugins?.Camera && id === "camera") {
        const result = await window.Capacitor.Plugins.Camera.requestPermissions();
        return result?.camera === "granted";
      }
      if (window.Capacitor?.Plugins?.Geolocation && id === "location") {
        const result = await window.Capacitor.Plugins.Geolocation.requestPermissions();
        return result?.location === "granted";
      }
      if (window.Capacitor?.Plugins?.LocalNotifications && id === "notifications") {
        const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        return result?.display === "granted";
      }
      // For others (microphone, contacts, storage) – use the generic approach
      // They will be requested when actually used by the feature
      return "deferred";
    } catch {
      return false;
    }
  }, []);

  // Grant all permissions one by one
  const handleGrantAll = useCallback(async () => {
    setLoading(true);
    const results = {};
    for (const item of PERMISSION_ITEMS) {
      const res = await requestPermission(item.id);
      results[item.id] = res;
    }
    setGrantedMap(results);
    // Save permanently – both grant and deny status
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...results, timestamp: Date.now() }));
    setLoading(false);
    setStep("done");
  }, [requestPermission]);

  // Skip – save that we asked, never ask again
  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true, timestamp: Date.now() }));
    setShowGate(false);
  }, []);

  const handleFinish = useCallback(() => {
    setShowGate(false);
  }, []);

  if (!showGate) return children;

  return (
    <>
      {children}
      {/* Full-screen overlay on top */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          overflowY: "auto",
          padding: "env(safe-area-inset-top, 24px) 0 env(safe-area-inset-bottom, 24px) 0",
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, padding: "20px 24px 32px" }}>

          {step === "list" ? (
            <>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 24,
                  background: "linear-gradient(135deg, #f97316, #fb923c)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 40, margin: "0 auto 16px",
                  boxShadow: "0 20px 40px rgba(249,115,22,0.4)",
                }}>🔐</div>
                <h1 style={{ color: "#f8fafc", fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>
                  Setup Permissions
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  EasyBMT needs a few permissions to unlock its full power. You can change these anytime in Settings.
                </p>
              </div>

              {/* Permission cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {PERMISSION_ITEMS.map((item) => (
                  <div key={item.id} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: "rgba(249,115,22,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{item.title}</div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <button
                onClick={handleGrantAll}
                disabled={loading}
                style={{
                  width: "100%", padding: "16px",
                  background: loading ? "#475569" : "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "#fff", border: "none", borderRadius: 16,
                  fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  marginBottom: 12,
                  boxShadow: loading ? "none" : "0 8px 24px rgba(249,115,22,0.4)",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "⏳ Requesting Permissions..." : "✅ Allow All Permissions"}
              </button>
              <button
                onClick={handleSkip}
                style={{
                  width: "100%", padding: "14px",
                  background: "transparent",
                  color: "#64748b", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, fontSize: 14, cursor: "pointer",
                }}
              >
                Skip for now (some features may be limited)
              </button>
            </>
          ) : (
            /* Done screen */
            <>
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: 50,
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 50, margin: "0 auto 24px",
                  boxShadow: "0 20px 40px rgba(34,197,94,0.4)",
                  animation: "pop 0.4s ease",
                }}>✅</div>
                <h1 style={{ color: "#f8fafc", fontSize: 28, fontWeight: 800, margin: "0 0 12px" }}>
                  All Set!
                </h1>
                <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                  Permissions have been configured. EasyBMT is ready to give you the best billing experience!
                </p>
                <button
                  onClick={handleFinish}
                  style={{
                    width: "100%", padding: "16px",
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "#fff", border: "none", borderRadius: 16,
                    fontSize: 16, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(249,115,22,0.4)",
                  }}
                >
                  🚀 Start Using EasyBMT
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
