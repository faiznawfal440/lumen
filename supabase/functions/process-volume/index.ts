import { withSupabase } from "npm:@supabase/server";

const STAGES = [
  "validate_file",
  "extract_text_ocr",
  "analyze_structure",
  "detect_chapters",
  "extract_metadata",
  "generate_summaries",
  "characters_glossary",
  "generate_embeddings",
  "human_review",
  "publish",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function updateStage(
  admin: any,
  jobId: string,
  stageKey: string,
  status: string,
  progress: number,
  extra: Record<string, unknown> = {},
) {
  await admin
    .from("processing_job_stages")
    .update({
      status,
      progress_percent: progress,
      ...(status === "running" ? { started_at: new Date().toISOString() } : {}),
      ...(status === "completed" ? { finished_at: new Date().toISOString() } : {}),
      metadata: extra,
    })
    .eq("job_id", jobId)
    .eq("stage_key", stageKey);
}

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { job_id } = await req.json();

      if (!job_id || typeof job_id !== "string") {
        return Response.json(
          { error: "job_id is required" },
          { status: 400, headers: corsHeaders },
        );
      }

      const { data: roleRow, error: roleError } = await ctx.supabaseAdmin
        .schema("private")
        .from("user_roles")
        .select("role")
        .eq("user_id", ctx.userClaims?.id)
        .maybeSingle();

      if (
        roleError ||
        !roleRow ||
        !["editor", "admin"].includes(roleRow.role)
      ) {
        return Response.json(
          { error: "Editor or admin role required." },
          { status: 403, headers: corsHeaders },
        );
      }

      const { data: job, error: jobError } = await ctx.supabaseAdmin
        .from("processing_jobs")
        .select("id, volume_id, input_path, file_size_bytes, status, progress_percent")
        .eq("id", job_id)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!job) {
        return Response.json(
          { error: "Processing job not found." },
          { status: 404, headers: corsHeaders },
        );
      }

      await ctx.supabaseAdmin.from("processing_job_stages").upsert(
        STAGES.map((stageKey, index) => ({
          job_id,
          stage_order: index + 1,
          stage_key: stageKey,
          status: "waiting",
          progress_percent: 0,
        })),
        { onConflict: "job_id,stage_key", ignoreDuplicates: false },
      );

      await ctx.supabaseAdmin
        .from("processing_jobs")
        .update({
          status: "processing",
          current_stage: "Validate file",
          progress_percent: 2,
          started_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", job_id);

      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "validate_file",
        "running",
        50,
      );

      const { data: signed, error: signedError } =
        await ctx.supabaseAdmin.storage
          .from("novel-pdfs")
          .createSignedUrl(job.input_path, 60 * 60);

      if (signedError || !signed?.signedUrl) {
        throw signedError ?? new Error("Unable to create a signed PDF URL.");
      }

      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "validate_file",
        "completed",
        100,
      );

      const maxDirectPdfBytes = 50 * 1024 * 1024;
      if (job.file_size_bytes && job.file_size_bytes > maxDirectPdfBytes) {
        await ctx.supabaseAdmin.from("processing_jobs").update({
          status: "failed",
          current_stage: "Extract text & OCR",
          progress_percent: 2,
          error_message: "This AI intake path accepts PDFs up to 50 MB per OpenAI request. The PDF is safely stored; large-file chunking is not enabled yet.",
          finished_at: new Date().toISOString(),
        }).eq("id", job_id);

        await updateStage(
          ctx.supabaseAdmin,
          job_id,
          "extract_text_ocr",
          "failed",
          0,
          { reason: "PDF exceeds 50 MB direct input limit", bytes: job.file_size_bytes },
        );

        return Response.json(
          { error: "PDF is larger than 50 MB. Large-file chunking will be handled in the next ingestion phase." },
          { status: 413, headers: corsHeaders },
        );
      }

      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "extract_text_ocr",
        "running",
        0,
      );

      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-6-luna";
      if (!openaiApiKey) {
        await ctx.supabaseAdmin.from("processing_jobs").update({
          status: "failed",
          current_stage: "Extract text & OCR",
          error_message:
            "OPENAI_API_KEY is not configured for the process-volume function.",
          finished_at: new Date().toISOString(),
        }).eq("id", job_id);

        await updateStage(
          ctx.supabaseAdmin,
          job_id,
          "extract_text_ocr",
          "failed",
          0,
          { reason: "Missing OPENAI_API_KEY" },
        );

        return Response.json(
          {
            error:
              "OpenAI is not configured. Add OPENAI_API_KEY to the function secrets.",
          },
          { status: 503, headers: corsHeaders },
        );
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openaiModel,
          input: [{
            role: "user",
            content: [
              {
                type: "input_file",
                file_url: signed.signedUrl,
                detail: "low",
              },
              {
                type: "input_text",
                text: [
                  "You are the ingestion analyst for a light-novel platform.",
                  "Analyze this PDF as an intake pass. Do not invent facts.",
                  "Return concise JSON with these keys only:",
                  "document_title, alternate_title, author, language, genres, synopsis, chapter_count, chapter_outline.",
                  "chapter_outline must be an array of {number,title,summary}.",
                  "Keep summaries spoiler-safe for readers of the volume being processed.",
                ].join(" "),
              },
            ],
          }],
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message || "OpenAI request failed.");
      }

      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "extract_text_ocr",
        "completed",
        100,
      );
      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "analyze_structure",
        "completed",
        100,
        { provider: "openai", model: "gpt-5.6" },
      );
      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "detect_chapters",
        "completed",
        100,
      );
      await updateStage(
        ctx.supabaseAdmin,
        job_id,
        "extract_metadata",
        "completed",
        100,
      );

      const { data: volume } = await ctx.supabaseAdmin
        .from("volumes")
        .select("metadata")
        .eq("id", job.volume_id)
        .maybeSingle();

      const metadata = {
        ...(volume?.metadata ?? {}),
        ai_intake: {
          provider: "openai",
          model: openaiModel,
          generated_at: new Date().toISOString(),
          output_text: payload?.output_text ?? "",
        },
      };

      await ctx.supabaseAdmin
        .from("volumes")
        .update({ metadata })
        .eq("id", job.volume_id);

      await ctx.supabaseAdmin
        .from("processing_jobs")
        .update({
          status: "review",
          current_stage: "Human review",
          progress_percent: 45,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      return Response.json(
        {
          ok: true,
          job_id,
          status: "review",
          progress_percent: 45,
          output_text: payload?.output_text ?? "",
        },
        { headers: corsHeaders },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Processing failed.";
      return Response.json(
        { error: message },
        { status: 500, headers: corsHeaders },
      );
    }
  }),
);
