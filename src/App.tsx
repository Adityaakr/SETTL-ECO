import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { AppLayout } from "@/components/layout/AppLayout";
import { SettlProvider } from "@/context/settl-context";
import { privyConfig } from "@/lib/privy-config";
import { wagmiConfig } from "@/lib/wagmi-config";
import Landing from "@/pages/Landing";
import Connect from "@/pages/Connect";
import NotFound from "@/pages/NotFound";
import PayInvoice from "@/pages/PayInvoice";
import Dashboard from "@/pages/app/Dashboard";
import SellerWorkspace from "@/pages/app/SellerWorkspace";
import BuyerWorkspace from "@/pages/app/BuyerWorkspace";
import CapitalWorkspace from "@/pages/app/CapitalWorkspace";
import Pipeline from "@/pages/app/Pipeline";
import Settlements from "@/pages/app/Settlements";
import RiskWorkspace from "@/pages/app/RiskWorkspace";
import AdminWorkspace from "@/pages/app/AdminWorkspace";
import Analytics from "@/pages/app/Analytics";
import ActivityPage from "@/pages/app/Activity";
import Settings from "@/pages/app/Settings";

const queryClient = new QueryClient();
const hasValidPrivyAppId = Boolean(privyConfig.appId?.trim());

function AppContent() {
  return (
    <SettlProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/pay/:invoiceId" element={<PayInvoice />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="seller" element={<SellerWorkspace />} />
              <Route path="buyer" element={<BuyerWorkspace />} />
              <Route path="capital" element={<CapitalWorkspace />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="settlements" element={<Settlements />} />
              <Route path="risk" element={<RiskWorkspace />} />
              <Route path="admin" element={<AdminWorkspace />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SettlProvider>
  );
}

export default function App() {
  const body = <AppContent />;

  return (
    <QueryClientProvider client={queryClient}>
      {hasValidPrivyAppId ? (
        <PrivyProvider appId={privyConfig.appId} config={privyConfig.config}>
          <WagmiProvider config={wagmiConfig}>{body}</WagmiProvider>
        </PrivyProvider>
      ) : (
        body
      )}
    </QueryClientProvider>
  );
}
