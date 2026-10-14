const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('database error objects retain their message and code', () => {
  const { getErrorMessage } = load('app/utils/errors.ts', {});
  assert.equal(getErrorMessage({ message: 'Foreign key violation', code: '23503' }, 'Fallback'), 'Foreign key violation (23503)');
  assert.equal(getErrorMessage(new Error('Storage failed'), 'Fallback'), 'Storage failed');
  assert.equal(getErrorMessage(null, 'Fallback'), 'Fallback');
});

function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(source, {
    setTimeout: callback => callback(),
    exports: loadedModule.exports, module: loadedModule,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  }, { filename: file });
  return loadedModule.exports;
}

test('messages deduplicate acknowledgements and ignore unrelated conversations', () => {
  const {mergeMessages,belongsToConversation}=load('app/utils/messages.ts',{});
  const message={id:'a',sender_id:'viewer',recipient_id:'peer',content:'hola',created_at:'2026-10-13T12:00:00Z'};
  const earlier={...message,id:'b',created_at:'2026-10-13T11:00:00Z'};
  const result=mergeMessages([message],[message,earlier]);
  assert.equal(result.length,2);assert.equal(result[0].id,'b');
  assert.equal(belongsToConversation(message,'viewer','peer'),true);
  assert.equal(belongsToConversation({...message,sender_id:'peer',recipient_id:'viewer'},'viewer','peer'),true);
  assert.equal(belongsToConversation({...message,recipient_id:'someone-else'},'viewer','peer'),false);
});

test('pending operations time out and resolved operations clear their timer', async () => {
  const { withTimeout } = load('app/utils/async.ts', {}, { setTimeout, clearTimeout });
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /tardó demasiado/);
  assert.equal(await withTimeout(Promise.resolve('ready'), 5), 'ready');
});

test('feed uses a stable cursor and database counts instead of downloading likes', async () => {
  const social = load('app/utils/social.ts', { './assets': { defaultAvatar: { src: '/avatar.png' } } });
  const calls = [];
  const post = { id: '00000000-0000-0000-0000-000000000001', user_id: 'viewer', created_at: '2026-10-13T00:00:00Z', caption: 'test' };
  const query = {
    select() { return this; }, order(column) { calls.push(['order',column]); return this; },
    limit(value) { calls.push(['limit',value]); return this; },
    or(value) { calls.push(['cursor',value]); return this; },
    then(resolve,reject) { return Promise.resolve({data:[post],error:null}).then(resolve,reject); },
  };
  const client = {
    from(table) { assert.equal(table,'posts'); return query; },
    rpc: async (name,params) => {
      assert.equal(name,'post_counts'); assert.equal(params.post_ids[0],post.id);
      return {data:[{post_id:post.id,likes:3,comments:2}],error:null};
    },
  };
  const posts = await social.fetchPostsBundle(client,{before:{created_at:post.created_at,id:post.id}});
  assert.equal(posts[0].likes,3); assert.equal(posts[0].commentsCount,2);
  assert.deepEqual(calls.slice(0,3),[['order','created_at'],['order','id'],['limit',20]]);
  assert.match(calls[3][1],/created_at\.lt\./);
  assert.match(calls[3][1],/id\.lt\./);
});

test('dynamic columns count valid IDs and ignore null values', async () => {
  const social = load('app/utils/social.ts', { './assets': { defaultAvatar: { src: '/avatar.png' } } });
  const query = {
    select() { return this; },
    in: async () => ({ data: [{ post_id: 'a' }, { post_id: 'a' }, { post_id: null }], error: null }),
    eq: async () => ({ data: [{ following_id: 'b' }, { following_id: null }], error: null }),
  };
  const client = { from: () => query };
  const counts = await social.fetchCountsByForeignKey(client, 'post_likes', 'post_id', ['a']);
  assert.equal(counts.get('a'), 2);
  assert.equal(counts.size, 1);
  const ids = await social.fetchScopedIdSet(client, 'follows', 'following_id', 'follower_id', 'viewer');
  assert.deepEqual([...ids], ['b']);
});

test('following queries use the viewer as follower, not the target profile', async () => {
  const social = load('app/utils/social.ts', { './assets': { defaultAvatar: { src: '/avatar.png' } } });
  const calls = [];
  const client = { from(table) {
    calls.push(table);
    return { select(column) {
      calls.push(column);
      return { eq: async (column, value) => {
        calls.push(column, value);
        return { data: [{ following_id: 'target' }], error: null };
      } };
    } };
  } };
  assert.deepEqual([...await social.fetchFollowingIds(client, 'viewer')], ['target']);
  assert.deepEqual(calls, ['follows', 'following_id', 'follower_id', 'viewer']);
});

test('search rows become posts with defaults and profile information', () => {
  const social = load('app/utils/social.ts', { './assets': { defaultAvatar: { src: '/avatar.png' } } });
  const post = social.toPost({ id: 'p', user_id: 'u', caption: null, profiles: [{ username: 'ana', avatar_url: null }] });
  assert.equal(post.likes, 0);
  assert.equal(post.caption, '');
  assert.equal(post.user.username, 'ana');
  assert.equal(post.user.avatar, '/avatar.png');
});

test('sign-out hides protected content and stale session lookup cannot reopen it', async () => {
  let effect, listener, resolveSession, unsubscribed = false;
  const states = [], routes = [];
  let hookIndex = 0;
  const sessionPromise = new Promise(resolve => { resolveSession = resolve; });
  const component = load('app/components/RequireAuth.tsx', {
    react: { useState: initial => { const index = hookIndex++; return [initial, value => { if (index === 0) states.push(value); }]; }, useEffect: callback => { effect = callback; } },
    'react/jsx-runtime': { jsx: () => null, Fragment: 'fragment' },
    'next/navigation': { useRouter: () => ({ replace: route => routes.push(route) }) },
    '../utils/client': { supabase: { auth: {
      getSession: () => sessionPromise,
      onAuthStateChange: callback => {
        listener = callback;
        return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
      },
    } } },
    '../utils/async': { withTimeout: promise => promise },
  });
  component.default({ children: 'private' });
  const cleanup = effect();
  listener('SIGNED_IN', { user: { id: 'viewer' } });
  listener('SIGNED_OUT', null);
  resolveSession({ data: { session: { user: { id: 'viewer' } } }, error: null });
  await sessionPromise;
  await Promise.resolve();
  assert.deepEqual(states, [true, false]);
  assert.deepEqual(routes, ['/login']);
  cleanup();
  listener('SIGNED_IN', { user: { id: 'viewer' } });
  assert.equal(states.length, 2);
  assert.equal(unsubscribed, true);
});
