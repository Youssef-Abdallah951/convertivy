import { useState } from "react";
import { Code2, Copy, Download, Loader2, Sparkles, Wand2, Bug, Lightbulb } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "code-generator")!;

type Language = "html" | "css" | "javascript" | "typescript" | "python" | "cpp" | "java";
type Action = "generate" | "explain" | "improve" | "fix";

const LANGUAGES: { value: Language; label: string; ext: string }[] = [
  { value: "html", label: "HTML", ext: "html" },
  { value: "css", label: "CSS", ext: "css" },
  { value: "javascript", label: "JavaScript", ext: "js" },
  { value: "typescript", label: "TypeScript", ext: "ts" },
  { value: "python", label: "Python", ext: "py" },
  { value: "cpp", label: "C++", ext: "cpp" },
  { value: "java", label: "Java", ext: "java" },
];

const CodeGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const [output, setOutput] = useState("");
  const [outputAction, setOutputAction] = useState<Action>("generate");
  const [loading, setLoading] = useState<Action | null>(null);

  const run = async (action: Action) => {
    const input = action === "generate" ? prompt : output || prompt;

    if (!input || input.trim().length < 5) {
      toast.error("Please enter at least 5 characters.");
      return;
    }

    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("generate-code", {
        body: { prompt: input, language, action },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOutput(data.result ?? "");
      setOutputAction(action);
      toast.success(
        action === "generate"
          ? "Code generated"
          : action === "explain"
          ? "Explanation ready"
          : action === "improve"
          ? "Code improved"
          : "Code fixed",
      );
    } catch (e: any) {
      console.error("generate-code error:", e);
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success("Copied");
  };

  const download = () => {
    if (!output) return;
    const lang = LANGUAGES.find((l) => l.value === language);
    const ext = outputAction === "explain" ? "txt" : lang?.ext ?? "txt";
    const filename = `convertify-${outputAction}.${ext}`;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isLoading = loading !== null;
  const hasOutput = output.length > 0;

  return (
    <Layout>
      <div className="container max-w-4xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label htmlFor="prompt" className="mb-2 block text-sm font-medium">
                Describe what code you want
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Create a login form with email and password validation"
                className="min-h-28 resize-none font-sans"
                disabled={isLoading}
              />
            </div>
            <div className="md:w-44">
              <Label htmlFor="language" className="mb-2 block text-sm font-medium">
                Language
              </Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Language)}
                disabled={isLoading}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => run("generate")}
              disabled={isLoading || prompt.trim().length < 5}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              {loading === "generate" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Generate code
            </Button>

            <Button
              variant="outline"
              onClick={() => run("explain")}
              disabled={isLoading || (!hasOutput && prompt.trim().length < 5)}
            >
              {loading === "explain" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="mr-1.5 h-4 w-4" />
              )}
              Explain code
            </Button>

            <Button
              variant="outline"
              onClick={() => run("improve")}
              disabled={isLoading || !hasOutput}
            >
              {loading === "improve" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-1.5 h-4 w-4" />
              )}
              Improve code
            </Button>

            <Button
              variant="outline"
              onClick={() => run("fix")}
              disabled={isLoading || !hasOutput}
            >
              {loading === "fix" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Bug className="mr-1.5 h-4 w-4" />
              )}
              Fix errors
            </Button>
          </div>
        </div>

        {hasOutput && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-md animate-fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="font-medium capitalize">
                  {outputAction === "explain"
                    ? "Explanation"
                    : `${LANGUAGES.find((l) => l.value === language)?.label} — ${outputAction}`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={copy}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={download}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
            <pre className="max-h-[60vh] overflow-auto bg-background p-4 text-sm leading-relaxed">
              <code className="font-mono text-foreground">{output}</code>
            </pre>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CodeGenerator;
