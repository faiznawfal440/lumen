import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type CatalogChapter = { id:string; chapter_number:number; title:string; slug:string; start_page:number|null; end_page:number|null; spoiler_safe_summary:string|null };
export type CatalogVolume = { id:string; volume_number:number; title:string; subtitle:string|null; description:string|null; page_count:number|null; chapters:CatalogChapter[] };
export type CatalogBook = { id:string; slug:string; title:string; alternate_title:string|null; author:string|null; description:string|null; cover_path:string|null; genres:string[]; language:string; rating_avg:number|null; rating_count:number; featured:boolean; volumes:CatalogVolume[] };
export type UserBookmark = { id:string; volume_id:string; chapter_id:string|null; page_number:number; note:string|null; created_at:string };
export type ReadingProgress = { volume_id:string; chapter_id:string|null; page_number:number; progress_percent:number; last_read_at:string };

export type ProcessingJob = {
  id:string;
  volume_id:string|null;
  input_path:string;
  status:"queued"|"processing"|"completed"|"failed"|"cancelled";
  current_stage:string|null;
  progress_percent:number;
  error_message:string|null;
  started_at:string|null;
  finished_at:string|null;
  created_at:string;
  updated_at:string;
  file_size_bytes:number|null;
};

export type ProcessingStage = {
  id:string;
  job_id:string;
  stage_order:number;
  stage_key:string;
  status:"waiting"|"running"|"completed"|"failed"|"skipped";
  progress_percent:number;
  started_at:string|null;
  finished_at:string|null;
  error_message:string|null;
  metadata:Record<string, unknown>;
};

export type ProcessingLog = {
  id:number;
  job_id:string;
  created_at:string;
  level:"debug"|"info"|"ai"|"warn"|"error";
  message:string;
  metadata:Record<string, unknown>;
};

export async function fetchLatestProcessingJob(volumeId:string):Promise<ProcessingJob|null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("id,volume_id,input_path,status,current_stage,progress_percent,error_message,started_at,finished_at,created_at,updated_at,file_size_bytes")
    .eq("volume_id", volumeId)
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ProcessingJob | null;
}

export async function fetchProcessingStages(jobId:string):Promise<ProcessingStage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("processing_job_stages")
    .select("id,job_id,stage_order,stage_key,status,progress_percent,started_at,finished_at,error_message,metadata")
    .eq("job_id", jobId)
    .order("stage_order",{ascending:true});
  if (error) throw error;
  return (data ?? []) as ProcessingStage[];
}

export async function fetchProcessingLogs(jobId:string):Promise<ProcessingLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("processing_job_logs")
    .select("id,job_id,created_at,level,message,metadata")
    .eq("job_id", jobId)
    .order("created_at",{ascending:false})
    .limit(40);
  if (error) throw error;
  return (data ?? []).reverse() as ProcessingLog[];
}


export async function fetchCatalog(): Promise<CatalogBook[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("novels").select("id,slug,title,alternate_title,author,description,cover_path,genres,language,rating_avg,rating_count,featured,volumes(id,volume_number,title,subtitle,description,page_count,chapters(id,chapter_number,title,slug,start_page,end_page,spoiler_safe_summary))").eq("publication_status","published").order("featured",{ascending:false}).order("updated_at",{ascending:false});
  if (error) throw error;
  return (data ?? []).map((book) => ({ ...book, genres: book.genres ?? [], volumes: (book.volumes ?? []).sort((a,b) => a.volume_number - b.volume_number) })) as CatalogBook[];
}

export async function fetchUserProgress(userId:string):Promise<ReadingProgress[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("reading_progress").select("volume_id,chapter_id,page_number,progress_percent,last_read_at").eq("user_id",userId).order("last_read_at",{ascending:false});
  if (error) throw error;
  return (data ?? []) as ReadingProgress[];
}

export async function saveReadingProgress(args:{user:User;volumeId:string;chapterId:string|null;pageNumber:number;progressPercent:number}) {
  if (!supabase) return;
  const { error } = await supabase.from("reading_progress").upsert({ user_id:args.user.id, volume_id:args.volumeId, chapter_id:args.chapterId, page_number:args.pageNumber, progress_percent:Math.max(0,Math.min(100,args.progressPercent)), last_read_at:new Date().toISOString(), updated_at:new Date().toISOString() });
  if (error) throw error;
}

export async function fetchUserBookmarks(userId:string):Promise<UserBookmark[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("bookmarks").select("id,volume_id,chapter_id,page_number,note,created_at").eq("user_id",userId).order("created_at",{ascending:false});
  if (error) throw error;
  return (data ?? []) as UserBookmark[];
}

