-- Restrictive guards also constrain pre-existing permissive bucket policies.
begin;
drop policy if exists lifegram_images_owner_insert_guard on storage.objects;
create policy lifegram_images_owner_insert_guard on storage.objects as restrictive
for insert to authenticated
with check (bucket_id <> 'images' or owner_id = (select auth.uid())::text);
drop policy if exists lifegram_images_owner_delete_guard on storage.objects;
create policy lifegram_images_owner_delete_guard on storage.objects as restrictive
for delete to authenticated
using (bucket_id <> 'images' or owner_id = (select auth.uid())::text);
drop policy if exists lifegram_images_owner_update_guard on storage.objects;
create policy lifegram_images_owner_update_guard on storage.objects as restrictive
for update to authenticated
using (bucket_id <> 'images' or owner_id = (select auth.uid())::text)
with check (bucket_id <> 'images' or owner_id = (select auth.uid())::text);
drop policy if exists lifegram_images_owner_select_guard on storage.objects;
create policy lifegram_images_owner_select_guard on storage.objects as restrictive
for select to authenticated
using (bucket_id <> 'images' or owner_id = (select auth.uid())::text);
-- Public image serving still uses the public bucket endpoint.
drop policy if exists lifegram_images_no_anon_guard on storage.objects;
create policy lifegram_images_no_anon_guard on storage.objects as restrictive
for all to anon using (bucket_id <> 'images') with check (bucket_id <> 'images');
commit;
