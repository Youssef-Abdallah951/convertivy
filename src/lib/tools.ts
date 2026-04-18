import {
  FileText,
  Braces,
  Sparkles,
  Image as ImageIcon,
  FileType2,
  QrCode,
  Link2,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: "Text" | "Developer" | "AI" | "Media" | "Files" | "QR";
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
  {
    slug: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert .doc or .docx documents to a polished PDF in seconds.",
    icon: FileType2,
    category: "Files",
    keywords: ["word", "docx", "pdf", "convert", "document"],
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
    slug: "qr-scanner",
    title: "QR Code Scanner",
    description: "Scan QR codes with your camera and decode them instantly.",
    icon: ScanLine,
    category: "QR",
    keywords: ["qr", "scan", "camera", "decode", "reader"],
  },
];
