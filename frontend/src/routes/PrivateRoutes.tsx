// src/routes/PrivateRoutes.tsx

import { Route } from "react-router-dom";
import DefaultLayout from "../components/Layout/DefaultLayout";
import DashboardPage from "../pages/DashboardPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import { GalleryList } from "../pages/Dashboard/GalleryList";
import { GalleryEditor } from "../pages/Dashboard/GalleryEditor";
import RegisterPage from "../pages/RegisterPage";
import BrandingPage from "../pages/Settings/BrandingPage"
import { ClientsPage } from "../pages/crm/ClientsPage";
import { LeadsPage } from "../pages/crm/LeadsPage";
import { SessionsPage } from "../pages/crm/SessionsPage";
import { PackagesPage } from "../pages/crm/PackagesPage";
import { AddOnsPage } from "../pages/crm/AddOnsPage";
import { InvoicesPage } from "../pages/crm/InvoicesPage";
import { BusinessDashboardPage } from "../pages/crm/BusinessDashboardPage";


export const PrivateRoutes = (
  <>
    <Route path="/dashboard" element={<DefaultLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="crm/clients" element={<ClientsPage />} />
      <Route path="crm/leads" element={<LeadsPage />} />
      <Route path="crm/sessions" element={<SessionsPage />} />
      <Route path="crm/packages" element={<PackagesPage />} />
      <Route path="crm/addons" element={<AddOnsPage />} />
      <Route path="crm/invoices" element={<InvoicesPage />} />
      <Route path="crm/business-dashboard" element={<BusinessDashboardPage />} />
      {/* Galleries (nested under /dashboard) */}
      <Route path="galleries" element={<GalleryList />} />
      <Route path="galleries/:id" element={<GalleryEditor />} />

      {/* Other protected child routes */}
      <Route path="register" element={<RegisterPage />} />
      <Route path="admin/users" element={<AdminUsersPage />} />
      <Route path="branding" element={<BrandingPage />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
    </Route>
    {/* Settings */}
    <Route path="/settings" element={<div>Settings</div>} />
    <Route path="/settings/branding" element={<BrandingPage />} />
  </>
);
