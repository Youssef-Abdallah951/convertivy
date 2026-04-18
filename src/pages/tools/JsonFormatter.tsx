import { useState } from "react";
import { CheckCircle2, AlertCircle, Copy, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "json-formatter")!;

const JsonFormatter = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  const process = (mode: "format" | "minify") => {
    if (!input.trim()) {
      setError("Please enter some JSON to process.");
      setValid(false);
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const result = mode === "format" ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
      setOutput(result);
      setError(null);
      setValid(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
      setValid(false);
      setOutput("");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError(null);
    setValid(false);
  };

  return (
    <Layout>
      <div className="container max-w-6xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => process("format")} className="gradient-primary text-primary-foreground shadow-glow">
            Beautify
          </Button>
          <Button variant="outline" onClick={() => process("minify")}>
            Minify
          </Button>
          <Button variant="ghost" onClick={clear} className="ml-auto">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Input</p>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Paste your JSON here, e.g. {"hello":"world"}'
              className="min-h-[400px] resize-y border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Output</p>
              <Button variant="ghost" size="sm" onClick={copy} disabled={!output}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <Textarea
              value={output}
              readOnly
              placeholder="Formatted JSON will appear here..."
              className="min-h-[400px] resize-y border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Invalid JSON</p>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {valid && !error && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="font-semibold">Valid JSON</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default JsonFormatter;
