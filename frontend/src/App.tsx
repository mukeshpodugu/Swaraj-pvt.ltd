import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout Imports
import MainLayout from './components/MainLayout';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import ChitFunds from './pages/ChitFunds';
import LicPolicies from './pages/LicPolicies';
import AIPredictions from './pages/AIPredictions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CustomerPortal from './pages/CustomerPortal';

const queryClient = new QueryClient();

// Route Protection Guard
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If client tries to access backoffice, send to portal
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/portal" replace />;
    }
    // Otherwise send to default dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const backofficeRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'];

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Access */}
            <Route path="/" element={<Login />} />

            {/* Customer Mobile Portal (Client Role Only) */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerPortal />
                </ProtectedRoute>
              }
            />

            {/* Backoffice Administration Pages (MainLayout Wrap) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <Customers />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/loans"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <Loans />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/chits"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <ChitFunds />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/lic"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <LicPolicies />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/ai-predictions"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <AIPredictions />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={backofficeRoles}>
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
