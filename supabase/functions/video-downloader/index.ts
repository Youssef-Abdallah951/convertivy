import { corsHeaders } from "@supabase/supabase-js/cors";

interface DownloadFormat {
  type: "video" | "audio";
  quality: string;
  url: string;
  ext?: string;
  size?: string;
}

interface DownloadResult {
  title: string;
  thumbnail: string;
  platform: string;
  duration?: string;
  formats: DownloadFormat[];
}

const RAPIDAPI_HOST = "social-media-video-downloader.p.rapidapi.com";

function detectPlatform(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("youtube.com") || host === "youtu.be") return "YouTube";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("twitter.com") || host === "x.com") return "Twitter";
    return null;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number | undefined): string | undefined {
  if (!bytes || isNaN(bytes)) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      return new Response(
        JSON.stringify({ error: "RAPIDAPI_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const url: string | undefined = body?.url?.trim();

    if (!url || typeof url !== "string" || url.length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid video URL." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return new Response(
        JSON.stringify({
          error: "Unsupported platform. Try YouTube, Facebook, Instagram, or TikTok.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiUrl = `https://${RAPIDAPI_HOST}/smvd/get/all?url=${encodeURIComponent(url)}`;

    const upstream = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("RapidAPI error:", upstream.status, text);
      return new Response(
        JSON.stringify({
          error: `Downloader API error (${upstream.status}). The link may be invalid, private, or unsupported.`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json();

    // Normalize various response shapes from RapidAPI providers
    const title: string = data.title || data.meta?.title || "Untitled video";
    const thumbnail: string =
      data.thumbnail || data.picture || data.meta?.thumbnail || data.preview || "";
    const duration: string | undefined = data.duration || data.meta?.duration;

    const rawLinks: any[] = Array.isArray(data.links)
      ? data.links
      : Array.isArray(data.formats)
        ? data.formats
        : Array.isArray(data.medias)
          ? data.medias
          : [];

    const formats: DownloadFormat[] = rawLinks
      .map((l: any) => {
        const linkUrl = l.link || l.url || l.download_url;
        if (!linkUrl) return null;
        const ext = (l.ext || l.extension || l.format || "")
          .toString()
          .toLowerCase()
          .replace(/^\./, "");
        const quality =
          l.quality?.toString() ||
          l.label?.toString() ||
          l.resolution?.toString() ||
          (ext === "mp3" || ext === "m4a" ? "Audio" : "Default");
        const isAudio =
          ext === "mp3" ||
          ext === "m4a" ||
          ext === "wav" ||
          /audio/i.test(l.type || "") ||
          /audio/i.test(quality);
        return {
          type: isAudio ? "audio" : "video",
          quality,
          url: linkUrl,
          ext: ext || (isAudio ? "mp3" : "mp4"),
          size: formatBytes(l.size || l.filesize),
        } as DownloadFormat;
      })
      .filter((f): f is DownloadFormat => f !== null);

    if (formats.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No downloadable formats found for this link.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result: DownloadResult = { title, thumbnail, platform, duration, formats };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("video-downloader error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
