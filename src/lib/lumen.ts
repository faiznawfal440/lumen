import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type CatalogChapter = { id:string; chapter_number:number; title:string; slug:string; start_page:number|null; end_page:number|null; spoiler_safe_summary:string|null };
export type CatalogVolume = { id:string; volume_number:number; title:string; subtitle:string|null; description:string|null; page_count:number|null; chapters:CatalogChapter[] };
export type CatalogBook = { id:string; slug:string; title:string; alternate_title:string|null; author:string|null; description:string|null; cover_path:string|null; genres:string[]; language:string; rating_avg:number|null; rating_count:number; featured:boolean; volumes:CatalogVolume[] };
export type UserBookmark = { id:string; volume_id:string; chapter_id:string|null; page_number:number; note:string|null; created_at:string };
export type ReadingProgress = { volume_id:string; chapter_id:string|null; page_number:number; progress_percent:number; last_read_at:string };

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

export async function signIn(email:string,password:string){ if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi."); return supabase.auth.signInWithPassword({email,password}); }
export async function signUp(email:string,password:string,displayName:string){ if(!supabase) throw new Error("Supabase belum dikonfigurasi di environment aplikasi."); return supabase.auth.signUp({email,password,options:{data:{full_name:displayName}}}); }
export async function signOut(){ if(!supabase) return; const {error}=await supabase.auth.signOut(); if(error) throw error; }
