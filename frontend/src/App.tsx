// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';

// Import Page Components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DefaultLayout from './components/DefaultLayout';
import { GalleryList } from './pages/Dashboard/GalleryList';
import { GalleryEditor } from './pages/Dashboard/GalleryEditor';
import PublicGalleryView from './pages/PublicGalleryView';
// import NotFoundPage from './pages/NotFoundPage';

// Simple Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    // If not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const { isRefreshing } = useAuth();

  return (
    <>
      {isRefreshing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CircularProgress color="primary" size={60} />
        </div>
      )}

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Public gallery viewer (shareable) */}
+        <Route path="/g/:id" element={<PublicGalleryView />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/health" element={<p>Health Check OK</p>} />

        {/* PROTECTED ROUTES - DefaultLayout wraps all /dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DefaultLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard index */}
          <Route index element={<DashboardPage />} />

          {/* Galleries (nested under /dashboard) */}
          <Route path="galleries" element={<GalleryList />} />
          <Route path="galleries/:id" element={<GalleryEditor />} />

          {/* Other protected child routes */}
          <Route path="register" element={<RegisterPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />

          {/* You can add more nested routes here */}
        </Route>

        {/* Optionally: fallback / not found */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </>
  );
};

export default App;
