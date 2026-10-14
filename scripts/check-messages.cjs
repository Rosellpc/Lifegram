const {loadEnvConfig}=require('@next/env');
const {createClient}=require('@supabase/supabase-js');
const {randomUUID}=require('node:crypto');
loadEnvConfig(process.cwd());
const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_TEST_EMAIL','SUPABASE_TEST_PASSWORD','SUPABASE_TEST_EMAIL_2','SUPABASE_TEST_PASSWORD_2'];
if(names.some(name=>!process.env[name])){console.error('Configura las dos cuentas de prueba.');process.exit(1);}
const make=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
const a=make(),b=make(),anonymous=make();
const checked=(result,label)=>{if(result.error)throw new Error(`${label}: ${result.error.code||result.error.status} ${result.error.message}`);return result.data;};
const ids=[randomUUID(),randomUUID(),randomUUID()];
let aId,bId;
let tableReady=false;
const channels=[];
function receive(client,userId,messageId){
  let resolveArrival,rejectArrival;
  const arrival=new Promise((resolve,reject)=>{resolveArrival=resolve;rejectArrival=reject;});
  arrival.catch(()=>{});
  const timer=setTimeout(()=>rejectArrival(new Error('No llegó el evento Realtime en 20 segundos')),20000);
  arrival.finally(()=>clearTimeout(timer)).catch(()=>{});
  const ready=new Promise((resolve,reject)=>{
    const readyTimer=setTimeout(()=>reject(new Error('No se pudo conectar a Realtime')),15000);
    const channel=client.channel(`validation-${randomUUID()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`recipient_id=eq.${userId}`},payload=>{if(payload.new.id===messageId)resolveArrival(payload.new);})
      .subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(readyTimer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(readyTimer);reject(new Error(`Realtime: ${status}`));}});
    channels.push([client,channel]);
  });
  return {ready,arrival};
}
async function main(){
  try{
    aId=checked(await a.auth.signInWithPassword({email:process.env.SUPABASE_TEST_EMAIL,password:process.env.SUPABASE_TEST_PASSWORD}),'Login A').user.id;
    bId=checked(await b.auth.signInWithPassword({email:process.env.SUPABASE_TEST_EMAIL_2,password:process.env.SUPABASE_TEST_PASSWORD_2}),'Login B').user.id;
    if(aId===bId)throw new Error('Las cuentas deben ser distintas');
    checked(await a.from('profiles').select('id,username').eq('id',bId).single(),'Leer perfil de otra persona');
    console.log('Acceso al perfil de otra persona: OK');
    checked(await a.from('direct_messages').select('id,sender_id,recipient_id,content,created_at').limit(0),'Tabla direct_messages (aplicar migración 005)');
    tableReady=true;
    const inboxB=receive(b,bId,ids[0]);await inboxB.ready;
    checked(await a.from('direct_messages').insert({id:ids[0],sender_id:aId,recipient_id:bId,content:'Mensaje temporal de validación'}),'Enviar A → B');
    const delivered=await inboxB.arrival;if(delivered.sender_id!==aId)throw new Error('Emisor incorrecto');
    console.log('Entrega Realtime A → B: OK');
    const inboxA=receive(a,aId,ids[1]);await inboxA.ready;
    checked(await b.from('direct_messages').insert({id:ids[1],sender_id:bId,recipient_id:aId,content:'Respuesta temporal de validación'}),'Enviar B → A');
    await inboxA.arrival;console.log('Entrega Realtime B → A: OK');
    checked(await b.from('direct_messages').select('id').eq('id',ids[0]).single(),'Leer historial');console.log('Historial persistente: OK');
    const spoof=await a.from('direct_messages').insert({id:ids[2],sender_id:bId,recipient_id:aId,content:'Suplantación de prueba'});
    if(!spoof.error)throw new Error('FAIL: se permitió suplantar al emisor');console.log('Suplantación de emisor: bloqueada');
    const rows=await anonymous.from('direct_messages').select('id').in('id',ids);
    if(!rows.error&&rows.data.length)throw new Error('FAIL: mensajes visibles sin sesión');console.log('Acceso sin sesión: bloqueado');
  }finally{
    for(const [client,channel]of channels)await client.removeChannel(channel);
    if(tableReady&&aId)checked(await a.from('direct_messages').delete().in('id',ids).eq('sender_id',aId),'Limpieza A');
    if(tableReady&&bId)checked(await b.from('direct_messages').delete().in('id',ids).eq('sender_id',bId),'Limpieza B');
    a.realtime.disconnect();b.realtime.disconnect();anonymous.realtime.disconnect();
    await Promise.all([a.auth.signOut({scope:'local'}),b.auth.signOut({scope:'local'})]);
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>{
  a.realtime.disconnect();b.realtime.disconnect();anonymous.realtime.disconnect();
  process.exit(process.exitCode||0);
});
