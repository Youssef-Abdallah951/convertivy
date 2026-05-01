import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Upload, Download, Loader2, Video as VideoIcon, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "video-compressor")!;

const MAX_SIZE_MB = 100;

type Level = "low" | "medium" | "high";
type Resolution = "original" | "720" | "480";
type Format = "mp4" | "webm";

const CRF: Record<Level, string> = {
  low: "23",
  medium: "28",
  high: "34",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const VideoCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [outputName, setOutputName] = useState<string>("compressed.mp4");
  const [level, setLevel] = useState<Level>("medium");
  const [resolution, setResolution] = useState<Resolution>("original");
  const [format, setFormat] = useState<Format>("mp4");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    setStage("Loading compressor (first time may take a moment)...");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg.on("progress", ({ progress }) => {
      setProgress(Math.min(99, Math.round(progress * 100)));
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) {
      toast.error("Please select a valid video file.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setOutputUrl(null);
    setOutputSize(0);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setOutputUrl(null);
    try {
      const ffmpeg = await loadFFmpeg();
      const inputName = `input_${Date.now()}`;
      const outName = `output.${format}`;
      setStage("Reading file...");
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const args: string[] = ["-i", inputName];

      if (resolution !== "original") {
        args.push("-vf", `scale=-2:${resolution}`);
      }

      if (format === "mp4") {
        args.push(
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", CRF[level],
          "-c:a", "aac",
          "-b:a", "128k",
        );
      } else {
        // webm
        args.push(
          "-c:v", "libvpx",
          "-b:v", level === "low" ? "1M" : level === "medium" ? "600k" : "300k",
          "-c:a", "libvorbis",
        );
      }

      args.push(outName);

      setStage("Compressing video...");
      await ffmpeg.exec(args);

      setStage("Finalizing...");
      const data = await ffmpeg.readFile(outName);
      const bytes = data as Uint8Array;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buf], {
        type: format === "mp4" ? "video/mp4" : "video/webm",
      });
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setOutputName(`${baseName}-compressed.${format}`);
      setProgress(100);
      toast.success("Video compressed successfully");

      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outName);
      } catch {}
    } catch (e) {
      console.error(e);
      toast.error("Failed to compress video. Try a smaller file or different settings.");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  const reset = () => {
    setFile(null);
    setOriginalUrl(null);
    setOutputUrl(null);
    setOutputSize(0);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const savings =
    file && outputSize ? Math.max(0, Math.round((1 - outputSize / file.size) * 100)) : 0;

  return (
    <Layout>
      <div className="container max-w-5xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

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
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Compression level</label>
                  <Select value={level} onValueChange={(v) => setLevel(v as Level)} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (high quality)</SelectItem>
                      <SelectItem value="medium">Medium (balanced)</SelectItem>
                      <SelectItem value="high">High (smallest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Resolution</label>
                  <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="720">720p</SelectItem>
                      <SelectItem value="480">480p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Output format</label>
                  <Select value={format} onValueChange={(v) => setFormat(v as Format)} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                      <SelectItem value="webm">WebM (VP8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <VideoPanel label="Original" url={originalUrl} size={file.size} />
              <VideoPanel
                label="Compressed"
                url={outputUrl}
                size={outputSize}
                loading={loading}
                savings={savings}
                downloadUrl={outputUrl}
                downloadName={outputName}
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
              <Button
                onClick={compress}
                disabled={loading}
                className="gradient-primary text-primary-foreground shadow-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <VideoIcon className="mr-1.5 h-4 w-4" />
                    Compress video
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
                <Upload className="mr-1.5 h-4 w-4" />
                Choose another
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
  downloadUrl,
  downloadName,
}: {
  label: string;
  url: string | null;
  size: number;
  loading?: boolean;
  savings?: number;
  downloadUrl?: string | null;
  downloadName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{label}</p>
        {size > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatBytes(size)}
            {savings !== undefined && savings > 0 && (
              <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-success">−{savings}%</span>
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
      {downloadUrl && !loading && (
        <div className="border-t border-border p-3">
          <a href={downloadUrl} download={downloadName} className="block">
            <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

export default VideoCompressor;
