// Edge function: ai-checker
// Two actions: "detect" (AI/human probability) and "humanize" (rewrite text).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callAI(messages: any[], extra: Record<string, unknown> = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI service not configured.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      ...extra,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI gateway error");
  }
  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, text, tone } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return json({ error: "Please provide at least 20 characters of text." }, 400);
    }
    const trimmed = text.slice(0, 12000);

    if (action === "detect") {
      const data = await callAI(
        [
          {
            role: "system",
            content:
              "You are an AI text detector. Analyze the user's text for signs of AI generation: repetition, predictable sentence patterns, uniform tone, low burstiness/perplexity, generic phrasing. Respond ONLY using the provided tool with numeric probabilities (0-100) summing to ~100, a brief reasoning, and an array of suspicious sentences (verbatim substrings) from the text.",
          },
          { role: "user", content: trimmed },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "report_detection",
                description: "Return AI detection results.",
                parameters: {
                  type: "object",
                  properties: {
                    ai_score: { type: "number", minimum: 0, maximum: 100 },
                    human_score: { type: "number", minimum: 0, maximum: 100 },
                    verdict: { type: "string", enum: ["likely_ai", "likely_human", "uncertain"] },
                    reasoning: { type: "string" },
                    suspicious_sentences: { type: "array", items: { type: "string" } },
                  },
                  required: ["ai_score", "human_score", "verdict", "reasoning", "suspicious_sentences"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_detection" } },
        },
      );

      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return json({ error: "Detection failed." }, 500);
      return json(JSON.parse(args));
    }

    if (action === "humanize") {
      const toneStr = ["casual", "academic", "professional"].includes(tone) ? tone : "professional";
      const data = await callAI([
        {
          role: "system",
          content: `You rewrite text to sound more naturally human. Vary sentence length and structure, avoid robotic phrasing and clichés, keep the original meaning, language, and key facts. Tone: ${toneStr}. Return ONLY the rewritten text — no preface, no labels, no quotes.`,
        },
        { role: "user", content: trimmed },
      ]);
      const humanized = data?.choices?.[0]?.message?.content?.trim() ?? "";
      return json({ humanized });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "RATE_LIMIT") return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);
    if (msg === "PAYMENT_REQUIRED") return json({ error: "AI credits depleted. Please add funds to continue." }, 402);
    console.error("ai-checker error:", e);
    return json({ error: msg }, 500);
  }
});
