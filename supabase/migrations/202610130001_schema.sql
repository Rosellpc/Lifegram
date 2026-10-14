begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null, full_name text, bio text, avatar_url text, website text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null, caption text, location text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null, media_type text not null check(media_type in ('image','video')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '24 hours'
);
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id<>following_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade, type text not null,
  post_id uuid references public.posts(id) on delete cascade, comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists lifegram_posts_cursor on public.posts(created_at desc,id desc);
create index if not exists lifegram_posts_author on public.posts(user_id,created_at desc,id desc);
create index if not exists lifegram_comments_post on public.comments(post_id,created_at);
create index if not exists lifegram_notifications_recipient on public.notifications(recipient_id,created_at desc);
create index if not exists lifegram_follows_target on public.follows(following_id);
create index if not exists lifegram_saved_user on public.saved_posts(user_id);
create index if not exists lifegram_stories_expiry on public.stories(expires_at);

-- Stable generated username avoids collisions in user-controlled signup metadata.
create or replace function public.lifegram_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username, full_name)
  values(new.id, 'user_' || replace(new.id::text,'-',''), nullif(new.raw_user_meta_data->>'username',''))
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.lifegram_create_profile() from public, anon, authenticated;
drop trigger if exists lifegram_auth_profile on auth.users;
do $$
begin
  if not exists (
    select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
    where t.tgrelid='auth.users'::regclass and not t.tgisinternal
      and t.tgenabled <> 'D' and pg_get_functiondef(p.oid) ilike '%profiles%'
  ) then
    create trigger lifegram_auth_profile after insert on auth.users for each row execute function public.lifegram_create_profile();
  else
    raise notice 'Se conserva el trigger existente de perfiles. Verificar registro con confirmación de correo.';
  end if;
end $$;
insert into public.profiles(id,username,full_name)
select id, 'user_' || replace(id::text,'-',''), nullif(raw_user_meta_data->>'username','') from auth.users
on conflict(id) do nothing;
commit;
