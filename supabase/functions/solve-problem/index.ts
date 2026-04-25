// Edge function: solve-problem
// Uses Lovable AI Gateway to provide step-by-step solutions to problems.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMsg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { problem, history, mode } = await req.json();

    if (!problem || typeof problem !== "string" || problem.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide at least 5 characters describing your problem." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmedProblem = problem.slice(0, 6000);
    const isSimple = mode === "simple";

    const systemPrompt = `You are an expert problem-solving tutor. You can solve mathematics, physics, logical reasoning, word problems, and basic coding problems.

For every problem the user asks:
1. Briefly identify the type of problem (one short line).
2. Provide a clear step-by-step solution. Use markdown with numbered headings like "**Step 1:**", "**Step 2:**", etc. Show formulas and substitutions.
3. End with a line that starts with "**Final Answer:**" highlighting the result.
4. Add a short "**Explanation:**" paragraph reasoning about why the solution works.

${isSimple
  ? "Use simple, beginner-friendly language. Avoid jargon. Keep steps very short."
  : "You may include precise terminology and deeper reasoning where useful."}

Always keep responses focused, structured, and use the same language the user wrote in.`;

    const recent: ChatMsg[] = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...recent,
      { role: "user", content: trimmedProblem },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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
        JSON.stringify({ error: "Failed to generate solution." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const solution = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(
      JSON.stringify({ solution }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("solve-problem error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
