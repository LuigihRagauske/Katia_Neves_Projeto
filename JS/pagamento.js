// Chave Pix da Kátia: cole aqui quando tiver. Enquanto estiver assim, a tela avisa que a chave não foi cadastrada.
const CHAVE_PIX = "COLE_AQUI_A_CHAVE_PIX";

const $ = (id) => document.getElementById(id);

const NOMES_PERFIL = {
  familia: "Pais e responsáveis",
  professor: "Professores e educadores",
};

async function iniciar() {
  const { data: sessao } = await sb.auth.getSession();
  if (!sessao.session) {
    window.location.href = "index_1.html";
    return;
  }

  const { data: pedido } = await sb
    .from("assinaturas")
    .select("id, nome_plano, perfil, preco, limite")
    .eq("status", "pendente")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pedido) {
    const { data: ativa } = await sb
      .from("assinaturas").select("id").eq("status", "ativa")
      .gt("expira_em", new Date().toISOString()).limit(1).maybeSingle();
    window.location.href = ativa ? "ia.html" : "planos.html";
    return;
  }

  const codigo = pedido.id.slice(0, 8).toUpperCase();
  const preco = Number(pedido.preco);
  const precoTexto = `R$ ${preco.toFixed(2).replace(".", ",")}`;

  $("resNome").textContent = pedido.nome_plano;
  $("resPerfil").textContent = NOMES_PERFIL[pedido.perfil];
  $("resLimite").textContent = `${pedido.limite} perguntas`;
  $("resPreco").textContent = precoTexto;
  $("resPedido").textContent = codigo;

  // Plano gratuito (teste): não há cobrança, então não mostra o bloco Pix
  if (preco === 0) {
    $("blocoPix").hidden = true;
    $("avisoPagamento").textContent = "Plano gratuito para teste. O acesso será liberado pela equipe.";
    return;
  }

  $("chavePix").textContent = CHAVE_PIX.startsWith("COLE_AQUI")
    ? "Chave Pix ainda não cadastrada"
    : CHAVE_PIX;
  $("codigoPix").textContent = codigo;
  $("valorPix").textContent = precoTexto;
  $("copiarPix").disabled = CHAVE_PIX.startsWith("COLE_AQUI");
}

$("copiarPix").addEventListener("click", async () => {
  const botao = $("copiarPix");
  try {
    await navigator.clipboard.writeText(CHAVE_PIX);
  } catch {
    const campo = document.createElement("textarea");
    campo.value = CHAVE_PIX;
    document.body.append(campo);
    campo.select();
    document.execCommand("copy");
    campo.remove();
  }
  botao.textContent = "Chave copiada!";
  setTimeout(() => (botao.textContent = "Copiar chave"), 2000);
});

$("trocarPlano").addEventListener("click", () => {
  window.location.href = "planos.html?trocar=1";
});

$("sair").addEventListener("click", async () => {
  await sb.auth.signOut();
  localStorage.removeItem("kn_plano");
  window.location.href = "index.html";
});

iniciar();
