import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Payers from "./pages/Payers";
import PayerDetail from "./pages/PayerDetail";
import Training from "./pages/Training";
import Denials from "./pages/Denials";
import ChangeLog from "./pages/ChangeLog";
import Admin from "./pages/Admin";
import Suggestions from "./pages/Suggestions";
import PayerRequests from "./pages/PayerRequests";
import Invoicing from "./pages/Invoicing";
import Claims from "./pages/Claims";
import Policies from "./pages/Policies";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/payers" element={<Payers />} />
              <Route path="/payers/:id" element={<PayerDetail />} />
              <Route path="/training" element={<Training />} />
              <Route path="/denials" element={<Denials />} />
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/change-log" element={<ChangeLog />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/suggestions" element={<Suggestions />} />
              <Route path="/payer-requests" element={<PayerRequests />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
