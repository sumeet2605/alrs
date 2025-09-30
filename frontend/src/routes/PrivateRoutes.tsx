// src/routes/PrivateRoutes.tsx
import React from "react";
import { Route } from "react-router-dom";
import DefaultLayout from "../components/Layout/DefaultLayout";
import DashboardPage from "../pages/DashboardPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import { GalleryList } from "../pages/Dashboard/GalleryList";
import { GalleryEditor } from "../pages/Dashboard/GalleryEditor";
import RegisterPage from "../pages/RegisterPage";

export const PrivateRoutes = (
  <>
    <Route path="/dashboard" element={<DefaultLayout />}>
      <Route index element={<DashboardPage />} />

      {/* Galleries (nested under /dashboard) */}
      <Route path="galleries" element={<GalleryList />} />
      <Route path="galleries/:id" element={<GalleryEditor />} />

      {/* Other protected child routes */}
      <Route path="register" element={<RegisterPage />} />
      <Route path="admin/users" element={<AdminUsersPage />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
    </Route>
  </>
);
