import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  role: "user" | "ai";
  content: string;
  timestamp: number;
  loading?: boolean;
};

interface MessageBubbleProps {
  message: ChatMessage;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full items-end gap-2 animate-fade-in",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted text-foreground",
          )}
        >
          {message.loading ? (
            <span className="inline-flex items-center gap-1 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60" />
            </span>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        {!message.loading && (
          <span className="px-1 text-[10px] text-muted-foreground">{formatTime(message.timestamp)}</span>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
