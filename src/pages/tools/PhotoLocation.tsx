import { useCallback, useRef, useState } from "react";
import exifr from "exifr";
import { Copy, ExternalLink, Image as ImageIcon, Upload, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tools } from "@/lib/tools";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tool = tools.find((t) => t.slug === "photo-location")!;

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff"];

type GpsResult = {
  latitude: number;
  longitude: number;
  mapLink: string;
  embedLink: string;
};

type ExtraInfo = {
  date?: string;
  make?: string;
  model?: string;
  software?: string;
};

export default function PhotoLocation() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsResult | null>(null);
  const [extra, setExtra] = useState<ExtraInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [noLocation, setNoLocation] = useState(false);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setGps(null);
    setExtra(null);
    setError(null);
    setNoLocation(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setGps(null);
    setExtra(null);
    setNoLocation(false);

    if (!ACCEPTED.includes(file.type) && !/\.(jpe?g|png|webp|tiff?)$/i.test(file.name)) {
      setError("Please upload a JPG, PNG, WEBP, or TIFF image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File is too large. Max size is 10MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setLoading(true);

    try {
      const data = await exifr.parse(file, {
        gps: true,
        pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate", "Make", "Model", "Software"],
      });

      const lat = data?.latitude;
      const lon = data?.longitude;

      if (typeof lat === "number" && typeof lon === "number" && !Number.isNaN(lat) && !Number.isNaN(lon)) {
        setGps({
          latitude: lat,
          longitude: lon,
          mapLink: `https://www.google.com/maps?q=${lat},${lon}`,
          embedLink: `https://www.google.com/maps?q=${lat},${lon}&hl=en&z=15&output=embed`,
        });
      } else {
        setNoLocation(true);
      }

      const date = data?.DateTimeOriginal ?? data?.CreateDate;
      setExtra({
        date: date instanceof Date ? date.toLocaleString() : date ? String(date) : undefined,
        make: data?.Make,
        model: data?.Model,
        software: data?.Software,
      });
    } catch (e) {
      console.error(e);
      setError("Could not read this image. It may be corrupted or unsupported.");
    } finally {
      setLoading(false);
    }
  }, [previewUrl]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const copyCoords = async () => {
    if (!gps) return;
    await navigator.clipboard.writeText(`${gps.latitude}, ${gps.longitude}`);
    toast({ title: "Copied", description: "Coordinates copied to clipboard." });
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-base",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-6 w-6" />
          </span>
          <p className="font-medium">Drop an image here, or click to browse</p>
          <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP or TIFF — up to 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/tiff"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {previewUrl && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span className="truncate">{fileName}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove image">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <img
                  src={previewUrl}
                  alt="Uploaded preview"
                  className="h-64 w-full rounded-lg object-cover"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <h2 className="text-lg font-semibold">Result</h2>

                {loading && (
                  <p className="text-sm text-muted-foreground">Reading metadata…</p>
                )}

                {!loading && gps && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Latitude</p>
                        <p className="font-mono text-sm">{gps.latitude.toFixed(6)}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Longitude</p>
                        <p className="font-mono text-sm">{gps.longitude.toFixed(6)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <a href={gps.mapLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Open in Google Maps
                        </a>
                      </Button>
                      <Button variant="outline" onClick={copyCoords}>
                        <Copy className="h-4 w-4" />
                        Copy coordinates
                      </Button>
                    </div>
                  </>
                )}

                {!loading && noLocation && (
                  <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No location data found in this image. Many photos have GPS info stripped by social
                    networks or messaging apps.
                  </p>
                )}

                {!loading && extra && (extra.date || extra.make || extra.model || extra.software) && (
                  <div className="space-y-1 border-t pt-3 text-sm">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                      Additional info
                    </p>
                    {extra.date && (
                      <p>
                        <span className="text-muted-foreground">Taken: </span>
                        {extra.date}
                      </p>
                    )}
                    {(extra.make || extra.model) && (
                      <p>
                        <span className="text-muted-foreground">Device: </span>
                        {[extra.make, extra.model].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {extra.software && (
                      <p>
                        <span className="text-muted-foreground">Software: </span>
                        {extra.software}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {gps && (
              <Card className="md:col-span-2">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Map preview</h3>
                  <div className="overflow-hidden rounded-lg border">
                    <iframe
                      title="Photo location map"
                      src={gps.embedLink}
                      className="h-80 w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
