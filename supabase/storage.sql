-- Meal photo storage — run once in Supabase SQL Editor after schema.sql
-- Creates a private bucket and per-user RLS policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  2097152, -- 2 MB max (client compresses well below this)
  array['image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_id}/{uuid}.jpg
drop policy if exists "meal_photos_select_own" on storage.objects;
drop policy if exists "meal_photos_insert_own" on storage.objects;
drop policy if exists "meal_photos_update_own" on storage.objects;
drop policy if exists "meal_photos_delete_own" on storage.objects;

create policy "meal_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "meal_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "meal_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "meal_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'meal-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
