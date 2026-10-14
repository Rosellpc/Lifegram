"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defaultAvatar } from "../utils/assets";
import type { StoryRow } from "../utils/social";

export default function StoryViewer({stories,initialId,onClose}:{stories:StoryRow[];initialId:string;onClose:()=>void}) {
  const groups=new Map<string,StoryRow[]>();
  stories.forEach(story=>{const group=groups.get(story.user_id)||[];group.push(story);groups.set(story.user_id,group);});
  const ordered=[...groups.values()].flatMap(group=>group.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)));
  const [index,setIndex]=useState(Math.max(0,ordered.findIndex(story=>story.id===initialId)));
  const [paused,setPaused]=useState(false);
  const [ready,setReady]=useState(false);
  const [progress,setProgress]=useState(0);
  const [failed,setFailed]=useState(false);
  const [muted,setMuted]=useState(true);
  const dialog=useRef<HTMLDialogElement>(null);
  const video=useRef<HTMLVideoElement>(null);
  const advance=useRef<()=>void>(()=>{});
  const story=ordered[index];
  const profile=Array.isArray(story.profiles)?story.profiles[0]:story.profiles;
  const ownerStories=ordered.filter(item=>item.user_id===story.user_id);
  const ownerIndex=ownerStories.findIndex(item=>item.id===story.id);
  const owners=[...groups.keys()];
  const ownerPosition=owners.indexOf(story.user_id);
  const neighbor=(offset:number)=>groups.get(owners[ownerPosition+offset])?.[0];
  useEffect(()=>{
    advance.current=()=>{if(index<ordered.length-1){setIndex(value=>value+1);setProgress(0);setReady(false);setFailed(false);}else onClose();};
  },[index,ordered.length,onClose]);
  const previous=()=>{if(index>0){setIndex(value=>value-1);setProgress(0);setReady(false);setFailed(false);}else{setProgress(0);if(video.current)video.current.currentTime=0;}};

  useEffect(()=>{
    const node=dialog.current;
    const focused=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    node?.showModal();document.body.style.overflow="hidden";
    return()=>{node?.close();document.body.style.overflow=overflow;if(focused?.isConnected)focused.focus();};
  },[]);
  useEffect(()=>{
    if(!ready||paused||failed||story.media_type==="video")return;
    let last=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now();const increment=(now-last)/5000;last=now;
      setProgress(value=>Math.min(1,value+increment));
    },50);
    return()=>clearInterval(timer);
  },[ready,paused,failed,story.id,story.media_type]);
  useEffect(()=>{if(progress>=1&&story.media_type==="image")advance.current();},[progress,story.media_type]);
  useEffect(()=>{
    if(!video.current)return;
    if(paused)video.current.pause();
    else if(ready)void video.current.play().catch(()=>setPaused(true));
  },[paused,ready,story.id]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)setPaused(true);};
    document.addEventListener("visibilitychange",hidden);
    return()=>document.removeEventListener("visibilitychange",hidden);
  },[]);

  const previewCard=(item:StoryRow|undefined,direction:"previous"|"next")=>{
    if(!item)return <div className="hidden w-44 lg:block"/>;
    const author=Array.isArray(item.profiles)?item.profiles[0]:item.profiles;
    return <button aria-label={direction==="previous"?"Historias del usuario anterior":"Historias del siguiente usuario"} onClick={()=>{setIndex(ordered.findIndex(story=>story.id===item.id));setProgress(0);setReady(false);setFailed(false);}} className="relative hidden aspect-[9/16] w-44 overflow-hidden rounded-2xl bg-black opacity-55 transition-opacity hover:opacity-90 lg:block">
      {item.media_type==="image"?<Image src={item.media_url} alt="" fill sizes="176px" className="object-cover"/>:<video src={item.media_url} muted preload="metadata" className="h-full w-full object-cover"/>}
      <span className="absolute inset-0 bg-black/25"/><span className="absolute inset-x-0 bottom-10 text-center text-sm font-semibold text-white">@{author?.username||"usuario"}</span>
    </button>;
  };
  return <dialog ref={dialog} aria-label="Visor de historias" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{
    if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
    if(event.key==="ArrowRight"){event.preventDefault();advance.current();}
    if(event.key==="ArrowLeft"){event.preventDefault();previous();}
    if(event.code==="Space"&&!(event.target instanceof HTMLButtonElement)&&!(event.target instanceof HTMLAnchorElement)){event.preventDefault();setPaused(value=>!value);}
  }} className="story-dialog">
    <button type="button" onClick={onClose} aria-label="Cerrar historias" className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-3xl text-white">×</button>
    <div className="flex h-full items-center justify-center gap-6 px-0 sm:px-6">
      {previewCard(neighbor(-1),"previous")}
      <div className="story-frame relative overflow-hidden bg-black sm:rounded-2xl">
        {story.media_type==="video"?<video key={story.id} ref={video} src={story.media_url} muted={muted} playsInline autoPlay preload="auto" className="h-full w-full object-contain" aria-label={`Historia de ${profile?.username||"usuario"}`}
          onLoadedData={()=>setReady(true)} onError={()=>{setFailed(true);setReady(false);}} onEnded={()=>advance.current()} onTimeUpdate={event=>{const media=event.currentTarget;if(Number.isFinite(media.duration)&&media.duration>0)setProgress(media.currentTime/media.duration);}}/>:
          <Image key={story.id} src={story.media_url} alt={`Historia de ${profile?.username||"usuario"}`} fill sizes="(max-width:640px) 100vw, 520px" loading="eager" className="object-contain" onLoad={()=>setReady(true)} onError={()=>{setFailed(true);setReady(false);}}/>}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent"/>
        <div className="absolute inset-x-0 top-0 z-20 px-3 pt-4 sm:pt-3">
          <div className="mb-3 flex gap-1" aria-label={`Historia ${ownerIndex+1} de ${ownerStories.length}`}>
            {ownerStories.map((item,position)=><span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35"><span className="block h-full bg-white" style={{width:`${position<ownerIndex?100:position===ownerIndex?progress*100:0}%`}}/></span>)}
          </div>
          <div className="flex items-center gap-2 pr-10 sm:pr-0">
            <Link href={`/profile/${story.user_id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-2 text-white">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full"><Image src={profile?.avatar_url||defaultAvatar} alt="" fill sizes="32px" className="object-cover"/></span>
              <span className="truncate text-sm font-semibold">{profile?.username||"usuario"}</span>
            </Link>
            {story.media_type==="video"&&<button aria-label={muted?"Activar sonido":"Silenciar"} onClick={()=>setMuted(value=>!value)} className="p-2 text-xs text-white">{muted?"Sonido off":"Sonido on"}</button>}
            <button aria-label={paused?"Reanudar historia":"Pausar historia"} onClick={()=>setPaused(value=>!value)} className="flex h-10 w-10 items-center justify-center text-xl text-white">{paused?"▶":"Ⅱ"}</button>
          </div>
        </div>
        {!ready&&!failed&&<p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-white">Cargando historia...</p>}
        {failed&&<div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center text-white"><p>No se pudo cargar esta historia.</p><button onClick={()=>advance.current()} className="rounded-full border border-white/50 px-4 py-2">Continuar</button></div>}
        <button aria-label="Retroceder historia" onClick={previous} className="absolute bottom-20 left-0 top-24 z-10 w-1/3 bg-transparent"/>
        <button aria-label="Avanzar historia" onClick={()=>advance.current()} className="absolute bottom-20 right-0 top-24 z-10 w-1/3 bg-transparent"/>
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-5 pt-12">
          <button onClick={previous} aria-label="Anterior" disabled={index===0} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">‹</button>
          <p className="text-xs text-white/90">{paused?"En pausa":`${ownerIndex+1} / ${ownerStories.length}`}</p>
          <button onClick={()=>advance.current()} aria-label="Siguiente" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">›</button>
        </div>
      </div>
      {previewCard(neighbor(1),"next")}
    </div>
  </dialog>;
}
