import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>
            <span className="font-semibold text-foreground">Convertify</span> — Built for students & developers.
          </span>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Convertify. All rights reserved.</p>
      </div>
    </footer>
  );
}
