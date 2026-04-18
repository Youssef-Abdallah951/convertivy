-- Public bucket for shareable user files
insert into storage.buckets (id, name, public)
values ('shared-files', 'shared-files', true)
on conflict (id) do nothing;

-- Allow anyone to upload to this bucket (anonymous file sharing)
create policy "Anyone can upload to shared-files"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'shared-files');

-- Allow anyone to read from this bucket
create policy "Anyone can read shared-files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'shared-files');