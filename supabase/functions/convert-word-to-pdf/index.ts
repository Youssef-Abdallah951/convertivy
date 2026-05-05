import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const API = "https://api.cloudconvert.com/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    if (!apiKey) throw new Error("Missing CLOUDCONVERT_API_KEY");

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filename = file.name || "document.docx";
    const ext = filename.toLowerCase().endsWith(".doc") ? "doc" : "docx";

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Create job
    const jobRes = await fetch(`${API}/jobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tasks: {
          "import-1": { operation: "import/upload" },
          "convert-1": {
            operation: "convert",
            input: "import-1",
            input_format: ext,
            output_format: "pdf",
            engine: "libreoffice",
          },
          "export-1": { operation: "export/url", input: "convert-1", inline: false },
        },
      }),
    });
    if (!jobRes.ok) throw new Error(`Job create failed: ${await jobRes.text()}`);
    const jobData = await jobRes.json();
    const jobId = jobData.data.id;
    const importTask = jobData.data.tasks.find((t: any) => t.name === "import-1");
    const uploadForm = importTask.result.form;

    // Upload file
    const fd = new FormData();
    for (const [k, v] of Object.entries(uploadForm.parameters)) fd.append(k, v as string);
    fd.append("file", file, filename);
    const upRes = await fetch(uploadForm.url, { method: "POST", body: fd });
    if (!upRes.ok && upRes.status !== 201) throw new Error(`Upload failed: ${upRes.status}`);

    // Poll
    let pdfUrl: string | null = null;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const sRes = await fetch(`${API}/jobs/${jobId}`, { headers });
      const sData = await sRes.json();
      const status = sData.data.status;
      if (status === "finished") {
        const exp = sData.data.tasks.find((t: any) => t.name === "export-1");
        pdfUrl = exp.result.files[0].url;
        break;
      }
      if (status === "error") throw new Error("Conversion failed");
    }
    if (!pdfUrl) throw new Error("Conversion timed out");

    // Fetch PDF and stream back
    const pdfRes = await fetch(pdfUrl);
    const pdfBuf = await pdfRes.arrayBuffer();

    return new Response(pdfBuf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename.replace(/\.docx?$/i, ".pdf")}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
