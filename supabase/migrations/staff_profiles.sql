-- Staff photos and Google names, read from each person's sign-in record.
--
-- staff.name is an optional custom name (for example with a title added).
-- When it is empty, the app shows the name from the person's Google account,
-- which exists once they have signed in with Google at least once.
--
-- Global administrators see every staff member; anyone else sees only their
-- own row, so the top bar can show their custom name.
-- Remove with: drop function if exists public.staff_profiles();

create or replace function public.staff_profiles()
returns table (email text, name text, google_name text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (lower(s.email))
         s.email,
         nullif(btrim(s.name), '') as name,
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')), '') as google_name,
         nullif(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'), '') as photo_url
  from public.staff s
  left join auth.users u on lower(u.email) = lower(s.email)
  where s.email is not null
    and (public.is_global_admin() or lower(s.email) = public.jwt_email())
  order by lower(s.email), u.last_sign_in_at desc nulls last;
$$;

revoke all on function public.staff_profiles() from public, anon;
grant execute on function public.staff_profiles() to authenticated;
