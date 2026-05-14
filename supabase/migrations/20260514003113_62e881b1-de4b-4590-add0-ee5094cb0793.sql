-- Enums
create type public.app_role as enum ('admin', 'user');
create type public.payment_status as enum ('pending', 'approved', 'rejected');
create type public.credit_package as enum ('starter', 'basic', 'pro', 'unlimited');

-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = user_id);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can view all roles"
  on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles"
  on public.user_roles for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Credits
create table public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  unlimited_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_credits enable row level security;

create policy "Users can view their own credits"
  on public.user_credits for select using (auth.uid() = user_id);
create policy "Admins can view all credits"
  on public.user_credits for select using (public.has_role(auth.uid(), 'admin'));
create policy "Users can update their own credits"
  on public.user_credits for update using (auth.uid() = user_id);
create policy "Admins can update all credits"
  on public.user_credits for update using (public.has_role(auth.uid(), 'admin'));

-- Payment requests
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package credit_package not null,
  credits_amount integer not null,
  price_egp integer not null,
  proof_path text,
  reference_number text,
  status payment_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.payment_requests enable row level security;

create policy "Users view their own payment requests"
  on public.payment_requests for select using (auth.uid() = user_id);
create policy "Users create their own payment requests"
  on public.payment_requests for insert with check (auth.uid() = user_id);
create policy "Admins view all payment requests"
  on public.payment_requests for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update payment requests"
  on public.payment_requests for update using (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger fn
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_user_credits_updated before update on public.user_credits
  for each row execute function public.update_updated_at_column();

-- New user setup: profile + 20 free credits + admin grant for known email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_credits (user_id, credits) values (new.id, 20);

  if new.email = 'yb109324@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Approve payment: grant credits / extend unlimited
create or replace function public.approve_payment_request(_request_id uuid, _notes text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  r public.payment_requests%rowtype;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  select * into r from public.payment_requests where id = _request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Already reviewed'; end if;

  if r.package = 'unlimited' then
    insert into public.user_credits (user_id, credits, unlimited_until)
    values (r.user_id, 0, now() + interval '30 days')
    on conflict (user_id) do update
      set unlimited_until = greatest(coalesce(public.user_credits.unlimited_until, now()), now()) + interval '30 days',
          updated_at = now();
  else
    insert into public.user_credits (user_id, credits)
    values (r.user_id, r.credits_amount)
    on conflict (user_id) do update
      set credits = public.user_credits.credits + r.credits_amount,
          updated_at = now();
  end if;

  update public.payment_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = _notes
  where id = _request_id;
end;
$$;

create or replace function public.reject_payment_request(_request_id uuid, _notes text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;
  update public.payment_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = _notes
  where id = _request_id and status = 'pending';
end;
$$;

-- Storage bucket for payment proofs (private)
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
  on conflict (id) do nothing;

create policy "Users upload own payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users view own payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Admins view all payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(), 'admin'));