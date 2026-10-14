"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import StoryViewer from "../components/StoryViewer";
import { supabase, getCurrentUser } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultAvatar } from "../utils/assets";
import { fetchStoriesBundle, type StoryRow } from "../utils/social";

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const [activeStoryId,setActiveStoryId]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  useEffect(()=>()=>{if(preview) URL.revokeObjectURL(preview);},[preview]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await getCurrentUser();
      if (!user) {
        return;
      }

      const rows = await fetchStoriesBundle(supabase);
      if (active) {
        setStories(rows);
        const location=new URL(window.location.href);
        setCreating(location.hash==="#create-story");
        const owner=location.searchParams.get("user");
        if(owner){
          const first=rows.filter(story=>story.user_id===owner).sort((a,b)=>a.created_at.localeCompare(b.created_at))[0];
          if(first)setActiveStoryId(first.id);
        }
        setLoading(false);
      }
    };

    load().catch((error) => {
      setError(getErrorMessage(error,"No se pudieron cargar las historias."));
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [retry]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSuccess(null);setError(null);
    if (nextFile && (!["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/quicktime"].includes(nextFile.type) || nextFile.size > 20*1024*1024)) {
      setError("Selecciona JPG, PNG, WebP, MP4, WebM o MOV de hasta 20 MB.");
      if(input.current)input.current.value="";
      return;
    }
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
  };

  const uploadStory = async () => {
    if (!file || uploadLock.current) {
      return;
    }

    uploadLock.current=true;setUploading(true);
    setError(null);
    try {
    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setUploading(false);
      return;
    }

    const storyId = crypto.randomUUID();
    const extensions: Record<string,string> = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov"};
    const fileName = `stories/${user.id}/${storyId}.${extensions[file.type]}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false, contentType:file.type });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrl } = supabase.storage.from("images").getPublicUrl(fileName);

    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const { error } = await supabase.from("stories").insert({
      id: storyId,
      user_id: user.id,
      media_url: publicUrl.publicUrl,
      media_type: mediaType,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      if (error.code) await supabase.storage.from("images").remove([fileName]);
      throw error;
    } else {
      setSuccess("Historia publicada. Estará visible durante 24 horas.");
      setFile(null);setPreview(null);
      if(input.current)input.current.value="";
      const rows = await fetchStoriesBundle(supabase);
      setStories(rows);
      setFile(null);
      setPreview(null);
    }

    setUploading(false);
    } catch(error) {setError(getErrorMessage(error,"No se pudo publicar la historia. Inténtalo de nuevo."));}
    finally {uploadLock.current=false;setUploading(false);}
  };

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <header className="glass-header sticky top-0 z-40 border-b">
          <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Historias
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
          {error && <p role="alert" className="mb-4 text-red-500">{error}<button className="ml-3 underline" onClick={()=>{setError(null);setLoading(true);setRetry(value=>value+1);}}>Reintentar carga</button></p>}
          {success && <p role="status" className="mb-4 rounded-xl border border-border bg-card-bg p-4">{success}<Link href="/" className="ml-3 underline">Volver al feed</Link></p>}
          <div className="mb-5 flex items-center justify-between">
            <Link href="/" className="text-sm underline">← Volver al feed</Link>
            <button type="button" disabled={uploading} onClick={()=>setCreating(value=>!value)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">{creating?"Cerrar creación":"Crear historia"}</button>
          </div>
          {creating && (
          <section id="create-story" className="mb-6 scroll-mt-20 glass-panel rounded-[24px] border border-border bg-card-bg p-4">
            <h2 className="mb-2 text-lg font-semibold">Crear historia</h2>
            <p className="mb-4 text-sm text-foreground/65">Comparte una imagen o un video. Tu historia estará visible durante 24 horas.</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button type="button" disabled={uploading} onClick={()=>input.current?.click()} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left">
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image src={defaultAvatar} alt="story" sizes="64px" fill className="object-cover" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{file?"Cambiar archivo":"Elegir imagen o video"}</div>
                  <div className="text-xs text-foreground/60">Hasta 20 MB</div>
                </div>
              </button>
              <input ref={input} type="file" aria-label="Archivo de la historia" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={handleChange} className="sr-only" />

              <button
                onClick={uploadStory}
                disabled={!file || uploading}
                className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {uploading ? "Publicando..." : "Publicar historia"}
              </button>
            </div>

            {preview ? (
              <div className="mt-4">
              <div className="relative mx-auto aspect-[9/16] max-w-sm overflow-hidden rounded-xl border border-border bg-black">
                {file?.type.startsWith("video/") ? <video src={preview} controls aria-label="Vista previa de la historia" className="h-full w-full object-contain" /> : <Image src={preview} alt="Vista previa de la historia" sizes="(max-width: 768px) 100vw, 640px" fill className="object-cover" />}
              </div>
              <button type="button" disabled={uploading} onClick={()=>{setFile(null);setPreview(null);setError(null);if(input.current)input.current.value="";}} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm">Cancelar selección</button>
              </div>
            ) : null}
          </section>
          )}

          {loading ? (
            <p className="text-sm text-foreground/60">Cargando historias...</p>
          ) : stories.length ? (
            <div className="grid grid-cols-3 gap-2">
              {stories.map((story) => {
                const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
                return (
                  <button type="button" key={story.id} onClick={()=>setActiveStoryId(story.id)} aria-label={`Ver historia de ${profile?.username || "usuario"}`} className="overflow-hidden rounded-xl border border-border bg-card-bg text-left">
                    <div className="relative aspect-[9/16]">
                      {story.media_type === "video" ? <video src={story.media_url} muted playsInline preload="metadata" aria-label={`Historia de ${profile?.username || "usuario"}`} className="h-full w-full object-contain" /> : <Image src={story.media_url} alt={profile?.username || "Historia"} sizes="(max-width: 768px) 33vw, 240px" fill className="object-cover" />}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold text-foreground">{profile?.username || "default_user"}</div>
                      <div className="text-xs text-foreground/65">{new Date(story.created_at).toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
              Todavía no hay historias activas. Crea la primera arriba.
            </div>
          )}
        </main>
        {activeStoryId && stories.some(story=>story.id===activeStoryId) && <StoryViewer key={activeStoryId} stories={stories} initialId={activeStoryId} onClose={()=>{
          setActiveStoryId(null);
          window.history.replaceState({},"","/stories");
        }}/>}
      </div>
    </RequireAuth>
  );
}
