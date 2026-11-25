import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Link de pagamento (Pix ou cartão) cadastrado nos secrets. Sem ele, o botão avisa que ainda não está configurado.
const LINK_PAGAMENTO = Deno.env.get("LINK_PAGAMENTO") ?? "";
const ORIGENS = (Deno.env.get("ORIGENS_PERMITIDAS") ?? "*").split(",").map((o) => o.trim());

function cabecalhos(req: Request): Record<string, string> {
  const origem = req.headers.get("origin") ?? "";
  const permitida = ORIGENS.includes("*") ? "*" : ORIGENS.includes(origem) ? origem : ORIGENS[0];
  return {
    "Access-Control-Allow-Origin": permitida,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

function resposta(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhos(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cabecalhos(req) });
  if (req.method !== "POST") return resposta(req, { erro: "Método não permitido." }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return resposta(req, { erro: "Faça login." }, 401);

  const cliente = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user } } = await cliente.auth.getUser(token);
  if (!user) return resposta(req, { erro: "Faça login." }, 401);

  // Só devolve o link se existir um pedido pendente deste usuário (RLS garante isso)
  const { data: pedido } = await cliente
    .from("assinaturas")
    .select("id, nome_plano, preco")
    .eq("status", "pendente")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pedido) return resposta(req, { erro: "Nenhum pedido pendente. Escolha um plano novamente." }, 404);
  if (!LINK_PAGAMENTO) return resposta(req, { erro: "Pagamento ainda não configurado. Tente mais tarde." }, 503);

  return resposta(req, { link: LINK_PAGAMENTO, pedido: pedido.id.slice(0, 8).toUpperCase() });
});
