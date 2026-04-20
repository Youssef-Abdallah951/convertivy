import { ChatMessage } from "@/components/MessageBubble";

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};

const KEY = "smarttools.summarizer.chats";
const ACTIVE_KEY = "smarttools.summarizer.activeChat";

export const loadChats = (): Chat[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Chat[]) : [];
  } catch {
    return [];
  }
};

export const saveChats = (chats: Chat[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    // ignore
  }
};

export const loadActiveId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
};

export const saveActiveId = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore
  }
};

export const createChat = (): Chat => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "New Chat",
  messages: [],
  createdAt: Date.now(),
});

export const titleFromMessage = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40) + "…" : t || "New Chat";
};
