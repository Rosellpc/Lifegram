"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import RequireAuth from "../components/RequireAuth";
import { supabase, getCurrentUser } from "../utils/client";
import { defaultAvatar } from "../utils/assets";
import { getErrorMessage } from "../utils/errors";
import { mergeMessages, type DirectMessage } from "../utils/messages";
import { fetchProfilesByIds } from "../utils/social";

type Peer = {username:string;avatar_url:string|null};
export default function MessagesPage() {
  const [viewer,setViewer]=useState<string|null>(null);
  const [messages,setMessages]=useState<DirectMessage[]>([]);
  const [profiles,setProfiles]=useState<Map<string,Peer>>(new Map());
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  const [page,setPage]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  useEffect(()=>{
    let active=true;
    let channel:ReturnType<typeof supabase.channel>|undefined;
    const start=async()=>{
      const {data:{user}}=await getCurrentUser();if(!user||!active)return;
      setViewer(user.id);
      const refresh=async()=>{
        const result=await supabase.from("direct_messages").select("id,sender_id,recipient_id,content,created_at")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).order("id",{ascending:false}).range(0,(page+1)*50-1);
        if(result.error)throw result.error;
        const ids=[...new Set(result.data.map(row=>row.sender_id===user.id?row.recipient_id:row.sender_id))];
        const peers=await fetchProfilesByIds(supabase,ids);
        if(active){setMessages(result.data);setProfiles(peers);setHasMore(result.data.length===(page+1)*50);setLoading(false);}
      };
      channel=supabase.channel(`inbox-${user.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`recipient_id=eq.${user.id}`},()=>{void refresh().catch(error=>{if(active)setError(getErrorMessage(error,"No se pudo actualizar la bandeja."));});})
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`sender_id=eq.${user.id}`},()=>{void refresh().catch(error=>{if(active)setError(getErrorMessage(error,"No se pudo actualizar la bandeja."));});})
        .subscribe(status=>{if(active&&status==="SUBSCRIBED")void refresh().catch(error=>setError(getErrorMessage(error,"No se pudo actualizar la bandeja.")));});
      await refresh();
    };
    start().catch(error=>{if(active){setError(getErrorMessage(error,"No se pudieron cargar los mensajes."));setLoading(false);}});
    return()=>{active=false;if(channel)void supabase.removeChannel(channel);};
  },[page,retry]);
  const conversations=new Map<string,DirectMessage>();
  for(const message of mergeMessages([],messages).reverse()){
    const peer=message.sender_id===viewer?message.recipient_id:message.sender_id;
    if(!conversations.has(peer))conversations.set(peer,message);
  }
  return <RequireAuth><main className="mx-auto max-w-2xl px-4 py-6 pb-32">
    <header className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold">Mensajes</h1><Link href="/search" className="rounded-xl border border-border px-4 py-2 text-sm">Buscar personas</Link></header>
    {error&&<p role="alert" className="mb-4 text-red-700">{error}<button className="ml-3 underline" onClick={()=>{setError(null);setLoading(true);setRetry(value=>value+1);}}>Reintentar</button></p>}
    <section className="glass-panel overflow-hidden rounded-[28px]">
      {loading&&!messages.length?<p className="p-6">Cargando conversaciones...</p>:!conversations.size&&!error?<div className="p-8 text-center"><p>Todavía no tienes conversaciones.</p><p className="mt-2 text-sm text-foreground/65">Busca una persona y pulsa Mensaje en su perfil.</p></div>:null}
      {[...conversations].map(([peer,message])=><Link key={peer} href={`/messages/${peer}`} className="flex items-center gap-3 border-b border-border p-4 last:border-0 hover:bg-background">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"><Image src={profiles.get(peer)?.avatar_url||defaultAvatar} alt="" fill sizes="48px" className="object-cover"/></div>
        <div className="min-w-0 flex-1"><p className="font-semibold">@{profiles.get(peer)?.username||"usuario"}</p><p className="truncate text-sm text-foreground/65">{message.sender_id===viewer?"Tú: ":""}{message.content}</p></div>
        <time dateTime={message.created_at} className="text-xs text-foreground/65">{new Date(message.created_at).toLocaleDateString("es")}</time>
      </Link>)}
    </section>
    {hasMore&&<button onClick={()=>setPage(value=>value+1)} className="mt-4 rounded-xl border p-3">Cargar conversaciones anteriores</button>}
  </main></RequireAuth>;
}
