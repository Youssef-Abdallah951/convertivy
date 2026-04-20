import { useState } from "react";
import { Check, MessageSquarePlus, Pencil, Trash2, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Chat } from "@/lib/chatStorage";

interface ChatSidebarProps {
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export const ChatSidebar = ({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ChatSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const startEdit = (chat: Chat) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card/50 md:w-64">
      <div className="border-b border-border p-3">
        <Button
          onClick={onNew}
          className="w-full gradient-primary text-primary-foreground shadow-sm"
          size="sm"
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-muted-foreground">
            <MessageSquare className="mb-2 h-6 w-6 opacity-50" />
            No chats yet
          </div>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => {
              const isActive = chat.id === activeId;
              const isEditing = editingId === chat.id;
              return (
                <li key={chat.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-7 text-sm"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={commitEdit}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelect(chat.id)}
                          className="flex-1 truncate text-left"
                          title={chat.title}
                        >
                          {chat.title}
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => startEdit(chat)}
                          aria-label="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          onClick={() => setConfirmId(chat.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) onDelete(confirmId);
                setConfirmId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};
