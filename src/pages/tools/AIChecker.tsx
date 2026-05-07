import { useState } from "react";
import { Copy, Loader2, Sparkles, ScanText, Wand2, Download } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

const tool = tools.find((t) => t.slug === "ai-checker")!;

type Detection = {
  ai_score: number;
  human_score: number;
  verdict: "likely_ai" | "likely_human" | "uncertain";
  reasoning: string;
  suspicious_sentences: string[];
};

const verdictLabel: Record<Detection["verdict"], string> = {
  likely_ai: "Likely AI-generated",
  likely_human: "Likely human-written",
  uncertain: "Uncertain",
};

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const AIChecker = () => {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<"professional" | "casual" | "academic">("professional");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [humanized, setHumanized] = useState("");
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [loadingHumanize, setLoadingHumanize] = useState(false);

  const callFn = async (action: "detect" | "humanize", input: string) => {
    const { data, error } = await supabase.functions.invoke("ai-checker", {
      body: { action, text: input, tone },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const validate = (input: string) => {
    if (input.trim().length < 20) {
      toast.error("Please enter at least 20 characters.");
      return false;
    }
    return true;
  };

  const handleDetect = async (input = text) => {
    if (!validate(input)) return;
    setLoadingDetect(true);
    setDetection(null);
    try {
      const data = await callFn("detect", input);
      setDetection(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detection failed.");
    } finally {
      setLoadingDetect(false);
    }
  };

  const handleHumanize = async () => {
    if (!validate(text)) return;
    setLoadingHumanize(true);
    setHumanized("");
    try {
      const data = await callFn("humanize", text);
      setHumanized(data.humanized || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Humanize failed.");
    } finally {
      setLoadingHumanize(false);
    }
  };

  const copy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    toast.success("Copied to clipboard");
  };

  const download = (s: string) => {
    const blob = new Blob([s], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "humanized.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlight = (input: string, sentences: string[]) => {
    if (!sentences?.length) return <span>{input}</span>;
    let parts: (string | JSX.Element)[] = [input];
    sentences.forEach((s, i) => {
      const next: (string | JSX.Element)[] = [];
      parts.forEach((p) => {
        if (typeof p !== "string" || !s) return next.push(p);
        const idx = p.indexOf(s);
        if (idx === -1) return next.push(p);
        next.push(p.slice(0, idx));
        next.push(
          <mark key={`${i}-${idx}`} className="rounded bg-destructive/20 px-1 text-foreground">
            {s}
          </mark>,
        );
        next.push(p.slice(idx + s.length));
      });
      parts = next;
    });
    return <>{parts}</>;
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8 md:py-12">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste at least 20 characters of text to analyze..."
              className="min-h-[200px] resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {wordCount(text)} words · {text.length} characters
              </span>
              <div className="flex items-center gap-2">
                <span>Tone:</span>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleDetect()} disabled={loadingDetect}>
                {loadingDetect ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanText className="h-4 w-4" />
                )}
                Check AI
              </Button>
              <Button onClick={handleHumanize} disabled={loadingHumanize} variant="secondary">
                {loadingHumanize ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Humanize Text
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" />
              AI detection is probabilistic and may not always be accurate.
            </p>
          </CardContent>
        </Card>

        {detection && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Detection result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">AI probability</span>
                    <span className="text-muted-foreground">{Math.round(detection.ai_score)}%</span>
                  </div>
                  <Progress value={detection.ai_score} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">Human probability</span>
                    <span className="text-muted-foreground">{Math.round(detection.human_score)}%</span>
                  </div>
                  <Progress value={detection.human_score} />
                </div>
              </div>
              <div>
                <span className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                  {verdictLabel[detection.verdict]}
                </span>
                <p className="mt-3 text-sm text-muted-foreground">{detection.reasoning}</p>
              </div>
              {detection.suspicious_sentences.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                  {highlight(text, detection.suspicious_sentences)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {humanized && (
          <Card className="animate-fade-in">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Humanized text</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(humanized)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => download(humanized)}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button size="sm" onClick={() => handleDetect(humanized)} disabled={loadingDetect}>
                  {loadingDetect ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanText className="h-4 w-4" />
                  )}
                  Re-check
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{humanized}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {wordCount(humanized)} words · {humanized.length} characters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AIChecker;
