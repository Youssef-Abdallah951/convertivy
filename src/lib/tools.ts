import {
  Braces,
  Sparkles,
  Image as ImageIcon,
  
  QrCode,
  Link2,
  Download,
  Code2,
  Ruler,
  Bot,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: "Text" | "Developer" | "AI" | "Media" | "Files" | "QR" | "Utilities";
  keywords: string[];
};

export const tools: Tool[] = [
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
  {
    slug: "file-to-qr",
    title: "File to QR Code",
    description: "Upload any file and get a scannable QR code that links to it.",
    icon: QrCode,
    category: "QR",
    keywords: ["qr", "file", "share", "code", "upload"],
  },
  {
    slug: "file-to-link",
    title: "File to Link",
    description: "Upload a file and instantly get a shareable download link.",
    icon: Link2,
    category: "Files",
    keywords: ["share", "link", "upload", "url", "file"],
  },
  {
    slug: "link-to-file",
    title: "Link to File",
    description: "Paste a URL and download the file directly to your device.",
    icon: Download,
    category: "Files",
    keywords: ["link", "url", "download", "file", "fetch"],
  },
  {
    slug: "code-generator",
    title: "AI Code Generator",
    description: "Describe what you want and get clean, working code in your favorite language.",
    icon: Code2,
    category: "AI",
    keywords: ["code", "generator", "ai", "developer", "html", "css", "javascript", "python", "java", "cpp"],
  },
  {
    slug: "unit-converter",
    title: "Unit Converter",
    description: "Convert between length, weight, temperature, time, speed, and data units instantly.",
    icon: Ruler,
    category: "Utilities",
    keywords: ["unit", "converter", "length", "weight", "temperature", "time", "speed", "data", "measurement"],
  },
  {
    slug: "ai-checker",
    title: "AI Checker & Humanizer",
    description: "Detect AI-generated text and rewrite it to sound more natural and human.",
    icon: Bot,
    category: "AI",
    keywords: ["ai", "detector", "humanizer", "checker", "rewrite", "gpt", "plagiarism"],
  },
];
