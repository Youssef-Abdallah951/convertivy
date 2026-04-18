import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ToolPageHeader({ title, description, icon: Icon }: Props) {
  return (
    <div className="mb-8 animate-fade-in">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-base hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tools
      </Link>
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
