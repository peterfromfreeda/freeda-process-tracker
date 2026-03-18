-- v1 schema for freeda-process-tracker
-- Apply this in Supabase SQL editor (or via migrations).

-- Enable uuid generation
create extension if not exists "pgcrypto";

create table if not exists public.macro_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  position int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.micro_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  macro_template_id uuid not null references public.macro_templates(id) on delete cascade,
  title text not null default '',
  minutes int not null default 0,
  position int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint micro_steps_minutes_non_negative check (minutes >= 0)
);

create index if not exists idx_macro_templates_position on public.macro_templates(position);
create index if not exists idx_micro_steps_project_macro_position
  on public.micro_steps(project_id, macro_template_id, position);

-- Keep projects.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_micro_steps_updated_at on public.micro_steps;
create trigger trg_micro_steps_updated_at
before update on public.micro_steps
for each row execute procedure public.set_updated_at();

