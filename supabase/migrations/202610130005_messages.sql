begin;
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_distinct_users check(sender_id <> recipient_id)
);
create index if not exists messages_recipient_cursor on public.direct_messages(recipient_id,created_at desc,id desc);
create index if not exists messages_sender_cursor on public.direct_messages(sender_id,created_at desc,id desc);
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon;
revoke update on public.direct_messages from authenticated;
grant select, insert, delete on public.direct_messages to authenticated;
drop policy if exists messages_participants_read on public.direct_messages;
create policy messages_participants_read on public.direct_messages for select to authenticated
using ((select auth.uid()) in (sender_id,recipient_id));
drop policy if exists messages_sender_insert on public.direct_messages;
create policy messages_sender_insert on public.direct_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and recipient_id <> sender_id);
drop policy if exists messages_sender_delete on public.direct_messages;
create policy messages_sender_delete on public.direct_messages for delete to authenticated
using (sender_id = (select auth.uid()));
-- Guards prevent older permissive policies from exposing conversations.
drop policy if exists messages_private_guard on public.direct_messages;
create policy messages_private_guard on public.direct_messages as restrictive for all to authenticated
using ((select auth.uid()) in (sender_id,recipient_id))
with check (sender_id = (select auth.uid()) and recipient_id <> sender_id);
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
commit;
