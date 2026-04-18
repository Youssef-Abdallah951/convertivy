import { useRef, useState } from "react";
import mammoth from "mammoth";
import jsPDF from "jspdf";
import { Upload, Download, Loader2, FileType2, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "word-to-pdf")!;

const WordToPdf = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const isDoc =
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".doc");
    if (!isDoc) {
      toast.error("Please upload a .doc or .docx file.");
      return;
    }
    setFileName(file.name);
    setPdfUrl(null);
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });

      if (!text.trim()) {
        toast.error("Could not read any text from this document.");
        return;
      }

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      const lines = pdf.splitTextToSize(text, maxWidth);
      let y = margin;
      const lineHeight = 16;

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }

      const blob = pdf.output("blob");
      setPdfUrl(URL.createObjectURL(blob));
      toast.success("PDF ready to download");
    } catch (e) {
      console.error(e);
      toast.error("Failed to convert. Try a different file.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setFileName(null);
    setPdfUrl(null);
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
              <p className="text-base font-semibold">Drop a Word file or click to upload</p>
              <p className="text-sm text-muted-foreground">.doc or .docx — converted in your browser</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                <FileType2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Converting to PDF..." : pdfUrl ? "Conversion complete" : "Ready"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {pdfUrl && !loading && (
                <a href={pdfUrl} download={fileName!.replace(/\.docx?$/i, ".pdf")}>
                  <Button className="gradient-primary text-primary-foreground shadow-glow">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              )}
              {loading && (
                <Button disabled>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Converting...
                </Button>
              )}
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" />
                Choose another
              </Button>
              <Button variant="ghost" onClick={reset}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Reset
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Note: Conversion preserves text content. Complex formatting, images, and tables may
              not be retained.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WordToPdf;
