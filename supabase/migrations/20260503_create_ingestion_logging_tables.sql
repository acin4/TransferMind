create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ingestion_step_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  step_name text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  records_inserted integer,
  records_updated integer,
  records_skipped integer,
  records_failed integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ingestion_runs(id) on delete set null,
  step_log_id uuid references public.ingestion_step_logs(id) on delete set null,
  step_name text,
  endpoint text not null,
  params jsonb not null default '{}'::jsonb,
  status_code integer,
  success boolean not null,
  duration_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingestion_runs_status_started_at
  on public.ingestion_runs (status, started_at);

create index if not exists idx_ingestion_step_logs_run_id
  on public.ingestion_step_logs (run_id);

create index if not exists idx_ingestion_step_logs_step_name_started_at
  on public.ingestion_step_logs (step_name, started_at);

create index if not exists idx_api_request_logs_run_id
  on public.api_request_logs (run_id);

create index if not exists idx_api_request_logs_step_log_id
  on public.api_request_logs (step_log_id);

create index if not exists idx_api_request_logs_endpoint_created_at
  on public.api_request_logs (endpoint, created_at);

create index if not exists idx_api_request_logs_success_created_at
  on public.api_request_logs (success, created_at);

alter table public.ingestion_runs enable row level security;
alter table public.ingestion_step_logs enable row level security;
alter table public.api_request_logs enable row level security;

grant all on table public.ingestion_runs to service_role;
grant all on table public.ingestion_step_logs to service_role;
grant all on table public.api_request_logs to service_role;
