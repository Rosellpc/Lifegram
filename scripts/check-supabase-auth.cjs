const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');

loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_TEST_EMAIL;
const password = process.env.SUPABASE_TEST_PASSWORD;
if (!url || !key || !email || !password) {
  console.error('Configura Supabase y SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD en .env.local.');
  process.exit(1);
}
const makeClient = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
});
const client = makeClient();
const second = makeClient();
const fixtureId = randomUUID();
const path = `posts/validation-${fixtureId}.png`;
const caption = `Validación automática ${fixtureId}`;
const cleanups = [];

function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code || result.error.status || 'error'} ${result.error.message}`);
  return result.data;
}
async function login(target, mail, secret) {
  const data = checked(await target.auth.signInWithPassword({ email: mail, password: secret }), 'Login');
  if (!data.user || !data.session) throw new Error('Login sin sesión');
  return data.user.id;
}
async function main() {
  try {
    const userId = await login(client, email, password);
    console.log('Login: OK');
    const profile = checked(await client.from('profiles').select('id,username').eq('id', userId).maybeSingle(), 'Perfil');
    if (!profile) throw new Error('Perfil: la cuenta inicia sesión, pero no tiene un perfil visible. Comprueba que profiles.id coincida con el UID de Auth y que RLS permita leer el perfil propio.');
    console.log('Perfil: OK');

    checked(await client.storage.from('images').upload(path, readFileSync('img/1.png'), { contentType: 'image/png', upsert: false }), 'Subir imagen');
    cleanups.push(async () => checked(await client.storage.from('images').remove([path]), 'Eliminar imagen de prueba'));
    const imageUrl = client.storage.from('images').getPublicUrl(path).data.publicUrl;
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Imagen pública: HTTP ${response.status}`);
    await response.body?.cancel();
    console.log('Storage (subida y acceso público): OK');

    checked(await client.from('posts').insert({ id: fixtureId, user_id: userId, image_url: imageUrl, caption }), 'Crear publicación');
    cleanups.push(async () => checked(await client.from('posts').delete().eq('id', fixtureId).eq('user_id', userId), 'Eliminar publicación de prueba'));
    const post = checked(await client.from('posts').select('id,caption,profiles!posts_user_id_fkey(id,username)').eq('id', fixtureId).single(), 'Leer publicación');
    if (post.caption !== caption) throw new Error('La publicación leída no coincide');
    console.log('Publicación y relación con autor: OK');
    const edited = checked(await client.from('posts').update({caption:`${caption} editada`}).eq('id',fixtureId).eq('user_id',userId).select('caption').single(),'Editar publicación');
    if (edited.caption !== `${caption} editada`) throw new Error('La edición no persistió');
    console.log('Edición de publicación propia: OK');

    for (const table of ['post_likes', 'saved_posts']) {
      checked(await client.from(table).insert({ post_id: fixtureId, user_id: userId }), table);
      cleanups.push(async () => checked(await client.from(table).delete().eq('post_id', fixtureId).eq('user_id', userId), `Limpiar ${table}`));
      checked(await client.from(table).select('post_id').eq('post_id', fixtureId).eq('user_id', userId).single(), `Leer ${table}`);
      console.log(`${table}: OK`);
    }
    const commentId = randomUUID();
    checked(await client.from('comments').insert({ id: commentId, post_id: fixtureId, user_id: userId, content: caption }), 'Comentario');
    cleanups.push(async () => checked(await client.from('comments').delete().eq('id', commentId).eq('user_id', userId), 'Limpiar comentario'));
    checked(await client.from('comments').select('id,profiles!comments_user_id_fkey(id,username)').eq('id', commentId).single(), 'Leer comentario');
    console.log('Comentarios: OK');

    const storyId = randomUUID();
    checked(await client.from('stories').insert({ id: storyId, user_id: userId, media_url: imageUrl, media_type: 'image', expires_at: new Date(Date.now() + 86400000).toISOString() }), 'Historia');
    cleanups.push(async () => checked(await client.from('stories').delete().eq('id', storyId).eq('user_id', userId), 'Limpiar historia'));
    checked(await client.from('stories').select('id,profiles!stories_user_id_fkey(id,username)').eq('id', storyId).single(), 'Leer historia');
    console.log('Historias: OK');

    if (process.env.SUPABASE_TEST_EMAIL_2 && process.env.SUPABASE_TEST_PASSWORD_2) {
      const targetId = await login(second, process.env.SUPABASE_TEST_EMAIL_2, process.env.SUPABASE_TEST_PASSWORD_2);
      if (targetId === userId) throw new Error('La segunda cuenta debe ser distinta');
      const existing = checked(await client.from('follows').select('follower_id').eq('follower_id', userId).eq('following_id', targetId).maybeSingle(), 'Consultar seguimiento');
      if (!existing) {
        checked(await client.from('follows').insert({ follower_id: userId, following_id: targetId }), 'Seguir');
        cleanups.push(async () => checked(await client.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId), 'Deshacer seguimiento de prueba'));
        checked(await client.from('follows').select('following_id').eq('follower_id', userId).eq('following_id', targetId).single(), 'Leer seguimiento');
        console.log('Seguimiento entre dos cuentas: OK');
      } else {
        console.log('Seguimiento: OMITIDO (relación preexistente)');
      }
    } else {
      console.log('Seguimiento entre dos cuentas: PENDIENTE (falta segunda cuenta)');
    }
  } finally {
    for (const cleanup of cleanups.reverse()) {
      try { await cleanup(); }
      catch (error) { console.error(error.message); process.exitCode = 1; }
    }
    const exits = await Promise.all([client.auth.signOut({ scope: 'local' }), second.auth.signOut({ scope: 'local' })]);
    exits.forEach(result => { if (result.error) { console.error('Cerrar sesión: FAIL'); process.exitCode=1; } });
    if ((await client.auth.getSession()).data.session) { console.error('La sesión sigue activa'); process.exitCode=1; }
    else console.log('Cerrar sesión: OK');
    console.log(`Limpieza finalizada. Identificador de prueba: ${fixtureId}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
