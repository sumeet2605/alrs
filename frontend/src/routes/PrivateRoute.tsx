// src/routes/PrivateRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

export default function PrivateRoute() {
  const { isAuthenticated, isRefreshing } = useAuth();

  if (isRefreshing) {
    // while auth is checking, show a centered spinner (this is optional because AppRoutes shows a global spinner too)
    return (
      <div
        style={{
          width: "100%",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // authorized → render nested private routes
  return <Outlet />;
}
