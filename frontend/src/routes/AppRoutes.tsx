// src/routes/AppRoutes.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { PublicRoutes } from "./PublicRoutes";
import { PrivateRoutes } from "./PrivateRoutes";
import { useAuth } from "../contexts/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

export default function AppRoutes() {
  const { isRefreshing } = useAuth();

  return (
    <BrowserRouter>
      {/* global refresh overlay while auth is rehydrating */}
      {isRefreshing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress color="primary" size={60} />
        </div>
      )}

      <Routes>
        {/* PUBLIC ROUTES (landing pages, login, forgot/reset, public gallery) */}
        {PublicRoutes}

        {/* PRIVATE ROUTES: grouped under <PrivateRoute /> which checks auth */}
        <Route element={<PrivateRoute />}>{PrivateRoutes}</Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
