-- Plano gratuito de TESTE. Rode no SQL Editor do Supabase.
-- Para remover depois, apague a política: drop policy "Plano gratuito de teste" on public.assinaturas;

create policy "Plano gratuito de teste"
  on public.assinaturas for insert
  with check (
    auth.uid() = user_id
    and preco = 0
    and status = 'ativa'
    and limite <= 15
  );