export async function toggleBookmark(args:{user:User;volumeId:string;chapterId:string|null;pageNumber:number}):Promise<boolean> {
  if (!supabase) return false;
  const existing = await supabase.from("bookmarks").select("id").eq("user_id",args.user.id).eq("volume_id",args.volumeId).eq("page_number",args.pageNumber).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { error } = await supabase.from("bookmarks").delete().eq("id",existing.data.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("bookmarks").insert({ user_id:args.user.id, volume_id:args.volumeId, chapter_id:args.chapterId, page_number:args.pageNumber });
  if (error) throw error;
  return true;
}

export type ChapterPage = {
  id:string;
  chapter_id:string;
  page_number:number;
  source_pdf_page:number|null;
  content:string;
  ocr_used:boolean;
  extraction_confidence:number|null;
};

export async function fetchChapterPages(chapterId:string):Promise<ChapterPage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chapter_pages")
    .select("id,chapter_id,page_number,source_pdf_page,content,ocr_used,extraction_confidence")
    .eq("chapter_id", chapterId)
    .order("page_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChapterPage[];
}

export async function signIn(email:string,password:string){ if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi."); return supabase.auth.signInWithPassword({email,password}); }
export async function signUp(email:string,password:string,displayName:string){
  if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const redirectOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const configuredRedirect = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  const emailRedirectTo = configuredRedirect || redirectOrigin || undefined;
  return supabase.auth.signUp({
    email,
    password,
    options:{
      data:{full_name:displayName},
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    }
  });
}
export async function signOut(){ if(!supabase) return; const {error}=await supabase.auth.signOut(); if(error) throw error; }

export async function uploadVolumePdf(args:{user:User;volumeId:string;file:File}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  if (args.file.type !== "application/pdf") throw new Error("File harus berupa PDF.");
  const maxBytes = 500 * 1024 * 1024;
  if (args.file.size > maxBytes) throw new Error("PDF terlalu besar. Batas penyimpanan Lumen adalah 500 MB.");

  const safeName = args.file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "volume.pdf";
  const path = `${args.volumeId}/${crypto.randomUUID()}-${safeName}`;

  const upload = await supabase.storage.from("novel-pdfs").upload(path, args.file, {
    contentType: "application/pdf",
    upsert: false,
    cacheControl: "3600",
  });
  if (upload.error) throw upload.error;

  const { error: volumeError } = await supabase
    .from("volumes")
    .update({ pdf_path: path, publication_status: "processing" })
    .eq("id", args.volumeId);
  if (volumeError) {
    await supabase.storage.from("novel-pdfs").remove([path]).catch(() => undefined);
    throw volumeError;
  }

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .insert({
      volume_id: args.volumeId,
      input_path: path,
      status: "queued",
      created_by: args.user.id,
      file_size_bytes: args.file.size,
    })
    .select("id")
    .single();
  if (jobError || !job) {
    await supabase.storage.from("novel-pdfs").remove([path]).catch(() => undefined);
    throw jobError ?? new Error("Processing job could not be created.");
  }

  const stages = [
    "validate_file","extract_text_ocr","analyze_structure","detect_chapters",
    "extract_metadata","generate_summaries","characters_glossary",
    "generate_embeddings","human_review","publish",
  ];
  const { error: stagesError } = await supabase.from("processing_job_stages").insert(
    stages.map((stage_key,index)=>({job_id:job.id,stage_order:index+1,stage_key,status:"waiting",progress_percent:0}))
  );
  if (stagesError) throw stagesError;

  return job.id;
}

export async function fetchCurrentUserRole():Promise<"reader"|"editor"|"admin"> {
  if (!supabase) return "reader";
  const response = await supabase.functions.invoke<{role:"reader"|"editor"|"admin"}>("get-my-role", { body: {} });
  if (response.error) throw response.error;
  return response.data?.role ?? "reader";
}

function edgeFunctionErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { message?: string; context?: Response };
  return candidate?.message || fallback;
}

export async function createNovel(args:{
  user:User;
  title:string;
  alternateTitle?:string;
  author?:string;
  description?:string;
  genres?:string[];
  language?:string;
  volumeNumber?:number;
  volumeTitle?:string;
  volumeSubtitle?:string;
}){
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  const response = await supabase.functions.invoke<{novel_id:string;volume_id:string;slug:string}>("create-novel", {
    body:{
      title:args.title,
      alternate_title:args.alternateTitle ?? null,
      author:args.author ?? null,
      description:args.description ?? null,
      genres:args.genres ?? [],
      language:args.language ?? "en",
      volume_number:args.volumeNumber ?? 1,
      volume_title:args.volumeTitle ?? "Volume " + (args.volumeNumber ?? 1),
      volume_subtitle:args.volumeSubtitle ?? null,
    }
  });
  if (response.error) {
    const context = (response.error as { context?: Response }).context;
    let message = edgeFunctionErrorMessage(response.error, "Novel creation failed.");
    if (context) {
      try {
        const payload = await context.clone().json();
        if (typeof payload?.error === "string") message = payload.error;
      } catch {
        /* Keep the SDK error when the response body is not JSON. */
      }
    }
    return { data: response.data, error: new Error(message) };
  }
  return response;
}

export async function startProcessingJob(jobId:string) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  return supabase.functions.invoke("process-volume", { body: { job_id: jobId } });
}

export type SemanticSearchResult = {
  score:number;
  similarity:number;
  title:string;
  chapter:string;
  book:string;
  novel_slug:string;
  chapter_id:string;
  volume_id:string;
  excerpt:string;
  why:string;
};

export async function semanticSearch(args:{query:string;matchCount?:number;matchThreshold?:number}) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi.");
  return supabase.functions.invoke<{query:string;count:number;results:SemanticSearchResult[]}>("semantic-search", {
    body: {
      query: args.query,
      match_count: args.matchCount ?? 8,
      match_threshold: args.matchThreshold ?? 0.55,
    },
  });
}
