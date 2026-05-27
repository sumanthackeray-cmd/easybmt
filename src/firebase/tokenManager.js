import { onIdTokenChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";

let sessionUnsubscribe = null;

const handleLogout = async (reason) => {
  try {
    const companyId = localStorage.getItem("company_id");
    const sessionId = localStorage.getItem("session_id");
    if (companyId && sessionId) {
      const sessionRef = doc(db, `companies/${companyId}/sessions`, sessionId);
      await updateDoc(sessionRef, {
        is_active: false,
        logout_at: new Date().toISOString(),
        logout_reason: reason || "Logout"
      });
    }
  } catch (e) {
    console.error("Error closing session:", e);
  } finally {
    localStorage.clear();
    await signOut(auth);
    window.location.href = "/login?expired=1";
  }
};

export const initTokenManager = () => {
  // Only monitor activity when user is authenticated
  const handleAuthChange = onIdTokenChanged(auth, async (user) => {
    if (user) {
      try {
        const tokenResult = await user.getIdTokenResult();
        localStorage.setItem("base44_access_token", tokenResult.token);
        
        // Listen to concurrent session state
        const companyId = tokenResult.claims.company_id || localStorage.getItem("company_id");
        const sessionId = localStorage.getItem("session_id");
        
        if (companyId && sessionId) {
          if (sessionUnsubscribe) sessionUnsubscribe();
          
          const sessionRef = doc(db, `companies/${companyId}/sessions`, sessionId);
          sessionUnsubscribe = onSnapshot(sessionRef, (snapshot) => {
            if (snapshot.exists()) {
              const sessionData = snapshot.data();
              if (sessionData.is_active === false) {
                console.warn("Session terminated by server or concurrent login.");
                handleLogout("Session terminated.");
              }
            }
          });
        }
      } catch (err) {
        console.error("Token refresh processing error:", err);
      }
    } else {
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
        sessionUnsubscribe = null;
      }
    }
  });

  return () => {
    handleAuthChange();
    if (sessionUnsubscribe) {
      sessionUnsubscribe();
    }
  };
};
