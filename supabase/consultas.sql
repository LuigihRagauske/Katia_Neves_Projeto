-- Solicitações de consulta. Rode no SQL Editor do Supabase.

create table public.consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  contato text not null,
  modalidade text check (modalidade in ('online', 'presencial')),
  periodo text check (periodo in ('manha', 'tarde', 'noite')),
  data_preferida date,
  motivo text not null,
  perfil text check (perfil in ('familia', 'professor')),
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

alter table public.consultas enable row level security;

create policy "Criar a própria solicitação"
  on public.consultas for insert
  with check (auth.uid() = user_id);

create policy "Ver as próprias solicitações"
  on public.consultas for select
  using (auth.uid() = user_id);

grant select, insert on public.consultas to authenticated;
