import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import WordCounter from "./pages/tools/WordCounter.tsx";
import JsonFormatter from "./pages/tools/JsonFormatter.tsx";
import TextSummarizer from "./pages/tools/TextSummarizer.tsx";
import ImageCompressor from "./pages/tools/ImageCompressor.tsx";
import WordToPdf from "./pages/tools/WordToPdf.tsx";
import FileToQr from "./pages/tools/FileToQr.tsx";
import FileToLink from "./pages/tools/FileToLink.tsx";
import QrScanner from "./pages/tools/QrScanner.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tools/word-counter" element={<WordCounter />} />
            <Route path="/tools/json-formatter" element={<JsonFormatter />} />
            <Route path="/tools/text-summarizer" element={<TextSummarizer />} />
            <Route path="/tools/image-compressor" element={<ImageCompressor />} />
            <Route path="/tools/word-to-pdf" element={<WordToPdf />} />
            <Route path="/tools/file-to-qr" element={<FileToQr />} />
            <Route path="/tools/file-to-link" element={<FileToLink />} />
            <Route path="/tools/qr-scanner" element={<QrScanner />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
