"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabase, getCurrentUser } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultAvatar, defaultPostImage } from "../utils/assets";
import { toPost } from "../utils/social";
import { profileSearchFilter } from "../utils/search";
import type { Post } from "../mocks/posts";

type ProfileResult = {id:string;username:string|null;full_name:string|null;avatar_url:string|null;bio:string|null};
export default function SearchPage() {
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState<"users"|"posts">("users");
  const [profiles,setProfiles]=useState<ProfileResult[]>([]);
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const search=async()=>{
      if(!active)return;
      setLoading(true);setError(null);
      const {data:{user}}=await getCurrentUser();
      if(!user||!active)return;
      const term=query.trim().replace(/^@/,"").trim();
      if(tab==="users"){
        let request=supabase.from("profiles").select("id,username,full_name,avatar_url,bio")
          .neq("id",user.id).order("username",{ascending:true}).limit(term?30:12);
        if(term)request=request.or(profileSearchFilter(term));
        const result=await request.abortSignal(controller.signal);
        if(result.error)throw result.error;
        if(active)setProfiles(result.data);
      }else{
        let request=supabase.from("posts").select("id,user_id,image_url,caption,location,created_at,updated_at,profiles!posts_user_id_fkey(id,username,avatar_url,full_name,bio,website)")
          .order("created_at",{ascending:false}).limit(30);
        if(term)request=request.ilike("caption",`%${term.replace(/[\\%_]/g,"\\$&")}%`);
        const result=await request.abortSignal(controller.signal);
        if(result.error)throw result.error;
        if(active)setPosts(result.data.map(row=>toPost(row)));
      }
    };
    const timer=setTimeout(()=>{void search().catch(error=>{if(active)setError(getErrorMessage(error,"No se pudo buscar. Inténtalo de nuevo."));}).finally(()=>{if(active)setLoading(false);});},300);
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[query,tab,retry]);
  const changeQuery=(value:string)=>{setQuery(value);setLoading(true);setError(null);setProfiles([]);setPosts([]);};
  const term=query.trim().replace(/^@/,"").trim();
  return <RequireAuth><main className="mx-auto max-w-2xl px-4 py-6 pb-32">
    <header className="mb-6"><h1 className="text-2xl font-bold">Buscar</h1><p className="mt-1 text-sm text-foreground/65">Encuentra personas y descubre sus historias.</p></header>
    <form role="search" onSubmit={event=>{event.preventDefault();setRetry(value=>value+1);setLoading(true);}} className="mb-4 flex gap-2">
      <label className="sr-only" htmlFor="people-search">Buscar usuarios o publicaciones</label>
      <input id="people-search" type="search" autoComplete="off" maxLength={80} value={query} onChange={event=>changeQuery(event.target.value)} placeholder={tab==="users"?"Nombre o @usuario…":"Texto de una publicación…"} className="min-w-0 flex-1 border border-border bg-card-bg px-4 py-3"/>
      <button type="submit" className="rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Buscar</button>
    </form>
    <div role="tablist" aria-label="Tipo de búsqueda" className="mb-6 flex gap-2">
      {(["users","posts"] as const).map(value=><button key={value} role="tab" id={value+"-tab"} aria-controls="search-results" aria-selected={tab===value} onClick={()=>{if(value===tab)setRetry(current=>current+1);else setTab(value);setLoading(true);setError(null);}} className={tab===value?"rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white":"rounded-full border border-border px-5 py-2 text-sm font-semibold"}>{value==="users"?"Usuarios":"Publicaciones"}</button>)}
    </div>
    <section id="search-results" role="tabpanel" aria-labelledby={tab+"-tab"} aria-busy={loading}>
      {error&&<p role="alert" className="mb-4 text-red-700">{error}<button className="ml-3 underline" onClick={()=>{setRetry(value=>value+1);setLoading(true);}}>Reintentar búsqueda</button></p>}
      {loading?<p role="status" className="p-6 text-center text-foreground/65">Buscando...</p>:!error&&tab==="users"?<>
        <h2 className="mb-3 text-sm font-semibold">{term?"Usuarios encontrados":"Personas para descubrir"}</h2>
        <div className="flex flex-col gap-3">
          {profiles.map(profile=><article key={profile.id} className="glass-panel flex items-center gap-3 rounded-2xl p-4">
            <Link href={"/profile/"+profile.id} aria-label={"Ver perfil de "+(profile.username||"usuario")} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"><Image src={profile.avatar_url||defaultAvatar} alt="" fill sizes="48px" className="object-cover"/></div>
              <div className="min-w-0"><p className="truncate font-semibold">@{profile.username||"usuario"}</p>{profile.full_name&&<p className="truncate text-sm text-foreground/65">{profile.full_name}</p>}{profile.bio&&<p className="truncate text-xs text-foreground/65">{profile.bio}</p>}</div>
            </Link>
            <Link href={"/profile/"+profile.id} className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold">Ver perfil</Link>
          </article>)}
          {!profiles.length&&<div className="glass-panel rounded-2xl p-8 text-center"><p>{term?"No encontramos usuarios con ese nombre.":"Todavía no hay otros usuarios para mostrar."}</p>{term&&<p className="mt-2 text-sm text-foreground/65">Prueba con parte del nombre o el usuario sin @.</p>}</div>}
        </div>
      </>:!error?<>
        <div className="grid grid-cols-3 gap-2">{posts.map(post=><Link key={post.id} href={"/posts/"+post.id} className="relative aspect-square overflow-hidden rounded-2xl"><Image src={post.image_url||defaultPostImage} alt={post.caption} sizes="(max-width:768px) 33vw, 240px" fill className="object-cover"/></Link>)}</div>
        {!posts.length&&<p className="p-6 text-center text-foreground/65">No encontramos publicaciones.</p>}
      </>:null}
    </section>
  </main></RequireAuth>;
}
