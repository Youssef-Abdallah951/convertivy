import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "word-counter")!;

function getStats(text: string) {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.trim() ? (text.match(/[^.!?]+[.!?]+/g)?.length ?? (text.trim() ? 1 : 0)) : 0;
  const paragraphs = text.trim() ? text.split(/\n+/).filter((p) => p.trim()).length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return { characters, charactersNoSpaces, words, sentences, paragraphs, readingTime };
}

const WordCounter = () => {
  const [text, setText] = useState("");
  const stats = useMemo(() => getStats(text), [text]);

  const items = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.characters },
    { label: "No spaces", value: stats.charactersNoSpaces },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading time", value: `${stats.readingTime} min` },
  ];

  return (
    <Layout>
      <div className="container max-w-5xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="min-h-[400px] resize-y border-0 bg-transparent text-base focus-visible:ring-0"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setText("")} disabled={!text}>
            Clear text
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default WordCounter;
