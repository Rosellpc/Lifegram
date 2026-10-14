"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { getCurrentUser, supabase } from "../../utils/client";
import { getErrorMessage } from "../../utils/errors";
import { belongsToConversation, mergeMessages, type DirectMessage } from "../../utils/messages";

export default function ConversationPage() {
  const peer = useParams<{id:string}>().id;
  return <Conversation key={peer} peer={peer}/>;
}

function Conversation({peer}:{peer:string}) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [username, setUsername] = useState("Usuario");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<{id:string;content:string;recipient_id:string} | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const scrollToLatest = useRef(true);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const start = async () => {
      const {data:{user}} = await getCurrentUser();
      if (!active || !user) return;
      if (peer===user.id || !/^[0-9a-f-]{36}$/i.test(peer)) throw new Error("Selecciona el perfil de otra persona para conversar.");
      setViewer(user.id);
      const profile = await supabase.from("profiles").select("username").eq("id",peer).single();
      if (profile.error) throw new Error("No encontramos este usuario.");
      if (!active) return;
      setUsername(profile.data.username);
      const refresh = async () => {
        const result = await supabase.from("direct_messages").select("id,sender_id,recipient_id,content,created_at")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${user.id})`)
          .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(30);
        if (result.error) throw result.error;
        if (active) {
          const oldest = result.data[result.data.length-1];
          // Rebuild the latest window on reconnect so a long offline interval
          // cannot leave a hidden gap between retained and newly loaded history.
          setMessages(previous=>mergeMessages(oldest ? previous.filter(message=>message.created_at >= oldest.created_at) : previous,result.data));
          setHasOlder(result.data.length===30);setLoading(false);
        }
      };
      const receive = (payload: {new: Record<string,unknown>}) => {
        const message = payload.new as DirectMessage;
        if (active && belongsToConversation(message,user.id,peer)) setMessages(previous=>mergeMessages(previous,[message]));
      };
      channel = supabase.channel(`conversation-${user.id}-${peer}`)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`recipient_id=eq.${user.id}`},receive)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:`sender_id=eq.${user.id}`},receive)
        .subscribe(status=>{
          if (!active) return;
          setConnected(status==="SUBSCRIBED");
          if (status==="SUBSCRIBED") void refresh().catch(error=>{if(active){setError(getErrorMessage(error,"No se pudo actualizar la conversación."));setLoading(false);}});
        });
      await refresh();
    };
    start().catch(error=>{if(active){setError(getErrorMessage(error,"No se pudo cargar la conversación."));setLoading(false);}});
    return ()=>{active=false;if(channel) void supabase.removeChannel(channel);};
  },[peer,retry]);

  useEffect(()=>{
    if (scrollToLatest.current) end.current?.scrollIntoView({block:"nearest"});
    scrollToLatest.current=true;
  },[messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!viewer || peer===viewer || !content || lock.current) return;
    lock.current=true;setSending(true);setError(null);
    if (!attempt.current || attempt.current.content!==content || attempt.current.recipient_id!==peer) attempt.current={id:crypto.randomUUID(),content,recipient_id:peer};
    try {
      const result = await supabase.from("direct_messages").insert({...attempt.current,sender_id:viewer}).select("id,sender_id,recipient_id,content,created_at").single();
      let message: DirectMessage;
      if (result.error?.code==="23505") {
        const existing = await supabase.from("direct_messages").select("id,sender_id,recipient_id,content,created_at").eq("id",attempt.current.id).eq("sender_id",viewer).single();
        if (existing.error) throw existing.error;
        message=existing.data;
      } else {if(result.error)throw result.error;message=result.data;}
      setMessages(previous=>mergeMessages(previous,[message]));setDraft("");attempt.current=null;
    } catch(error) {setError(getErrorMessage(error,"No se pudo enviar. El texto se conserva para reintentar."));}
    finally {lock.current=false;setSending(false);}
  };

  const loadOlder = async () => {
    if (!viewer || loading || !messages.length) return;
    setLoading(true);
    try {
      const first=messages[0];
      const result=await supabase.from("direct_messages").select("id,sender_id,recipient_id,content,created_at")
        .or(`and(sender_id.eq.${viewer},recipient_id.eq.${peer},or(created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id}))),and(sender_id.eq.${peer},recipient_id.eq.${viewer},or(created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})))`)
        .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(30);
      if(result.error)throw result.error;
      scrollToLatest.current=false;
      setMessages(previous=>mergeMessages(previous,result.data));setHasOlder(result.data.length===30);
    }catch(error){setError(getErrorMessage(error,"No se pudo cargar el historial."));}finally{setLoading(false);}
  };

  return <RequireAuth><main className="mx-auto max-w-2xl px-4 py-6 pb-32">
    <header className="mb-4 flex items-center justify-between gap-4">
      <Link href="/messages" className="text-sm underline">← Mensajes</Link>
      <Link href={`/profile/${peer}`} className="font-semibold">@{username}</Link>
      <span className="text-xs text-foreground/65">{connected ? "En tiempo real" : <button type="button" onClick={()=>setRetry(value=>value+1)} className="underline">Reconectar</button>}</span>
    </header>
    <section className="glass-panel rounded-[28px] p-4">
      {error && <p role="alert" className="mb-4 text-red-700">{error}<button type="button" className="ml-3 underline" onClick={()=>{setError(null);setRetry(value=>value+1);}}>Reintentar conexión</button></p>}
      <div className="h-[55vh] overflow-y-auto space-y-3" aria-label="Historial de mensajes" aria-live="polite" aria-relevant="additions">
        {hasOlder && <button disabled={loading} onClick={loadOlder} className="underline">Cargar mensajes anteriores</button>}
        {loading && !messages.length ? <p>Cargando conversación...</p> : !messages.length && !error ? <p className="p-6 text-center text-foreground/65">Todavía no hay mensajes. Saluda para empezar.</p> : null}
        {messages.map(message=><div key={message.id} className={`flex ${message.sender_id===viewer ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id===viewer ? "bg-primary text-white" : "border border-border bg-background"}`}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <time dateTime={message.created_at} className="mt-1 block text-[10px] opacity-80">{new Date(message.created_at).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}</time>
          </div>
        </div>)}<div ref={end}/>
      </div>
      <form onSubmit={send} className="mt-4 flex gap-3 border-t border-border pt-4">
        <textarea aria-label="Mensaje" value={draft} onChange={event=>setDraft(event.target.value)} disabled={sending} maxLength={2000} rows={2} placeholder="Escribe un mensaje..." className="min-w-0 flex-1 border border-border p-3"/>
        <button disabled={sending || !draft.trim() || !viewer} className="rounded-2xl bg-primary px-4 text-white">{sending ? "Enviando..." : "Enviar"}</button>
      </form>
    </section>
  </main></RequireAuth>;
}
