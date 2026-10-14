-- Ejecutar en SQL Editor del proyecto configurado en .env.
-- Modelo: contenido social visible a usuarios autenticados;
-- guardados y notificaciones visibles solamente a su propietario.
-- No borra datos ni políticas ajenas. Las restricciones existentes siguen aplicando.
begin;
do $$
declare old_policy record;
begin
  for old_policy in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('profiles','posts','post_likes','saved_posts','comments','stories','follows','notifications') loop
    execute format('drop policy %I on public.%I', old_policy.policyname, old_policy.tablename);
  end loop;
end $$;
revoke all on public.profiles, public.posts, public.post_likes, public.saved_posts, public.comments, public.stories, public.follows, public.notifications from anon;

do $$
declare
  entry record;
  own_condition text;
  read_condition text;
begin
  for entry in
    select * from (values
      ('profiles', 'id', false, true),
      ('posts', 'user_id', false, true),
      ('post_likes', 'user_id', false, false),
      ('saved_posts', 'user_id', true, false),
      ('comments', 'user_id', false, true),
      ('stories', 'user_id', false, true),
      ('follows', 'follower_id', false, false)
    ) as config(table_name, owner_column, private_read, allow_update)
  loop
    own_condition := format('(select auth.uid()) = %I', entry.owner_column);
    read_condition := case when entry.private_read then own_condition else 'true' end;
    execute format('alter table public.%I enable row level security', entry.table_name);
    execute format('grant select, insert, delete on public.%I to authenticated', entry.table_name);
    if entry.allow_update then
      execute format('grant update on public.%I to authenticated', entry.table_name);
    end if;

    execute format('drop policy if exists lifegram_read on public.%I', entry.table_name);
    execute format('create policy lifegram_read on public.%I for select to authenticated using (%s)', entry.table_name, read_condition);
    execute format('drop policy if exists lifegram_insert on public.%I', entry.table_name);
    execute format('create policy lifegram_insert on public.%I for insert to authenticated with check (%s)', entry.table_name, own_condition);
    execute format('drop policy if exists lifegram_delete on public.%I', entry.table_name);
    execute format('create policy lifegram_delete on public.%I for delete to authenticated using (%s)', entry.table_name, own_condition);
    if entry.allow_update then
      execute format('drop policy if exists lifegram_update on public.%I', entry.table_name);
      execute format('create policy lifegram_update on public.%I for update to authenticated using (%s) with check (%s)', entry.table_name, own_condition, own_condition);
    end if;
  end loop;
end $$;

alter table public.notifications enable row level security;
grant select, insert on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
drop policy if exists lifegram_read on public.notifications;
create policy lifegram_read on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));
drop policy if exists lifegram_update on public.notifications;
create policy lifegram_update on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));
drop policy if exists lifegram_insert on public.notifications;
create policy lifegram_insert on public.notifications for insert to authenticated
with check (
  actor_id = (select auth.uid()) and recipient_id <> actor_id and (
    (type = 'like' and exists (
      select 1 from public.posts p join public.post_likes l on l.post_id = p.id
      where p.id = notifications.post_id and p.user_id = notifications.recipient_id
        and l.user_id = (select auth.uid())
    )) or
    (type = 'comment' and exists (
      select 1 from public.posts p join public.comments c on c.post_id = p.id
      where p.id = notifications.post_id and p.user_id = notifications.recipient_id
        and c.id = notifications.comment_id and c.user_id = (select auth.uid())
    )) or
    (type = 'follow' and exists (
      select 1 from public.follows f where f.follower_id = (select auth.uid())
        and f.following_id = notifications.recipient_id
    ))
  )
);

-- Storage: el bucket debe existir; solo permite subir y borrar archivos propios.
drop policy if exists lifegram_images_insert on storage.objects;
create policy lifegram_images_insert on storage.objects for insert to authenticated
with check (bucket_id = 'images' and owner_id = (select auth.uid())::text);
drop policy if exists lifegram_images_read on storage.objects;
create policy lifegram_images_read on storage.objects for select to authenticated
using (bucket_id = 'images' and owner_id = (select auth.uid())::text);
drop policy if exists lifegram_images_delete on storage.objects;
create policy lifegram_images_delete on storage.objects for delete to authenticated
using (bucket_id = 'images' and owner_id = (select auth.uid())::text);
commit;

-- Resultado para revisar también políticas antiguas más amplias o restrictivas.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in (
  'profiles','posts','post_likes','saved_posts','comments','stories','follows','notifications'
)) or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
