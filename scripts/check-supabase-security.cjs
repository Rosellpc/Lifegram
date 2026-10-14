const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
loadEnvConfig(process.cwd());
const required = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_TEST_EMAIL','SUPABASE_TEST_PASSWORD','SUPABASE_TEST_EMAIL_2','SUPABASE_TEST_PASSWORD_2'];
if (required.some(name => !process.env[name])) { console.error('Configura las dos cuentas de prueba en .env.local.'); process.exit(1); }
const make = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
});
const a = make(), b = make(), anonymous = make();
const cleanup = [];
const checked = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.code} ${result.error.message}`); return result.data; };
function expect(condition, label) { console.log(`${condition ? 'OK' : 'FAIL'}: ${label}`); if (!condition) process.exitCode = 1; }
async function insert(table, row, filter) {
  checked(await a.from(table).insert(row), `Preparar ${table}`);
  cleanup.push(async () => checked(await a.from(table).delete().match(filter), `Limpiar ${table}`));
}
async function denied(table, filter, update) {
  const before = checked(await a.from(table).select('*').match(filter), `Leer ${table}`);
  const changed = await b.from(table).update(update).match(filter).select('*');
  expect(Boolean(changed.error) || changed.data?.length === 0, `${table}: actualización ajena bloqueada`);
  const removed = await b.from(table).delete().match(filter).select('*');
  expect(Boolean(removed.error) || removed.data?.length === 0, `${table}: eliminación ajena bloqueada`);
  const after = checked(await a.from(table).select('*').match(filter), `Verificar ${table}`);
  expect(JSON.stringify(before) === JSON.stringify(after), `${table}: datos originales intactos`);
}
async function main() {
  try {
    const first = checked(await a.auth.signInWithPassword({ email: process.env.SUPABASE_TEST_EMAIL, password: process.env.SUPABASE_TEST_PASSWORD }), 'Login A').user.id;
    const second = checked(await b.auth.signInWithPassword({ email: process.env.SUPABASE_TEST_EMAIL_2, password: process.env.SUPABASE_TEST_PASSWORD_2 }), 'Login B').user.id;
    if (first === second) throw new Error('Se requieren cuentas diferentes');
    const storageName = `security-${randomUUID()}.png`;
    const storagePath = `posts/${storageName}`;
    checked(await a.storage.from('images').upload(storagePath,readFileSync('img/1.png'),{contentType:'image/png'}),'Preparar Storage');
    cleanup.push(async () => checked(await a.storage.from('images').remove([storagePath]),'Limpiar Storage'));
    const foreignFileDelete = await b.storage.from('images').remove([storagePath]);
    expect(Boolean(foreignFileDelete.error) || foreignFileDelete.data.length === 0,'Storage: eliminación ajena bloqueada');
    const remainingFile = checked(await a.storage.from('images').list('posts',{search:storageName}),'Verificar Storage');
    expect(remainingFile.some(file=>file.name===storageName),'Storage: archivo original intacto');
    // Only verify another profile's immutability using an unchanged value.
    const profile = checked(await a.from('profiles').select('bio').eq('id',first).single(),'Perfil');
    const profileWrite = await b.from('profiles').update({bio:profile.bio}).eq('id',first).select('id');
    expect(Boolean(profileWrite.error) || profileWrite.data?.length === 0, 'profiles: actualización ajena bloqueada');
    const id = randomUUID();
    await insert('posts',{id,user_id:first,image_url:'https://example.com/validation.png',caption:`security-${id}`},{id});
    await denied('posts',{id},{caption:'unauthorized'});
    const spoofedPostId = randomUUID();
    const spoofedPost = await b.from('posts').insert({id:spoofedPostId,user_id:first,image_url:'https://example.com/validation.png',caption:'spoofed owner'});
    expect(Boolean(spoofedPost.error),'posts: no se puede insertar como otro usuario');
    if (!spoofedPost.error) cleanup.push(async () => checked(await a.from('posts').delete().eq('id',spoofedPostId),'Limpiar post suplantado'));
    const commentId = randomUUID();
    await insert('comments',{id:commentId,post_id:id,user_id:first,content:'security check'},{id:commentId});
    await denied('comments',{id:commentId},{content:'unauthorized'});
    const spoofedCommentId = randomUUID();
    const spoofedComment = await b.from('comments').insert({id:spoofedCommentId,post_id:id,user_id:first,content:'spoofed owner'});
    expect(Boolean(spoofedComment.error),'comments: no se puede insertar como otro usuario');
    if (!spoofedComment.error) cleanup.push(async () => checked(await a.from('comments').delete().eq('id',spoofedCommentId),'Limpiar comentario suplantado'));
    const storyId = randomUUID();
    await insert('stories',{id:storyId,user_id:first,media_url:'https://example.com/validation.png',media_type:'image',expires_at:new Date(Date.now()+60000).toISOString()},{id:storyId});
    await denied('stories',{id:storyId},{media_url:'https://example.com/unauthorized.png'});
    for (const table of ['post_likes','saved_posts']) {
      const filter = {post_id:id,user_id:first};
      await insert(table,filter,filter);
      await denied(table,filter,{user_id:second});
    }
    const privateRows = await b.from('saved_posts').select('post_id').eq('post_id',id).eq('user_id',first);
    expect(!privateRows.error && privateRows.data.length === 0,'saved_posts: lectura ajena bloqueada');
    const existing = checked(await a.from('follows').select('follower_id').eq('follower_id',first).eq('following_id',second).maybeSingle(),'Seguimiento');
    if (!existing) {
      const filter = {follower_id:first,following_id:second};
      await insert('follows',filter,filter);
      await denied('follows',filter,{follower_id:second,following_id:first});
    } else console.log('PENDIENTE: follows ya existe; no se toca la relación previa');
    checked(await b.from('post_likes').insert({post_id:id,user_id:second}),'Preparar notificación');
    cleanup.push(async () => checked(await b.from('post_likes').delete().eq('post_id',id).eq('user_id',second),'Limpiar like B'));
    const notificationId = randomUUID();
    checked(await b.from('notifications').insert({id:notificationId,actor_id:second,recipient_id:first,type:'like',post_id:id}),'Preparar notificación');
    await denied('notifications',{id:notificationId},{is_read:true});
    const foreignNotifications = await b.from('notifications').select('id').eq('id',notificationId);
    expect(!foreignNotifications.error && foreignNotifications.data.length === 0,'notifications: lectura ajena bloqueada');
    const readOwn = await a.from('notifications').update({is_read:true}).eq('id',notificationId).select('id').single();
    expect(!readOwn.error && Boolean(readOwn.data),'notifications: destinatario puede marcar como leída');
    for (const table of ['profiles','posts','comments','stories','post_likes','saved_posts','follows','notifications']) {
      const rows = await anonymous.from(table).select('*').limit(1);
      expect(Boolean(rows.error) || rows.data.length === 0, `${table}: acceso sin sesión bloqueado`);
    }
    const stats = await a.rpc('post_counts',{post_ids:[id]});
    expect(!stats.error && Number(stats.data?.[0]?.likes) === 2 && Number(stats.data?.[0]?.comments) === 1, 'RPC de conteos instalada y correcta');
  } finally {
    for (const action of cleanup.reverse()) { try { await action(); } catch(error) { console.error(error.message); process.exitCode=1; } }
    await Promise.all([a.auth.signOut({scope:'local'}),b.auth.signOut({scope:'local'})]);
  }
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
