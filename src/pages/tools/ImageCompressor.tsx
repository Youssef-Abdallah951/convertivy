import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Upload, Download, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "image-compressor")!;

type Result = {
  url: string;
  size: number;
  name: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ImageCompressor = () => {
  const [original, setOriginal] = useState<Result | null>(null);
  const [compressed, setCompressed] = useState<Result | null>(null);
  const [maxSizeMB, setMaxSizeMB] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setOriginal({ url: URL.createObjectURL(file), size: file.size, name: file.name });
    setCompressed(null);
    setLoading(true);
    try {
      const blob = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      setCompressed({
        url: URL.createObjectURL(blob),
        size: blob.size,
        name: `compressed-${file.name}`,
      });
      toast.success("Image compressed successfully");
    } catch (e) {
      toast.error("Failed to compress image. Try a different file.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setOriginal(null);
    setCompressed(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const savings =
    original && compressed ? Math.max(0, Math.round((1 - compressed.size / original.size) * 100)) : 0;

  return (
    <Layout>
      <div className="container max-w-5xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium">
            Target max size: <span className="text-primary">{maxSizeMB} MB</span>
          </label>
          <Slider
            value={[maxSizeMB]}
            min={0.1}
            max={5}
            step={0.1}
            onValueChange={(v) => setMaxSizeMB(v[0])}
            className="max-w-md"
          />
        </div>

        {!original ? (
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
              <p className="text-base font-semibold">Drop an image or click to upload</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, WEBP — up to 20MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <ImagePanel label="Original" data={original} />
            <ImagePanel
              label="Compressed"
              data={compressed}
              loading={loading}
              savings={savings}
              downloadable
            />
          </div>
        )}

        {original && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <ImageIcon className="mr-1.5 h-4 w-4" />
              Choose another
            </Button>
            <Button variant="ghost" onClick={reset}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

function ImagePanel({
  label,
  data,
  loading,
  savings,
  downloadable,
}: {
  label: string;
  data: Result | null;
  loading?: boolean;
  savings?: number;
  downloadable?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{label}</p>
        {data && (
          <span className="text-xs text-muted-foreground">
            {formatBytes(data.size)}
            {savings !== undefined && savings > 0 && (
              <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-success">−{savings}%</span>
            )}
          </span>
        )}
      </div>
      <div className="relative flex aspect-video items-center justify-center bg-muted/40">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : data ? (
          <img src={data.url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">Waiting...</p>
        )}
      </div>
      {downloadable && data && !loading && (
        <div className="border-t border-border p-3">
          <a href={data.url} download={data.name} className="block">
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

export default ImageCompressor;
