import { useRef, useState } from "react";
import QRCode from "qrcode";
import { Upload, Loader2, QrCode, Copy, Trash2, Download } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tools } from "@/lib/tools";
import { supabase } from "@/integrations/supabase/client";

const tool = tools.find((t) => t.slug === "file-to-qr")!;
const MAX_BYTES = 25 * 1024 * 1024;

const FileToQr = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Max 25 MB.");
      return;
    }
    setFileName(file.name);
    setUrl(null);
    setQr(null);
    setLoading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${crypto.randomUUID()}/${safeName}`;
      const { error } = await supabase.storage
        .from("shared-files")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { data } = supabase.storage.from("shared-files").getPublicUrl(path);
      setUrl(data.publicUrl);

      const dataUrl = await QRCode.toDataURL(data.publicUrl, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setQr(dataUrl);
      toast.success("QR code generated");
    } catch (e) {
      console.error(e);
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const reset = () => {
    setFileName(null);
    setUrl(null);
    setQr(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        {!fileName ? (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center transition-base hover:border-primary/60 hover:bg-accent/40"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
              <Upload className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold">Drop a file or click to upload</p>
              <p className="text-sm text-muted-foreground">
                We'll upload it and turn the link into a QR code
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <QrCode className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "Uploading..." : url ? "QR ready to scan" : "Preparing"}
                  </p>
                </div>
              </div>

              {url && (
                <div className="mt-5 flex gap-2">
                  <Input value={url} readOnly className="font-mono text-xs" />
                  <Button onClick={copy} variant="outline">
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload another
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Reset
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-muted/40">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : qr ? (
                  <img src={qr} alt="QR code" className="h-full w-full rounded-xl" />
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting...</p>
                )}
              </div>
              {qr && (
                <a href={qr} download={`qr-${fileName}.png`} className="w-full">
                  <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download QR
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FileToQr;
