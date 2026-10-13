const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Faltan las variables públicas de Supabase.');
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
});

async function main() {
  const checks = [
    ['Auth', () => fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key }, signal: AbortSignal.timeout(15000),
    }).then(response => ({ error: response.ok ? null : { message: `HTTP ${response.status}` } }))],
    ...Object.entries({
      profiles: 'id,username,avatar_url,full_name,bio,website,created_at,updated_at',
      posts: 'id,user_id,image_url,caption,location,created_at,updated_at,profiles!posts_user_id_fkey(id,username,avatar_url,full_name,bio,website)',
      post_likes: 'post_id,user_id',
      saved_posts: 'post_id,user_id',
      follows: 'follower_id,following_id',
      comments: 'id,post_id,user_id,content,created_at,profiles!comments_user_id_fkey(id,username,avatar_url,full_name)',
      stories: 'id,user_id,media_url,media_type,created_at,expires_at,profiles!stories_user_id_fkey(id,username,avatar_url,full_name)',
      notifications: 'id,recipient_id,actor_id,type,post_id,comment_id,is_read,created_at,actor:profiles!notifications_actor_id_fkey(id,username,avatar_url,full_name)',
    }).map(([table, columns]) => [table, () => client.from(table).select(columns).limit(0)]),
  ];
  for (const [name, check] of checks) {
    try {
      const { error } = await check();
      if (error) {
        console.error(`${name}: FAIL (${error.code || 'error'}: ${error.message})`);
        if (error.details) console.error(JSON.stringify(error.details));
        if (error.hint) console.error(error.hint);
        process.exitCode = 1;
      } else {
        console.log(`${name}: OK`);
      }
    } catch (error) {
      console.error(`${name}: FAIL (${error.cause?.code || error.name})`);
      process.exitCode = 1;
    }
  }
  console.log('Comprobación de solo lectura y acceso anónimo. No valida permisos de usuarios autenticados ni escrituras en Storage.');
}
main().catch(() => { console.error('La comprobación no pudo completarse.'); process.exitCode = 1; });
