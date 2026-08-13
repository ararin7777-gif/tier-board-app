-- Tier表アプリ DBスキーマ + RLS(行レベルセキュリティ)定義
-- Supabase Studio(Web管理画面)の SQL Editor に貼り付けて実行する

-- =========================================
-- 1) テーブル定義
-- =========================================

-- Tier表本体
create table if not exists tier_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '無題のTier表',
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tier(段)
create table if not exists tiers (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references tier_boards(id) on delete cascade,
  label text not null,
  color text not null,
  position integer not null
);

-- アイテム
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references tier_boards(id) on delete cascade,
  tier_id uuid references tiers(id) on delete set null,
  name text not null default '',
  image_url text,
  position integer not null,
  created_at timestamptz not null default now()
);

create index if not exists tiers_board_position_idx on tiers (board_id, position);
create index if not exists items_board_tier_position_idx on items (board_id, tier_id, position);

-- =========================================
-- 2) updated_at 自動更新トリガー
-- =========================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tier_boards_set_updated_at on tier_boards;
create trigger tier_boards_set_updated_at
  before update on tier_boards
  for each row
  execute function set_updated_at();

-- =========================================
-- 3) RLS(行レベルセキュリティ)有効化
-- =========================================

alter table tier_boards enable row level security;
alter table tiers enable row level security;
alter table items enable row level security;

-- --- tier_boards ---
-- 本人は全操作可、is_public=trueのボードは誰でも閲覧のみ可
drop policy if exists "boards_select" on tier_boards;
create policy "boards_select" on tier_boards for select
  using (auth.uid() = user_id or is_public = true);

drop policy if exists "boards_insert" on tier_boards;
create policy "boards_insert" on tier_boards for insert
  with check (auth.uid() = user_id);

drop policy if exists "boards_update" on tier_boards;
create policy "boards_update" on tier_boards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "boards_delete" on tier_boards;
create policy "boards_delete" on tier_boards for delete
  using (auth.uid() = user_id);

-- --- tiers ---
-- 自身にuser_id列がないため、親tier_boardsを参照して同様のルールを適用
drop policy if exists "tiers_select" on tiers;
create policy "tiers_select" on tiers for select
  using (exists (
    select 1 from tier_boards b
    where b.id = tiers.board_id
      and (b.user_id = auth.uid() or b.is_public = true)
  ));

drop policy if exists "tiers_write" on tiers;
create policy "tiers_write" on tiers for all
  using (exists (
    select 1 from tier_boards b
    where b.id = tiers.board_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tier_boards b
    where b.id = tiers.board_id and b.user_id = auth.uid()
  ));

-- --- items ---
drop policy if exists "items_select" on items;
create policy "items_select" on items for select
  using (exists (
    select 1 from tier_boards b
    where b.id = items.board_id
      and (b.user_id = auth.uid() or b.is_public = true)
  ));

drop policy if exists "items_write" on items;
create policy "items_write" on items for all
  using (exists (
    select 1 from tier_boards b
    where b.id = items.board_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tier_boards b
    where b.id = items.board_id and b.user_id = auth.uid()
  ));

-- =========================================
-- 4) Storage(画像保存用バケット)
-- =========================================

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- 読み取りは誰でも可(公開バケット)
drop policy if exists "item_images_public_read" on storage.objects;
create policy "item_images_public_read" on storage.objects for select
  using (bucket_id = 'item-images');

-- 書き込みはパス先頭が自分のuser_idと一致する場合のみ許可
-- (アップロード時のパス規約: {user_id}/{board_id}/{uuid}-{filename})
drop policy if exists "item_images_owner_insert" on storage.objects;
create policy "item_images_owner_insert" on storage.objects for insert
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "item_images_owner_delete" on storage.objects;
create policy "item_images_owner_delete" on storage.objects for delete
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
