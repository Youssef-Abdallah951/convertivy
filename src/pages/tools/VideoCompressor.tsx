import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  Loader2,
  Video as VideoIcon,
  Trash2,
  Settings as SettingsIcon,
  ExternalLink,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "video-compressor")!;

const MAX_SIZE_MB = 100;
const STORAGE_KEY = "convertify.cloudinary.config";
const LAST_UPLOAD_KEY = "convertify.cloudinary.lastUpload";

type CloudinaryConfig = { cloudName: string; uploadPreset: string };

type UploadResult = {
  secure_url: string;
  bytes: number;
  format: string;
  public_id: string;
  original_filename?: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadConfig(): CloudinaryConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cloudName: "", uploadPreset: "" };
    return { cloudName: "", uploadPreset: "", ...JSON.parse(raw) };
  } catch {
    return { cloudName: "", uploadPreset: "" };
  }
}

const VideoCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [optimizedUrl, setOptimizedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [config, setConfig] = useState<CloudinaryConfig>(() => loadConfig());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<CloudinaryConfig>(config);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (!config.cloudName || !config.uploadPreset) {
      setSettingsOpen(true);
    }
    try {
      const lastRaw = localStorage.getItem(LAST_UPLOAD_KEY);
      if (lastRaw) {
        const last = JSON.parse(lastRaw) as UploadResult;
        setResult(last);
        setOptimizedUrl(buildOptimizedUrl(last.secure_url));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildOptimizedUrl(secureUrl: string) {
    // Inject q_auto,f_auto transformation after /upload/
    return secureUrl.replace("/upload/", "/upload/q_auto,f_auto/");
  }

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) {
      toast.error("Please select a valid video file (mp4, mov, webm).");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setResult(null);
    setOptimizedUrl(null);
    setProgress(0);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const compress = async () => {
    if (!file) return;
    if (!config.cloudName || !config.uploadPreset) {
      toast.error("Please configure your Cloudinary settings first.");
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    setProgress(0);
    setStage("Uploading to Cloudinary...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", config.uploadPreset);

    const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      config.cloudName,
    )}/video/upload`;

    try {
      const data = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("POST", url);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 95));
          }
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(json);
            } else {
              reject(new Error(json?.error?.message || `Upload failed (${xhr.status})`));
            }
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(formData);
      });

      setStage("Optimizing...");
      setProgress(100);
      setResult(data);
      const opt = buildOptimizedUrl(data.secure_url);
      setOptimizedUrl(opt);
      try {
        localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(data));
      } catch {}
      toast.success("Video uploaded and optimized");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      console.error(e);
      toast.error(msg);
    } finally {
      setLoading(false);
      setStage("");
      xhrRef.current = null;
    }
  };

  const downloadOptimized = async () => {
    if (!optimizedUrl) return;
    try {
      setStage("Preparing download...");
      const res = await fetch(optimizedUrl);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = (file?.name || result?.original_filename || "video").replace(
        /\.[^.]+$/,
        "",
      );
      const ext = blob.type.includes("webm") ? "webm" : "mp4";
      a.href = blobUrl;
      a.download = `${baseName}-compressed.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't download. Opening in a new tab instead.");
      window.open(optimizedUrl, "_blank");
    } finally {
      setStage("");
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setResult(null);
    setOptimizedUrl(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const saveSettings = () => {
    const cleaned: CloudinaryConfig = {
      cloudName: tempConfig.cloudName.trim(),
      uploadPreset: tempConfig.uploadPreset.trim(),
    };
    if (!cleaned.cloudName || !cleaned.uploadPreset) {
      toast.error("Both Cloud Name and Upload Preset are required.");
      return;
    }
    setConfig(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {}
    setSettingsOpen(false);
    toast.success("Cloudinary settings saved");
  };

  const originalSize = file?.size ?? 0;
  const compressedSize = result?.bytes ?? 0;
  const savings =
    originalSize && compressedSize
      ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
      : 0;

  return (
    <Layout>
      <div className="container max-w-5xl py-10 md:py-14">
        <div className="flex items-start justify-between gap-3">
          <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />
          <Dialog
            open={settingsOpen}
            onOpenChange={(o) => {
              setSettingsOpen(o);
              if (o) setTempConfig(config);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-1 shrink-0">
                <SettingsIcon className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cloudinary settings</DialogTitle>
                <DialogDescription>
                  Stored locally in your browser. Use an{" "}
                  <span className="font-medium">unsigned</span> upload preset — never paste your API
                  secret.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cloud-name">Cloud name</Label>
                  <Input
                    id="cloud-name"
                    placeholder="e.g. dxyz123ab"
                    value={tempConfig.cloudName}
                    onChange={(e) =>
                      setTempConfig((c) => ({ ...c, cloudName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-preset">Upload preset (unsigned)</Label>
                  <Input
                    id="upload-preset"
                    placeholder="e.g. convertify_unsigned"
                    value={tempConfig.uploadPreset}
                    onChange={(e) =>
                      setTempConfig((c) => ({ ...c, uploadPreset: e.target.value }))
                    }
                  />
                </div>
                <a
                  href="https://console.cloudinary.com/settings/upload"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Manage upload presets <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveSettings}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!file ? (
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
              <p className="text-base font-semibold">Drop a video or click to upload</p>
              <p className="text-sm text-muted-foreground">
                MP4, MOV, WEBM — up to {MAX_SIZE_MB}MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <VideoPanel label="Original" url={originalUrl} size={originalSize} />
              <VideoPanel
                label="Compressed"
                url={optimizedUrl}
                size={compressedSize}
                loading={loading}
                savings={savings}
              />
            </div>

            {loading && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{stage || "Processing..."}</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!optimizedUrl ? (
                <Button
                  onClick={compress}
                  disabled={loading}
                  className="gradient-primary text-primary-foreground shadow-glow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <VideoIcon className="mr-1.5 h-4 w-4" />
                      Compress video
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={downloadOptimized}
                  className="gradient-primary text-primary-foreground shadow-glow"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download compressed video
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Upload another video
              </Button>
              <Button variant="ghost" onClick={reset} disabled={loading}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Reset
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

function VideoPanel({
  label,
  url,
  size,
  loading,
  savings,
}: {
  label: string;
  url: string | null;
  size: number;
  loading?: boolean;
  savings?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{label}</p>
        {size > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatBytes(size)}
            {savings !== undefined && savings > 0 && (
              <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-success">
                −{savings}%
              </span>
            )}
          </span>
        )}
      </div>
      <div className="relative flex aspect-video items-center justify-center bg-muted/40">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : url ? (
          <video src={url} controls className="h-full w-full object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">Waiting...</p>
        )}
      </div>
    </div>
  );
}

export default VideoCompressor;
