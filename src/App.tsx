import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Pricing from "./pages/Pricing.tsx";
import Payment from "./pages/Payment.tsx";
import AdminPaymentRequests from "./pages/admin/PaymentRequests.tsx";

import JsonFormatter from "./pages/tools/JsonFormatter.tsx";
import ImageCompressor from "./pages/tools/ImageCompressor.tsx";
import FileToQr from "./pages/tools/FileToQr.tsx";
import FileToLink from "./pages/tools/FileToLink.tsx";
import LinkToFile from "./pages/tools/LinkToFile.tsx";
import CodeGenerator from "./pages/tools/CodeGenerator.tsx";
import UnitConverter from "./pages/tools/UnitConverter.tsx";
import StudyTimer from "./pages/tools/StudyTimer.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment/:packageId" element={<Payment />} />
              <Route path="/admin/payments" element={<AdminPaymentRequests />} />

              <Route path="/tools/json-formatter" element={<JsonFormatter />} />
              <Route path="/tools/image-compressor" element={<ImageCompressor />} />
              <Route path="/tools/file-to-qr" element={<FileToQr />} />
              <Route path="/tools/file-to-link" element={<FileToLink />} />
              <Route path="/tools/link-to-file" element={<LinkToFile />} />
              <Route path="/tools/code-generator" element={<CodeGenerator />} />
              <Route path="/tools/unit-converter" element={<UnitConverter />} />
              <Route path="/tools/study-timer" element={<StudyTimer />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
