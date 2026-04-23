import { useState } from "react";
import { Loader2, Link2, Download, Trash2, FileDown } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "link-to-file")!;

type FetchedFile = {
  name: string;
  size: number;
  type: string;
  blobUrl: string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const LinkToFile = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<FetchedFile | null>(null);

  const fetchFile = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please paste a link first.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      toast.error("Please enter a valid URL (including https://).");
      return;
    }

    setLoading(true);
    if (file) URL.revokeObjectURL(file.blobUrl);
    setFile(null);

    try {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-url-file`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        let message = `Failed to fetch (status ${res.status}).`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        toast.error(message);
        return;
      }

      const blob = await res.blob();
      const headerName = res.headers.get("x-filename");
      let name = "download";
      if (headerName) {
        try {
          name = decodeURIComponent(headerName);
        } catch {
          name = headerName;
        }
      }
      const blobUrl = URL.createObjectURL(blob);
      setFile({
        name,
        size: blob.size,
        type: blob.type || "application/octet-stream",
        blobUrl,
      });
      toast.success("File ready to download");
    } catch (e) {
      console.error(e);
      toast.error("Could not retrieve file. Please try a different link.");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = file.blobUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    if (file) URL.revokeObjectURL(file.blobUrl);
    setFile(null);
    setUrl("");
  };

  return (
    <Layout>
      <div className="container max-w-3xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <label className="text-sm font-medium" htmlFor="url">
            File URL
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) fetchFile();
              }}
              disabled={loading}
              className="font-mono text-xs"
            />
            <Button
              onClick={fetchFile}
              disabled={loading}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Fetch file
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste a direct link to a file (PDF, image, document, etc.). Max 50 MB.
          </p>

          {file && (
            <div className="mt-6 rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Link2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {file.type}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={download}
                  className="gradient-primary text-primary-foreground shadow-glow"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LinkToFile;
