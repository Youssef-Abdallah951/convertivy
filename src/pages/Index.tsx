import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolCard } from "@/components/ToolCard";
import { Input } from "@/components/ui/input";
import { tools } from "@/lib/tools";

const Index = () => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 gradient-hero">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Free, fast & privacy-friendly
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-6xl">
              All your favorite tools, <br className="hidden md:block" />
              <span className="text-gradient">in one place.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              A growing collection of beautifully simple web tools for students and developers — no signup required.
            </p>

            <div className="mx-auto mt-8 max-w-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tools — try 'json' or 'word'..."
                  className="h-14 rounded-2xl border-border bg-card pl-12 pr-4 text-base shadow-md focus-visible:ring-primary/40"
                  aria-label="Search tools"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="container py-12 md:py-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {query ? "Results" : "Browse all tools"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "tool" : "tools"} available
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No tools match <span className="font-semibold text-foreground">"{query}"</span>. Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;
