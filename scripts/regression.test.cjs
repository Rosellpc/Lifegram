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

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(source, {
    exports: loadedModule.exports, module: loadedModule,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return loadedModule.exports;
}

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
  const sessionPromise = new Promise(resolve => { resolveSession = resolve; });
  const component = load('app/components/RequireAuth.tsx', {
    react: { useState: () => [false, value => states.push(value)], useEffect: callback => { effect = callback; } },
    'react/jsx-runtime': { jsx: () => null, Fragment: 'fragment' },
    'next/navigation': { useRouter: () => ({ replace: route => routes.push(route) }) },
    '../utils/client': { supabase: { auth: {
      getSession: () => sessionPromise,
      onAuthStateChange: callback => {
        listener = callback;
        return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
      },
    } } },
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
