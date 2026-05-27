import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

/**
 * A route-level guard that verifies if the current user has permission
 * to view the requested page based on the new granular permission system.
 */
export default function PageRouteGuard({ pageKey, actionKey = "view", children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Owner always has absolute access
  if (user.role === "owner") {
    return children;
  }

  const pagePerms = user.permissions?.[pageKey];
  const isAllowed = !!(pagePerms?.[actionKey] || pagePerms?.view);

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
