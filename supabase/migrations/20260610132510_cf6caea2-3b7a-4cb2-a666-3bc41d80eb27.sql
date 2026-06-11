-- Extensions
create extension if not exists vector;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Table: hub_chunks
create table if not exists public.hub_chunks (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  source_id text not null,
  source_path text,
  title text,
  chunk_idx int not null default 0,
  content text not null,
  embedding vector(1536) not null,
  source_sha text,
  updated_at timestamptz not null default now(),
  unique (kind, source_id, chunk_idx)
);

grant select, insert, update, delete on public.hub_chunks to authenticated;
grant select, insert, update, delete on public.hub_chunks to anon;
grant all on public.hub_chunks to service_role;

alter table public.hub_chunks enable row level security;

drop policy if exists "hub_chunks open all" on public.hub_chunks;
create policy "hub_chunks open all"
on public.hub_chunks for all
using (true) with check (true);

-- Indexes
create index if not exists hub_chunks_embedding_idx
  on public.hub_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists hub_chunks_kind_source_idx
  on public.hub_chunks (kind, source_id);

-- Search function
create or replace function public.match_hub_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  kinds text[] default null
)
returns table (
  id uuid,
  kind text,
  source_id text,
  source_path text,
  title text,
  chunk_idx int,
  content text,
  similarity float
)
language sql stable
set search_path = public
as $$
  select c.id, c.kind, c.source_id, c.source_path, c.title, c.chunk_idx, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.hub_chunks c
  where (kinds is null or c.kind = any(kinds))
  order by c.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

grant execute on function public.match_hub_chunks(vector, int, text[]) to anon, authenticated, service_role;

-- Glossary view
create or replace view public.hub_glossary as
select
  'idea'::text as kind,
  (select count(*)::int from public.ideas) as n,
  (select array_agg(t.title order by t.created_at desc)
     from (select title, created_at from public.ideas order by created_at desc limit 15) t) as recent
union all
select 'win'::text,
  (select count(*)::int from public.wins),
  (select array_agg(t.title order by t.created_at desc)
     from (select title, created_at from public.wins order by created_at desc limit 15) t)
union all
select 'changelog'::text,
  (select count(*)::int from public.changelog),
  (select array_agg(t.title order by t.entry_date desc)
     from (select title, entry_date from public.changelog order by entry_date desc limit 15) t)
union all
select 'vault'::text,
  (select count(distinct source_id)::int from public.hub_chunks where kind='vault'),
  (select array_agg(distinct source_path) from public.hub_chunks where kind='vault');

grant select on public.hub_glossary to anon, authenticated, service_role;