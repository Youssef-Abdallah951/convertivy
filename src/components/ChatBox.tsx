import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { Loader2, Send, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble, ChatMessage } from "./MessageBubble";
import { ChatSidebar } from "./ChatSidebar";
import {
  Chat,
  createChat,
  loadActiveId,
  loadChats,
  saveActiveId,
  saveChats,
  titleFromMessage,
} from "@/lib/chatStorage";

export const ChatBox = () => {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const id = loadActiveId();
    const list = loadChats();
    return id && list.some((c) => c.id === id) ? id : list[0]?.id ?? null;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId],
  );

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeChat?.messages]);

  const updateChat = (id: string, updater: (chat: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const handleNew = () => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    setInput("");
    setMobileOpen(false);
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileOpen(false);
  };

  const handleDelete = (id: string) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
    toast.success("Chat deleted");
  };

  const handleRename = (id: string, title: string) => {
    updateChat(id, (c) => ({ ...c, title }));
  };

  const send = async () => {
    const text = input.trim();
    if (text.length < 1) {
      toast.error("Please enter at least 1 character.");
      return;
    }

    // Auto-create a chat if none active
    let chatId = activeId;
    let isFirstMessage = false;
    if (!chatId || !chats.find((c) => c.id === chatId)) {
      const chat = createChat();
      chat.title = titleFromMessage(text);
      isFirstMessage = true;
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
      chatId = chat.id;
    } else {
      const current = chats.find((c) => c.id === chatId)!;
      if (current.messages.length === 0) {
        isFirstMessage = true;
      }
    }

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const loadingMsg: ChatMessage = {
      role: "ai",
      content: "",
      timestamp: Date.now(),
      loading: true,
    };

    updateChat(chatId, (c) => ({
      ...c,
      title: isFirstMessage ? titleFromMessage(text) : c.title,
      messages: [...c.messages, userMsg, loadingMsg],
    }));
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

      updateChat(chatId, (c) => {
        const next = [...c.messages];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].loading) {
            next[i] = { role: "ai", content: aiContent, timestamp: Date.now() };
            break;
          }
        }
        return { ...c, messages: next };
      });
    } catch {
      updateChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.loading ? { role: "ai", content: "⚠️ Something went wrong.", timestamp: Date.now() } : m,
        ),
      }));
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

  const sidebar = (
    <ChatSidebar
      chats={chats}
      activeId={activeId}
      onSelect={handleSelect}
      onNew={handleNew}
      onDelete={handleDelete}
      onRename={handleRename}
    />
  );

  const messages = activeChat?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:shrink-0">{sidebar}</div>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card/50 px-3 py-3 backdrop-blur sm:px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" aria-label="Open chats">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {activeChat?.title ?? "Summarizer AI"}
              </p>
              <p className="text-xs text-muted-foreground">Send any text to get a concise summary</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">
                {chats.length === 0 ? "Start your first chat" : "Start a conversation"}
              </h3>
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
    </div>
  );
};
