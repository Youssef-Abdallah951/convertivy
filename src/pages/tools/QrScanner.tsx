import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, StopCircle, Copy, ExternalLink, ScanLine } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "qr-scanner")!;
const ELEMENT_ID = "qr-scanner-region";

const QrScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const decodedRef = useRef(false);

  const stop = async () => {
    const s = scannerRef.current;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const start = async () => {
    setResult(null);
    decodedRef.current = false;
    setScanning(true);

    // Wait for the scanner region to be in the DOM
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const el = document.getElementById(ELEMENT_ID);
    if (!el) {
      toast.error("Scanner not ready. Please try again.");
      setScanning(false);
      return;
    }

    try {
      const scanner = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (decodedRef.current) return;
          decodedRef.current = true;
          setResult(decoded);
          toast.success("QR code decoded");
          // Defer stop so we don't tear down mid-callback
          setTimeout(() => {
            stop();
          }, 0);
        },
        () => {
          // ignore decode errors per frame
        },
      );
    } catch (e: any) {
      console.error("QR scanner error:", e);
      const msg =
        typeof e === "string"
          ? e
          : e?.message ||
            "Could not access camera. Please grant camera permission and use HTTPS.";
      toast.error(msg);
      scannerRef.current = null;
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Copied");
  };

  const isUrl = result ? /^(https?:\/\/|mailto:|tel:)/i.test(result) : false;

  return (
    <Layout>
      <div className="container max-w-3xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div
            id={ELEMENT_ID}
            className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-muted/50"
          >
            {!scanning && !result && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <ScanLine className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tap "Start camera" and point at any QR code
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {!scanning ? (
              <Button
                onClick={start}
                className="gradient-primary text-primary-foreground shadow-glow"
              >
                <Camera className="mr-1.5 h-4 w-4" />
                Start camera
              </Button>
            ) : (
              <Button onClick={stop} variant="outline">
                <StopCircle className="mr-1.5 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-md animate-fade-in">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Decoded content
            </h2>
            <p className="break-all rounded-lg bg-muted/50 p-4 font-mono text-sm">{result}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={copy} variant="outline">
                <Copy className="mr-1.5 h-4 w-4" />
                Copy
              </Button>
              {isUrl && (
                <a href={result} target="_blank" rel="noreferrer">
                  <Button className="gradient-primary text-primary-foreground shadow-glow">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open link
                  </Button>
                </a>
              )}
              <Button variant="ghost" onClick={start}>
                <Camera className="mr-1.5 h-4 w-4" />
                Scan another
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default QrScanner;
