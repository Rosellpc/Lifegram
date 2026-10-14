-- Actividad privada y actualizaciones en tiempo real.
begin;
create index if not exists notifications_recipient_cursor
  on public.notifications(recipient_id, created_at desc, id desc);
create index if not exists notifications_recipient_unread
  on public.notifications(recipient_id) where is_read = false;
alter table public.notifications enable row level security;

-- Una política restrictiva también limita políticas permisivas anteriores.
drop policy if exists notifications_read_guard on public.notifications;
create policy notifications_read_guard on public.notifications as restrictive
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists notifications_update_guard on public.notifications;
create policy notifications_update_guard on public.notifications as restrictive
  for update to authenticated using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications
  for update to authenticated using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
revoke all on public.notifications from anon;
revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update(is_read) on public.notifications to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
commit;
