// Edge function: generate-code
// Uses Lovable AI Gateway to generate, explain, improve, or fix code.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "generate" | "explain" | "improve" | "fix";

const SUPPORTED_LANGUAGES = ["html", "css", "javascript", "typescript", "python", "cpp", "java"];

function buildSystemPrompt(action: Action, language: string): string {
  const langLabel = language.toUpperCase();
  switch (action) {
    case "explain":
      return `You are a senior software engineer. The user will paste ${langLabel} code. Explain it clearly in plain language: what it does, key parts, and any caveats. Keep it concise. Return plain text only — no markdown headers, no code fences.`;
    case "improve":
      return `You are a senior software engineer. Improve the user's ${langLabel} code: better readability, performance, and best practices. Return ONLY the improved code, no explanations, no markdown fences.`;
    case "fix":
      return `You are a senior software engineer. Fix bugs and errors in the user's ${langLabel} code. Return ONLY the corrected code, no explanations, no markdown fences.`;
    case "generate":
    default:
      return `You are an expert ${langLabel} developer. Generate clean, working, well-structured ${langLabel} code based on the user's request. Use minimal but useful comments. Return ONLY the code — no explanations, no markdown fences, no language tags.`;
  }
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  // Remove leading ```lang and trailing ```
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9+_-]*\n([\s\S]*?)\n?```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, language, action } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide at least 5 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lang = typeof language === "string" && SUPPORTED_LANGUAGES.includes(language.toLowerCase())
      ? language.toLowerCase()
      : "javascript";

    const act: Action = ["generate", "explain", "improve", "fix"].includes(action)
      ? action
      : "generate";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmed = prompt.slice(0, 12000);
    const systemPrompt = buildSystemPrompt(act, lang);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmed },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate response." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    const result = act === "explain" ? raw : stripCodeFences(raw);

    return new Response(
      JSON.stringify({ result, action: act, language: lang }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-code error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
