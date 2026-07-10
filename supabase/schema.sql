-- ==========================================================
-- 인간 스톱워치 (Human Stopwatch) - Supabase 스키마
-- Supabase Dashboard > SQL Editor 에서 전체 실행하세요.
-- ==========================================================

-- 1) 확장 기능
create extension if not exists "pgcrypto";

-- 2) 랭킹 테이블
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 12),
  target_time numeric(10,3) not null,
  measured_time numeric(10,3) not null,
  difference numeric(10,3) not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_rank_idx
  on public.scores (difference asc, created_at asc);

-- 3) 설정 테이블 (목표 시간 등 전역 설정, 단일 row 사용)
create table if not exists public.app_settings (
  id smallint primary key default 1,
  target_time numeric(10,3) not null default 10,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.app_settings (id, target_time)
values (1, 10)
on conflict (id) do nothing;

-- 4) RLS 활성화
alter table public.scores enable row level security;
alter table public.app_settings enable row level security;

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

-- 설정은 누구나 조회 가능, 수정은 관리자만
drop policy if exists "settings_select_all" on public.app_settings;
create policy "settings_select_all"
  on public.app_settings for select
  using (true);

drop policy if exists "settings_update_admin" on public.app_settings;
create policy "settings_update_admin"
  on public.app_settings for update
  using (auth.role() = 'authenticated');

-- 5) Realtime 활성화
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.app_settings;

-- ==========================================================
-- 관리자 계정 생성 안내
-- Supabase Dashboard > Authentication > Users > Add User 에서
-- 이메일/비밀번호로 관리자 계정을 1개 생성하세요.
-- 생성한 이메일을 프론트엔드 .env 의 VITE_ADMIN_EMAIL 에 넣으면
-- 관리자 화면에서 "비밀번호"만 입력해 로그인할 수 있습니다.
-- ==========================================================
