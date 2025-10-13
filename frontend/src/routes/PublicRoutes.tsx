// src/routes/PublicRoutes.tsx
import { Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import PublicGalleryView from "../pages/PublicGalleryView";

export const PublicRoutes = (
  <>
    {/* Redirect root to /login */}
    <Route path="/" element={<Navigate to="/login" replace />} />

    {/* Auth pages */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />

    {/* Shareable public gallery */}
    <Route path="/g/:id" element={<PublicGalleryView />} />

    {/* Simple health check */}
    <Route path="/health" element={<p>Health Check OK</p>} />
  </>
);
