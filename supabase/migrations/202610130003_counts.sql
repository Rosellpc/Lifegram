begin;
create or replace function public.post_counts(post_ids uuid[])
returns table(post_id uuid, likes bigint, comments bigint)
language sql stable security invoker set search_path = '' as $$
  select p.id,
    (select count(*) from public.post_likes l where l.post_id = p.id),
    (select count(*) from public.comments c where c.post_id = p.id)
  from public.posts p where p.id = any(post_ids)
$$;
revoke all on function public.post_counts(uuid[]) from public, anon;
grant execute on function public.post_counts(uuid[]) to authenticated;
create or replace function public.ranked_post_ids(page_size integer default 20)
returns table(post_id uuid)
language sql stable security invoker set search_path = '' as $$
  select p.id from public.posts p left join public.post_likes l on l.post_id=p.id
  group by p.id order by count(l.user_id) desc, p.created_at desc, p.id desc
  limit least(greatest(page_size,1),50)
$$;
revoke all on function public.ranked_post_ids(integer) from public, anon;
grant execute on function public.ranked_post_ids(integer) to authenticated;
commit;
