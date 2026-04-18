import { FileText, Braces, Sparkles, Image as ImageIcon, type LucideIcon } from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: "Text" | "Developer" | "AI" | "Media";
  keywords: string[];
};

export const tools: Tool[] = [
  {
    slug: "word-counter",
    title: "Word Counter",
    description: "Count words, characters, and sentences in real-time as you type.",
    icon: FileText,
    category: "Text",
    keywords: ["word", "count", "characters", "sentences", "text", "essay"],
  },
  {
    slug: "json-formatter",
    title: "JSON Formatter",
    description: "Beautify, validate, and minify JSON with helpful error messages.",
    icon: Braces,
    category: "Developer",
    keywords: ["json", "format", "validate", "developer", "api"],
  },
  {
    slug: "text-summarizer",
    title: "AI Text Summarizer",
    description: "Turn long passages into concise summaries with AI.",
    icon: Sparkles,
    category: "AI",
    keywords: ["summary", "ai", "text", "tldr", "shorten"],
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Shrink image file size in your browser without losing quality.",
    icon: ImageIcon,
    category: "Media",
    keywords: ["image", "compress", "optimize", "photo", "size"],
  },
];
