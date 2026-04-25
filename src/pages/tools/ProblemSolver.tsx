import { useEffect, useRef, useState, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Copy, Loader2, RefreshCw, Send, Sparkles, Trash2, User } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { tools } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tool = tools.find((t) => t.slug === "problem-solver")!;

type Message = {
  role: "user" | "ai";
  content: string;
  timestamp: number;
  loading?: boolean;
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const ProblemSolver = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const callAI = async (problem: string, currentMessages: Message[]) => {
    const history = currentMessages
      .filter((m) => !m.loading && m.content)
      .map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const { data, error } = await supabase.functions.invoke("solve-problem", {
      body: { problem, history, mode: simpleMode ? "simple" : "advanced" },
    });

    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429) throw new Error("⚠️ Too many requests. Please wait a moment and try again.");
      if (status === 402) throw new Error("⚠️ AI credits depleted. Please add credits to continue.");
      throw new Error(`⚠️ ${error.message || "Failed to solve."}`);
    }
    if (data?.error) throw new Error(`⚠️ ${data.error}`);
    if (!data?.solution) throw new Error("⚠️ No solution returned.");
    return data.solution as string;
  };

  const send = async () => {
    const text = input.trim();
    if (text.length < 5) {
      toast.error("Please enter at least 5 characters describing your problem.");
      return;
    }

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    const loadingMsg: Message = { role: "ai", content: "", timestamp: Date.now(), loading: true };
    const baseHistory = messages;
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const solution = await callAI(text, baseHistory);
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].loading) {
            next[i] = { role: "ai", content: solution, timestamp: Date.now() };
            break;
          }
        }
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setMessages((prev) =>
        prev.map((m) =>
          m.loading ? { role: "ai", content: msg, timestamp: Date.now() } : m,
        ),
      );
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const realIdx = messages.length - 1 - lastUserIdx;
    const lastUser = messages[realIdx];
    const historyBefore = messages.slice(0, realIdx);

    const loadingMsg: Message = { role: "ai", content: "", timestamp: Date.now(), loading: true };
    setMessages([...historyBefore, lastUser, loadingMsg]);
    setLoading(true);

    try {
      const solution = await callAI(lastUser.content, historyBefore);
      setMessages([
        ...historyBefore,
        lastUser,
        { role: "ai", content: solution, timestamp: Date.now() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setMessages([
        ...historyBefore,
        lastUser,
        { role: "ai", content: msg, timestamp: Date.now() },
      ]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setMessages([]);
    toast.success("History cleared");
  };

  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) send();
    }
  };

  return (
    <Layout>
      <div className="container max-w-3xl py-8 md:py-12">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="flex h-[calc(100vh-15rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/50 px-3 py-3 backdrop-blur sm:px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground">
                <Brain className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">Problem Solver</p>
                <p className="text-xs text-muted-foreground">
                  Math, physics, logic & more — explained step by step
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="simple-mode"
                  checked={simpleMode}
                  onCheckedChange={setSimpleMode}
                  disabled={loading}
                />
                <Label htmlFor="simple-mode" className="cursor-pointer text-xs">
                  Simple mode
                </Label>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={loading}
                  className="h-8 gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">Ask a problem to solve</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try: "A train travels 60 km in 2 hours. What is its speed?"
                </p>
              </div>
            ) : (
              messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex w-full items-end gap-2 animate-fade-in",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-sm">
                        <Brain className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex max-w-[85%] flex-col gap-1",
                        isUser ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all",
                          isUser
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-muted text-foreground",
                        )}
                      >
                        {m.loading ? (
                          <span className="inline-flex items-center gap-1 py-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60" />
                          </span>
                        ) : isUser ? (
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-headings:my-2 prose-p:my-2 prose-strong:text-foreground prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-background prose-li:my-0.5">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!m.loading && (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(m.timestamp)}
                          </span>
                          {!isUser && (
                            <button
                              onClick={() => copyContent(m.content)}
                              className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                              title="Copy"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card/50 p-3 backdrop-blur sm:p-4">
            {messages.length > 0 && !loading && (
              <div className="mb-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  className="h-7 gap-1 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Describe your problem... (Enter to send, Shift+Enter for newline)"
                disabled={loading}
                className="max-h-40 min-h-[44px] resize-none rounded-xl border-border bg-background"
                rows={1}
              />
              <Button
                onClick={send}
                disabled={loading || input.trim().length < 5}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-xl gradient-primary text-primary-foreground shadow-glow"
                aria-label="Send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProblemSolver;
