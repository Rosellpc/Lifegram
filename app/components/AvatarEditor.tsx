"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { supabase, getCurrentUser } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultAvatar } from "../utils/assets";

export default function AvatarEditor({ profileId, currentUrl, onSaved, disabled, onBusyChange }: {
  profileId: string; currentUrl: string | null; onSaved: (url: string) => void;
  disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const reset = () => { setFile(null); setPreview(null); if (input.current) input.current.value = ""; };
  const selectFile = (next: File | undefined) => {
    setMessage(null);
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 5 * 1024 * 1024) {
      setMessage("Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.");
      if (input.current) input.current.value = "";
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const save = async () => {
    if (!file || lock.current || disabled) return;
    lock.current = true; setBusy(true); onBusyChange(true); setMessage(null);
    let uploadedPath: string | undefined;
    let updatingProfile = false;
    let committed = false;
    try {
      const { data: { user } } = await getCurrentUser();
      if (!user || user.id !== profileId) throw new Error("Inicia sesión para cambiar tu foto.");
      const bitmap = await createImageBitmap(file);
      let blob: Blob | null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se pudo preparar la imagen.");
        const side = Math.min(bitmap.width, bitmap.height);
        context.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 512, 512);
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.85));
      } finally { bitmap.close(); }
      if (!blob) throw new Error("No se pudo procesar la foto. Prueba con otra imagen.");
      const path = `avatars/${user.id}/${crypto.randomUUID()}.webp`;
      const upload = await supabase.storage.from("images").upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: "31536000" });
      if (upload.error) throw upload.error;
      uploadedPath = path;
      const url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
      updatingProfile = true;
      const result = await supabase.from("profiles").update({ avatar_url: url, updated_at: new Date().toISOString() }).eq("id",user.id).select("avatar_url").single();
      if (result.error) {
        // An explicit database rejection is safe to clean up; a transport failure
        // may have committed, so retain its image until the profile is checked.
        if (result.error.code) updatingProfile = false;
        throw result.error;
      }
      if (result.data.avatar_url !== url) throw new Error("No se pudo verificar la foto guardada. Recarga el perfil.");
      committed = true;
      window.dispatchEvent(new Event("lifegram:profile-updated"));
      onSaved(url); reset(); setMessage("Foto de perfil actualizada.");
    } catch (error) {
      if (uploadedPath && !updatingProfile && !committed) await supabase.storage.from("images").remove([uploadedPath]);
      setMessage(getErrorMessage(error, "No se pudo guardar la foto. Puedes reintentar."));
    } finally { lock.current=false;setBusy(false);onBusyChange(false); }
  };

  return <div className="flex flex-col items-center gap-3 sm:items-start">
    <div className="relative h-28 w-28 overflow-hidden rounded-full bg-background ring-4 ring-primary/20">
      <Image src={preview || currentUrl || defaultAvatar} alt={file ? "Vista previa de tu foto de perfil" : "Foto de perfil"} sizes="112px" fill unoptimized={Boolean(preview)} className="object-cover" />
    </div>
    <input ref={input} id="profile-photo" type="file" aria-label="Seleccionar foto de perfil" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={event=>selectFile(event.target.files?.[0])} className="sr-only" />
    <button type="button" disabled={busy || disabled} onClick={()=>input.current?.click()} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Cambiar foto</button>
    {file && <div className="flex gap-2">
      <button type="button" disabled={busy || disabled} onClick={save} className="rounded-lg bg-primary px-3 py-2 text-sm text-white">{busy ? "Guardando foto..." : "Guardar foto"}</button>
      <button type="button" disabled={busy || disabled} onClick={()=>{reset();setMessage(null);}} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button>
    </div>}
    <p className="max-w-48 text-center text-xs text-foreground/60 sm:text-left">JPG, PNG o WebP · Hasta 5 MB. Se recorta al centro.</p>
    {message && <p role="status" aria-live="polite" className="max-w-64 text-sm">{message}</p>}
  </div>;
}
