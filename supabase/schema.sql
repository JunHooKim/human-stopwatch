-- ==========================================================
-- 인간 스톱워치 (Human Stopwatch) - Supabase 스키마 (리그 버전)
-- Supabase Dashboard > SQL Editor 에서 전체 실행하세요.
-- 이미 이전 버전 스키마를 실행한 적이 있어도 그대로 다시 실행하면
-- 안전하게 리그 기능이 추가됩니다 (기존 데이터는 유지됩니다).
-- ==========================================================

-- 1) 확장 기능
create extension if not exists "pgcrypto";

-- 2) 리그 테이블 (3초 / 5초 / 10초 리그, 목표 시간은 관리자가 수정 가능)
create table if not exists public.leagues (
  key text primary key,
  label text not null,
  target_time numeric(10,3) not null,
  sort_order smallint not null default 0
);

insert into public.leagues (key, label, target_time, sort_order) values
  ('3s', '3초 리그', 3, 1),
  ('5s', '5초 리그', 5, 2),
  ('10s', '10초 리그', 10, 3)
on conflict (key) do nothing;

-- 3) 랭킹 테이블
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 12),
  league_key text not null default '5s' references public.leagues(key),
  target_time numeric(10,3) not null,
  measured_time numeric(10,3) not null,
  difference numeric(10,3) not null,
  created_at timestamptz not null default now()
);

-- 기존 버전에서 업그레이드하는 경우를 위한 컬럼 추가 (이미 있으면 무시됨)
alter table public.scores add column if not exists league_key text not null default '5s';
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'scores_league_key_fkey'
  ) then
    alter table public.scores
      add constraint scores_league_key_fkey foreign key (league_key) references public.leagues(key);
  end if;
end $$;

create index if not exists scores_rank_idx
  on public.scores (league_key, difference asc, created_at asc);

-- 4) RLS 활성화
alter table public.leagues enable row level security;
alter table public.scores enable row level security;

-- 리그는 누구나 조회 가능, 수정은 관리자만 (목표 시간 변경)
drop policy if exists "leagues_select_all" on public.leagues;
create policy "leagues_select_all"
  on public.leagues for select
  using (true);

drop policy if exists "leagues_update_admin" on public.leagues;
create policy "leagues_update_admin"
  on public.leagues for update
  using (auth.role() = 'authenticated');

-- 누구나 랭킹을 볼 수 있음
drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  using (true);

-- 누구나 자신의 기록을 등록할 수 있음 (게임 참가자)
drop policy if exists "scores_insert_public" on public.scores;
create policy "scores_insert_public"
  on public.scores for insert
  with check (true);

-- 수정/삭제는 로그인한 관리자만 가능
drop policy if exists "scores_update_admin" on public.scores;
create policy "scores_update_admin"
  on public.scores for update
  using (auth.role() = 'authenticated');

drop policy if exists "scores_delete_admin" on public.scores;
create policy "scores_delete_admin"
  on public.scores for delete
  using (auth.role() = 'authenticated');

-- 5) Realtime 활성화
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'scores'
  ) then
    alter publication supabase_realtime add table public.scores;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'leagues'
  ) then
    alter publication supabase_realtime add table public.leagues;
  end if;
end $$;

-- ==========================================================
-- 참고: 이전 버전의 app_settings 테이블은 더 이상 사용하지 않습니다.
-- 남아있어도 동작에는 영향이 없으니 그대로 두거나 아래 줄의 주석을
-- 해제해 삭제해도 됩니다.
-- drop table if exists public.app_settings;
-- ==========================================================

-- ==========================================================
-- 관리자 계정 생성 안내
-- Supabase Dashboard > Authentication > Users > Add User 에서
-- 이메일/비밀번호로 관리자 계정을 1개 생성하세요.
-- 생성한 이메일을 js/config.js 의 ADMIN_EMAIL 에 넣으면
-- 관리자 화면에서 "비밀번호"만 입력해 로그인할 수 있습니다.
-- ==========================================================
