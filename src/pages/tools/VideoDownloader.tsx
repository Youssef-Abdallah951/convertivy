import { useState } from "react";
import { Loader2, Video, Music, Download, Clipboard, Copy } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { tools } from "@/lib/tools";
import { supabase } from "@/integrations/supabase/client";

const tool = tools.find((t) => t.slug === "video-downloader")!;

type DownloadFormat = {
  type: "video" | "audio";
  quality: string;
  url: string;
  ext?: string;
  size?: string;
};

type DownloadResult = {
  title: string;
  thumbnail: string;
  platform: string;
  duration?: string;
  formats: DownloadFormat[];
};

const VideoDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please paste a video link first.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      toast.error("Please enter a valid URL (including https://).");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("video-downloader", {
        body: { url: trimmed },
      });

      if (error) {
        const msg = (error as { message?: string }).message || "Failed to fetch video.";
        // Try to surface server error message if available
        const ctx = (error as { context?: { error?: string } }).context;
        throw new Error(ctx?.error || msg);
      }
      if (data?.error) throw new Error(data.error);

      setResult(data as DownloadResult);
      toast.success("Video found!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fmt: DownloadFormat) => {
    // Open in new tab — direct download often blocked by CORS on third-party CDNs
    window.open(fmt.url, "_blank", "noopener,noreferrer");
  };

  const copyTitle = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.title);
    toast.success("Title copied");
  };

  const reset = () => {
    setUrl("");
    setResult(null);
  };

  const videoFormats = result?.formats.filter((f) => f.type === "video") ?? [];
  const audioFormats = result?.formats.filter((f) => f.type === "audio") ?? [];

  return (
    <Layout>
      <ToolPageHeader
        title={tool.title}
        description={tool.description}
        icon={tool.icon}
        category={tool.category}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a YouTube, Facebook, Instagram or TikTok link…"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleFetch()}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePaste}
                  disabled={loading}
                  className="shrink-0"
                >
                  <Clipboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Paste</span>
                </Button>
                <Button onClick={handleFetch} disabled={loading} className="shrink-0">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Fetch
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports YouTube, Facebook, Instagram, and TikTok. Respect copyright and platform terms of service.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Fetching video info…</span>
            </CardContent>
          </Card>
        )}

        {result && !loading && (
          <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-6">
              {result.thumbnail ? (
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="aspect-video w-full rounded-md object-cover sm:aspect-auto sm:h-auto"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md bg-muted sm:aspect-auto">
                  <Video className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{result.platform}</Badge>
                  {result.duration && <Badge variant="outline">{result.duration}</Badge>}
                </div>
                <h2 className="text-lg font-semibold leading-snug">{result.title}</h2>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={copyTitle}>
                    <Copy className="h-4 w-4" /> Copy title
                  </Button>
                  <Button size="sm" variant="ghost" onClick={reset}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="space-y-6 border-t p-4 sm:p-6">
              {videoFormats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Video className="h-4 w-4" /> Video
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {videoFormats.map((fmt, i) => (
                      <Button
                        key={`v-${i}`}
                        variant="outline"
                        className="justify-between"
                        onClick={() => handleDownload(fmt)}
                      >
                        <span className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          {fmt.quality}
                          <span className="text-xs uppercase text-muted-foreground">{fmt.ext}</span>
                        </span>
                        {fmt.size && <span className="text-xs text-muted-foreground">{fmt.size}</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {audioFormats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Music className="h-4 w-4" /> Audio
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {audioFormats.map((fmt, i) => (
                      <Button
                        key={`a-${i}`}
                        variant="outline"
                        className="justify-between"
                        onClick={() => handleDownload(fmt)}
                      >
                        <span className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          {fmt.quality}
                          <span className="text-xs uppercase text-muted-foreground">{fmt.ext}</span>
                        </span>
                        {fmt.size && <span className="text-xs text-muted-foreground">{fmt.size}</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Downloads open in a new tab. If a download doesn't start, right-click the link and choose "Save as".
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default VideoDownloader;
