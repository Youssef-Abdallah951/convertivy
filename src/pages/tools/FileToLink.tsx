import { useRef, useState } from "react";
import { Upload, Loader2, Link2, Copy, Trash2, ExternalLink } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tools } from "@/lib/tools";
import { supabase } from "@/integrations/supabase/client";

const tool = tools.find((t) => t.slug === "file-to-link")!;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const FileToLink = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Max 25 MB.");
      return;
    }
    setFileName(file.name);
    setUrl(null);
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
      toast.success("Link generated");
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
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="container max-w-3xl py-10 md:py-14">
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
              <p className="text-sm text-muted-foreground">Up to 25 MB — get an instant share link</p>
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
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Link2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Uploading..." : url ? "Ready to share" : "Preparing"}
                </p>
              </div>
            </div>

            {loading && (
              <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading your file...
              </div>
            )}

            {url && (
              <div className="mt-5 space-y-3">
                <div className="flex gap-2">
                  <Input value={url} readOnly className="font-mono text-xs" />
                  <Button onClick={copy} variant="outline">
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <a href={url} target="_blank" rel="noreferrer">
                  <Button className="gradient-primary text-primary-foreground shadow-glow">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open link
                  </Button>
                </a>
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

            <p className="mt-4 text-xs text-muted-foreground">
              Anyone with this link can download the file. Don't share sensitive content.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FileToLink;
