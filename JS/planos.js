const PLANOS = {
  familia: [
    {
      id: "gratuito-familia",
      nome: "Gratuito",
      preco: "0,00",
      limite: 15,
      destaque: false,
      descricao: "Para conhecer o atendimento.",
      recursos: ["15 perguntas por mês", "Biblioteca de temas", "Histórico de conversas"],
    },
    {
      id: "essencial",
      nome: "Essencial",
      preco: "24,90",
      limite: 80,
      destaque: true,
      descricao: "Para o acompanhamento do dia a dia.",
      recursos: ["80 perguntas por mês", "Biblioteca completa", "Histórico de conversas", "Solicitação de consulta"],
    },
    {
      id: "familia-plano",
      nome: "Família",
      preco: "49,90",
      limite: 300,
      destaque: false,
      descricao: "Para quem quer mais apoio no mês.",
      recursos: ["300 perguntas por mês", "Biblioteca completa", "Histórico de conversas", "Solicitação de consulta"],
    },
  ],
  professor: [
    {
      id: "gratuito-professor",
      nome: "Gratuito",
      preco: "0,00",
      limite: 15,
      destaque: false,
      descricao: "Para testar o atendimento em sala.",
      recursos: ["15 perguntas por mês", "Biblioteca de temas", "Histórico de conversas"],
    },
    {
      id: "professor",
      nome: "Professor",
      preco: "49,90",
      limite: 300,
      destaque: true,
      descricao: "Para planejar aulas e lidar com a turma.",
      recursos: ["300 perguntas por mês", "Biblioteca completa", "Histórico de conversas", "Solicitação de consulta"],
    },
    {
      id: "escola-clinica",
      nome: "Escola e clínica",
      preco: "129,90",
      limite: 1000,
      destaque: false,
      descricao: "Para equipes e instituições.",
      recursos: ["1.000 perguntas por mês", "Biblioteca completa", "Solicitação de consulta", "Suporte prioritário"],
    },
  ],
};

const grade = document.getElementById("grade");
const abas = document.querySelectorAll(".aba");
const trocar = new URLSearchParams(window.location.search).has("trocar");
let perfilAtual = localStorage.getItem("kn_perfil_escolhido") || "familia";
let escolhendo = false;

function marcarAba() {
  abas.forEach((aba) => {
    const ativa = aba.dataset.perfil === perfilAtual;
    aba.classList.toggle("on", ativa);
    aba.setAttribute("aria-selected", String(ativa));
  });
}

function renderizarPlanos() {
  grade.innerHTML = PLANOS[perfilAtual]
    .map(
      (p) => `
        <article class="plano${p.destaque ? " destaque" : ""}">
          ${p.destaque ? '<span class="selo">Mais escolhido</span>' : ""}
          <h2>${p.nome}</h2>
          <p class="desc">${p.descricao}</p>
          <p class="preco">R$ <strong>${p.preco}</strong><span>/mês</span></p>
          <ul>${p.recursos.map((r) => `<li>${r}</li>`).join("")}</ul>
          <button class="btn-escolher" type="button" data-id="${p.id}">Escolher ${p.nome}</button>
        </article>`
    )
    .join("");
}

abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    perfilAtual = aba.dataset.perfil;
    localStorage.setItem("kn_perfil_escolhido", perfilAtual);
    marcarAba();
    renderizarPlanos();
  });
});

grade.addEventListener("click", async (evento) => {
  const botao = evento.target.closest(".btn-escolher");
  if (!botao || escolhendo) return;

  const plano = PLANOS[perfilAtual].find((p) => p.id === botao.dataset.id);
  escolhendo = true;
  botao.disabled = true;
  botao.textContent = "Aguarde...";

  // Cancela pedidos pendentes anteriores e cria um novo
  await sb.from("assinaturas").update({ status: "cancelada" }).eq("status", "pendente");

  const gratuito = plano.preco === "0,00";
  const agora = new Date();
  const expira = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await sb.from("assinaturas").insert({
    plano: plano.id,
    nome_plano: plano.nome,
    perfil: perfilAtual,
    preco: Number(plano.preco.replace(",", ".")),
    limite: plano.limite,
    ...(gratuito ? { status: "ativa", ativada_em: agora.toISOString(), expira_em: expira.toISOString() } : {}),
  });

  if (error) {
    console.error(error);
    alert("Não foi possível registrar o plano. Tente novamente.");
    escolhendo = false;
    botao.disabled = false;
    botao.textContent = `Escolher ${plano.nome}`;
    return;
  }

  window.location.href = gratuito ? "ia.html" : "pagamento.html";
});

document.getElementById("sair").addEventListener("click", async () => {
  await sb.auth.signOut();
  localStorage.removeItem("kn_plano");
  window.location.href = "index.html";
});

async function iniciar() {
  const { data: sessao } = await sb.auth.getSession();
  if (!sessao.session) {
    window.location.href = "index_1.html";
    return;
  }

  if (!trocar) {
    const { data: pendente } = await sb
      .from("assinaturas").select("id").eq("status", "pendente").limit(1).maybeSingle();
    if (pendente) {
      window.location.href = "pagamento.html";
      return;
    }

    const { data: ativa } = await sb
      .from("assinaturas").select("id").eq("status", "ativa")
      .gt("expira_em", new Date().toISOString()).limit(1).maybeSingle();
    if (ativa) {
      window.location.href = "ia.html";
      return;
    }
  }

  marcarAba();
  renderizarPlanos();
}

iniciar();
