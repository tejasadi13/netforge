import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardHome from "@/pages/DashboardHome";
import CreateTopology from "@/pages/CreateTopology";
import SavedTopologies from "@/pages/SavedTopologies";
import DepartmentsPage from "@/pages/DepartmentsPage";
import SecurityAnalysis from "@/pages/SecurityAnalysis";
import CiscoPage from "@/pages/CiscoPage";
import GNS3Integration from "@/pages/GNS3Integration";
import ProfilePage from "@/pages/ProfilePage";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="create" element={<CreateTopology />} />
              <Route path="saved" element={<SavedTopologies />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="security" element={<SecurityAnalysis />} />
              <Route path="cisco" element={<CiscoPage />} />
              <Route path="gns3" element={<GNS3Integration />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
