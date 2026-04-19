import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble, ChatMessage } from "./MessageBubble";

const STORAGE_KEY = "smarttools.summarizer.chat";

export const ChatBox = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.loading)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (text.length < 1) {
      toast.error("Please enter at least 1 character.");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const loadingMsg: ChatMessage = {
      role: "ai",
      content: "",
      timestamp: Date.now(),
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("summarize-text", {
        body: { text },
      });

      let aiContent = "";
      if (error) {
        const status = (error as any).context?.status;
        if (status === 429) aiContent = "⚠️ Too many requests. Please wait a moment and try again.";
        else if (status === 402) aiContent = "⚠️ AI credits depleted. Please add credits to continue.";
        else aiContent = `⚠️ ${error.message || "Failed to summarize."}`;
        toast.error(aiContent);
      } else if (data?.summary) {
        aiContent = data.summary;
      } else if (data?.error) {
        aiContent = `⚠️ ${data.error}`;
        toast.error(data.error);
      } else {
        aiContent = "⚠️ No summary returned.";
      }

      setMessages((prev) => {
        const next = [...prev];
        // Replace the last loading message
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].loading) {
            next[i] = { role: "ai", content: aiContent, timestamp: Date.now() };
            break;
          }
        }
        return next;
      });
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.loading ? { role: "ai", content: "⚠️ Something went wrong.", timestamp: Date.now() } : m,
        ),
      );
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) send();
    }
  };

  const clearChat = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast.success("Chat cleared");
  };

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Summarizer AI</p>
            <p className="text-xs text-muted-foreground">Send any text to get a concise summary</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0 || loading}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Start a conversation</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Paste any text below and I'll summarize it for you in a few sentences.
            </p>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/50 p-3 backdrop-blur sm:p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type or paste text to summarize... (Enter to send, Shift+Enter for newline)"
            disabled={loading}
            className="max-h-40 min-h-[44px] resize-none rounded-xl border-border bg-background"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl gradient-primary text-primary-foreground shadow-glow"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
