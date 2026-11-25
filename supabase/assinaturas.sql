-- Assinaturas e controle de uso. Rode no SQL Editor do Supabase.

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plano text not null,
  nome_plano text not null,
  perfil text not null check (perfil in ('familia', 'professor')),
  preco numeric(8, 2) not null,
  limite integer not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'ativa', 'cancelada', 'substituida')),
  ativada_em timestamptz,
  expira_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;

create policy "Ver a própria assinatura"
  on public.assinaturas for select
  using (auth.uid() = user_id);

create policy "Criar pedido pendente"
  on public.assinaturas for insert
  with check (auth.uid() = user_id and status = 'pendente');

create policy "Cancelar o próprio pedido pendente"
  on public.assinaturas for update
  using (auth.uid() = user_id and status = 'pendente')
  with check (status = 'cancelada');

grant select, insert, update on public.assinaturas to authenticated;

create table public.usos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.usos enable row level security;

create policy "Registrar uso próprio"
  on public.usos for insert
  with check (auth.uid() = user_id);

create policy "Ver o próprio uso"
  on public.usos for select
  using (auth.uid() = user_id);

grant select, insert on public.usos to authenticated;

-- ===== Ativar um plano depois que o pagamento for confirmado =====
-- 1) Ache o pedido pendente:
--    select id, user_id, nome_plano, preco from public.assinaturas where status = 'pendente';
-- 2) Substitua o plano antigo e ative o novo (troque ID_DO_PEDIDO e ID_DO_USUARIO):
--
-- update public.assinaturas set status = 'substituida'
--   where user_id = 'ID_DO_USUARIO' and status = 'ativa';
--
-- update public.assinaturas
--   set status = 'ativa', ativada_em = now(), expira_em = now() + interval '30 days'
--   where id = 'ID_DO_PEDIDO';
