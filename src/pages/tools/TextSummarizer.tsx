import { useState } from "react";
import { Loader2, Sparkles, Copy } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { tools } from "@/lib/tools";
import { supabase } from "@/integrations/supabase/client";

const tool = tools.find((t) => t.slug === "text-summarizer")!;

const TextSummarizer = () => {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    if (text.trim().length < 30) {
      toast.error("Please enter at least 30 characters to summarize.");
      return;
    }
    setLoading(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("summarize-text", {
        body: { text },
      });

      if (error) {
        if ((error as any).context?.status === 429) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if ((error as any).context?.status === 402) {
          toast.error("AI credits depleted. Please add credits to continue.");
        } else {
          toast.error(error.message || "Failed to summarize. Please try again.");
        }
        return;
      }

      if (data?.summary) {
        setSummary(data.summary);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    toast.success("Summary copied");
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a long article, essay or notes here..."
            className="min-h-[260px] resize-y border-0 bg-transparent text-base focus-visible:ring-0"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{text.length} characters</p>
          <Button
            onClick={summarize}
            disabled={loading || !text.trim()}
            className="gradient-primary text-primary-foreground shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Summarize with AI
              </>
            )}
          </Button>
        </div>

        {(loading || summary) && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-md animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Summary
              </h2>
              {summary && (
                <Button variant="ghost" size="sm" onClick={copy}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-11/12 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-9/12 animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{summary}</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TextSummarizer;
