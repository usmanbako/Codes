-- ============================================================
-- AirConnect Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null,
  avatar_url text,
  cover_url text,
  airline text,
  position text,
  base_airport char(3),
  bio text,
  employee_id_hash text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  countries_visited integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view all verified profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- CHECK-INS
-- ============================================================
create table public.check_ins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  city text not null,
  country text not null,
  country_code char(2) not null,
  latitude float not null default 0,
  longitude float not null default 0,
  status_text text,
  available_to_meet boolean not null default true,
  duration_hours integer not null default 24,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.check_ins enable row level security;

create policy "Anyone can view active check-ins"
  on public.check_ins for select using (expires_at > now());

create policy "Verified users can insert check-ins"
  on public.check_ins for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.users
      where id = auth.uid() and verification_status = 'verified'
    )
  );

create policy "Users can update own check-ins"
  on public.check_ins for update using (auth.uid() = user_id);

create index check_ins_expires_at_idx on public.check_ins(expires_at);
create index check_ins_city_idx on public.check_ins(city);

-- ============================================================
-- POSTS
-- ============================================================
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  content text,
  city text not null,
  country text not null,
  post_type text not null default 'standard'
    check (post_type in ('standard', 'tip', 'route', 'broadcast')),
  media_urls text[] not null default '{}',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Anyone can view posts" on public.posts for select using (true);

create policy "Verified users can create posts"
  on public.posts for insert with check (
    auth.uid() = user_id and
    exists (select 1 from public.users where id = auth.uid() and verification_status = 'verified')
  );

create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- ============================================================
-- POST COMMENTS
-- ============================================================
create table public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "Anyone can view comments" on public.post_comments for select using (true);
create policy "Verified users can comment"
  on public.post_comments for insert with check (
    auth.uid() = user_id and
    exists (select 1 from public.users where id = auth.uid() and verification_status = 'verified')
  );

-- ============================================================
-- TIPS
-- ============================================================
create table public.tips (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  city text not null,
  country text not null,
  category text not null
    check (category in ('food', 'transport', 'safety', 'activities', 'hotel', 'routes')),
  title text not null,
  body text not null,
  media_urls text[] not null default '{}',
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tips enable row level security;

create policy "Anyone can view tips" on public.tips for select using (true);

create policy "Verified users can submit tips"
  on public.tips for insert with check (
    auth.uid() = user_id and
    exists (select 1 from public.users where id = auth.uid() and verification_status = 'verified')
  );

create policy "Users can update own tips"
  on public.tips for update using (auth.uid() = user_id);

create index tips_city_idx on public.tips(city);
create index tips_category_idx on public.tips(category);

-- ============================================================
-- BADGES
-- ============================================================
create table public.badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  badge_type text not null,
  badge_name text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb
);

alter table public.badges enable row level security;

create policy "Anyone can view badges" on public.badges for select using (true);
create policy "System can insert badges"
  on public.badges for insert with check (auth.uid() = user_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('dm', 'group', 'city_chat')),
  participant_ids uuid[] not null,
  city text,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = any(participant_ids));

create policy "Verified users can create conversations"
  on public.conversations for insert with check (
    auth.uid() = any(participant_ids) and
    exists (select 1 from public.users where id = auth.uid() and verification_status = 'verified')
  );

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_id uuid references public.users on delete cascade not null,
  content text not null,
  message_type text not null default 'text'
    check (message_type in ('text', 'photo', 'location', 'route')),
  media_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

create policy "Participants can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

-- ============================================================
-- STORAGE BUCKETS (run separately or via Supabase dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('posts', 'posts', true);
-- insert into storage.buckets (id, name, public) values ('verifications', 'verifications', false);
