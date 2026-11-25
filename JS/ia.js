const BIBLIOTECA = [
  { tema: "Rotina", pergunta: "Como organizar a rotina de estudos?" },
  { tema: "Aprendizagem e leitura", pergunta: "Como ajudar na leitura e na escrita?" },
  { tema: "Atenção e organização", pergunta: "Meu filho se distrai muito, o que fazer?" },
  { tema: "Emoções", pergunta: "Como ajudar com emoções e frustrações?" },
  { tema: "Convivência", pergunta: "Como melhorar a convivência com os colegas?" },
  { tema: "Quando buscar ajuda", pergunta: "Quando buscar ajuda profissional?" },
];

const NOMES_PERFIL = {
  familia: "Pais e responsáveis",
  professor: "Professores e educadores",
};

const NOMES_FAIXA = {
  "4-6": "4 a 6 anos",
  "7-9": "7 a 9 anos",
  "10-12": "10 a 12 anos",
};

const WHATSAPP_KATIA = "5511979578069";

const $ = (id) => document.getElementById(id);
const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

let usuario = null;
let plano = null;
let usadas = 0;
let conversas = [];
let conversaAtual = null;
let enviando = false;

const chaveConversas = () => `kn_conversas_${usuario.id}`;

function carregarConversas() {
  try {
    return JSON.parse(localStorage.getItem(chaveConversas()) || "[]");
  } catch {
    return [];
  }
}

function salvarConversas() {
  localStorage.setItem(chaveConversas(), JSON.stringify(conversas));
}

function rolarConversa() {
  const area = $("conteudo");
  area.scrollTop = area.scrollHeight;
}

function atualizarTopo() {
  $("topPerfil").textContent = `${NOMES_PERFIL[plano.perfil]} · ${NOMES_FAIXA[$("faixa").value]}`;
}

function atualizarUso() {
  $("usoTexto").textContent = `${usadas} de ${plano.limite} perguntas neste mês`;
  $("barraUso").style.width = Math.min(100, (usadas / plano.limite) * 100) + "%";
}

function mostrarAviso(texto) {
  const aviso = $("avisoLimite");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = setTimeout(() => (aviso.hidden = true), 6000);
}

function atualizarOverlay() {
  const aberto = !$("modalConsulta").hidden || $("sidebar").classList.contains("aberta");
  $("overlay").hidden = !aberto;
}

function abrirSidebar() {
  $("sidebar").classList.add("aberta");
  atualizarOverlay();
}

function fecharSidebar() {
  $("sidebar").classList.remove("aberta");
  atualizarOverlay();
}

function abrirConsulta() {
  fecharSidebar();
  $("modalConsulta").hidden = false;
  $("consultaStatus").textContent = "";
  atualizarOverlay();
  $("nomeResp").focus();
}

function fecharConsulta() {
  $("modalConsulta").hidden = true;
  atualizarOverlay();
}

function renderBiblioteca() {
  const termo = normalizar($("busca").value);
  const lista = $("biblioteca");
  lista.replaceChildren();

  BIBLIOTECA.filter((item) => normalizar(item.tema + " " + item.pergunta).includes(termo)).forEach((item) => {
    const li = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "side-item";
    botao.dataset.pergunta = item.pergunta;
    botao.textContent = item.tema;
    li.append(botao);
    lista.append(li);
  });
}

function renderHistorico() {
  const termo = normalizar($("busca").value);
  const lista = $("historico");
  lista.replaceChildren();

  const itens = conversas
    .filter((c) => normalizar(c.titulo).includes(termo))
    .sort((a, b) => b.criada.localeCompare(a.criada));

  if (!itens.length) {
    const vazio = document.createElement("li");
    vazio.className = "side-vazio";
    vazio.textContent = termo ? "Nenhuma conversa encontrada." : "Suas conversas aparecem aqui.";
    lista.append(vazio);
    return;
  }

  itens.forEach((c) => {
    const li = document.createElement("li");
    li.className = "item-historico" + (conversaAtual && conversaAtual.id === c.id ? " ativo" : "");

    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "side-item";
    abrir.dataset.id = c.id;
    abrir.textContent = c.titulo;

    const apagar = document.createElement("button");
    apagar.type = "button";
    apagar.className = "apagar";
    apagar.dataset.apagar = c.id;
    apagar.setAttribute("aria-label", "Apagar conversa");
    apagar.textContent = "×";

    li.append(abrir, apagar);
    lista.append(li);
  });
}

function criarClarificacao(m) {
  const bloco = document.createElement("form");
  bloco.className = "clarificacao";
  const grupos = m.clarificacao.perguntas;

  grupos.forEach((p, i) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "grupo-clarificacao";

    const legenda = document.createElement("legend");
    legenda.textContent = p.pergunta;
    fieldset.append(legenda);

    p.opcoes.forEach((opcao) => {
      const rotulo = document.createElement("label");
      rotulo.className = "opcao";
      const campo = document.createElement("input");
      campo.type = p.multipla ? "checkbox" : "radio";
      campo.name = `g${i}`;
      campo.value = opcao;
      campo.disabled = m.respondida;
      rotulo.append(campo, document.createTextNode(" " + opcao));
      fieldset.append(rotulo);
    });

    bloco.append(fieldset);
  });

  const botao = document.createElement("button");
  botao.type = "submit";
  botao.className = "btn-primary btn-sm";
  botao.textContent = "Enviar respostas";
  botao.disabled = m.respondida;

  const status = document.createElement("p");
  status.className = "clar-status";

  bloco.append(botao, status);

  bloco.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (m.respondida) return;

    const respostas = grupos.map((p, i) => ({
      pergunta: p.pergunta,
      escolhas: [...bloco.querySelectorAll(`input[name="g${i}"]:checked`)].map((c) => c.value),
    }));

    if (respostas.some((r) => !r.escolhas.length)) {
      status.textContent = "Escolha uma opção em cada pergunta.";
      return;
    }

    m.respondida = true;
    salvarConversas();
    bloco.querySelectorAll("input, button").forEach((el) => (el.disabled = true));

    const detalhes = respostas.map((r) => `${r.pergunta} ${r.escolhas.join(", ")}`).join("; ");
    const resumo = respostas.map((r) => r.escolhas.join(", ")).join(" · ");
    enviar(`${m.perguntaOriginal}\nRespostas: ${detalhes}`, { esclarecido: true, resumo });
  });

  return bloco;
}

function criarMensagem(m) {
  const linha = document.createElement("div");
  linha.className = `linha ${m.tipo}`;

  if (m.tipo === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar-kn";
    avatar.innerHTML = '<img src="icone-katia.png" alt="">';
    linha.append(avatar);
  }

  const corpo = document.createElement("div");
  corpo.className = "corpo";

  const bolha = document.createElement("div");
  bolha.className = `bolha ${m.tipo}${m.erro ? " erro" : ""}`;
  bolha.textContent = m.texto || "";
  if (m.texto) corpo.append(bolha);

  if (m.clarificacao) corpo.append(criarClarificacao(m));

  if (m.consulta) {
    const card = document.createElement("div");
    card.className = "card-consulta";
    card.innerHTML =
      '<p>Este assunto pede avaliação individual. Quer marcar uma consulta com a Kátia?</p>' +
      '<button class="btn-primary" type="button" data-acao="consulta">Marcar consulta</button>';
    corpo.append(card);
  }

  linha.append(corpo);
  return linha;
}

function renderMensagens() {
  const lista = $("mensagens");
  lista.replaceChildren();

  const msgs = conversaAtual ? conversaAtual.mensagens : [];
  $("vazio").hidden = msgs.length > 0;
  msgs.forEach((m) => lista.append(criarMensagem(m)));
  rolarConversa();
}

function adicionarMensagem(m, conversa = conversaAtual) {
  conversa.mensagens.push(m);
  salvarConversas();

  if (conversaAtual && conversa.id === conversaAtual.id) {
    $("vazio").hidden = true;
    $("mensagens").append(criarMensagem(m));
    rolarConversa();
  }
}

function criarConversa(primeiraPergunta) {
  const conversa = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    titulo: primeiraPergunta.slice(0, 60),
    criada: new Date().toISOString(),
    perfil: plano.perfil,
    faixa: $("faixa").value,
    mensagens: [],
  };

  conversas.push(conversa);
  conversaAtual = conversa;
  salvarConversas();
  renderHistorico();
  return conversa;
}

function novaConversa() {
  conversaAtual = null;
  renderMensagens();
  renderHistorico();
  fecharSidebar();
  $("pergunta").focus();
}

function abrirConversa(id) {
  const conversa = conversas.find((c) => c.id === id);
  if (!conversa) return;

  conversaAtual = conversa;
  $("faixa").value = conversa.faixa;
  atualizarTopo();
  renderMensagens();
  renderHistorico();
  fecharSidebar();
}

function apagarConversa(id) {
  conversas = conversas.filter((c) => c.id !== id);
  salvarConversas();

  if (conversaAtual && conversaAtual.id === id) {
    novaConversa();
  } else {
    renderHistorico();
  }
}

function criarDigitando() {
  const indicador = document.createElement("div");
  indicador.className = "linha bot";
  indicador.setAttribute("aria-label", "A assistente está respondendo");
  indicador.innerHTML = '<div class="avatar-kn"><img src="icone-katia.png" alt=""></div><div class="digitando"><span></span><span></span><span></span></div>';
  return indicador;
}

function bloquearEnvio(estado) {
  $("enviar").disabled = estado;
}

function ajustarAltura() {
  const campo = $("pergunta");
  campo.style.height = "auto";
  campo.style.height = Math.min(campo.scrollHeight, 160) + "px";
}

async function mensagemDeErro(erro) {
  let mensagem = "Não consegui responder agora. Tente novamente em instantes.";
  try {
    const corpo = await erro.context.json();
    if (corpo?.erro) mensagem = corpo.erro;
  } catch {}
  return mensagem;
}

async function enviar(texto, extra = {}) {
  const pergunta = texto.trim();
  if (!pergunta || enviando) return;

  if (usadas >= plano.limite) {
    mostrarAviso("Você usou todas as perguntas do seu plano neste mês. Mude de plano para continuar.");
    return;
  }

  const conversa = conversaAtual || criarConversa(pergunta);
  adicionarMensagem({ tipo: "user", texto: extra.resumo || pergunta }, conversa);

  $("pergunta").value = "";
  ajustarAltura();
  enviando = true;
  bloquearEnvio(true);

  const digitando = criarDigitando();
  $("mensagens").append(digitando);
  rolarConversa();

  try {
    const { data, error } = await sb.functions.invoke("atendimento-ia", {
      body: { pergunta, perfil: plano.perfil, faixa: $("faixa").value, esclarecido: Boolean(extra.esclarecido) },
    });

    digitando.remove();

    if (error) {
      adicionarMensagem({ tipo: "bot", texto: await mensagemDeErro(error), erro: true }, conversa);
      return;
    }

    if (data.clarificacao) {
      adicionarMensagem(
        { tipo: "bot", texto: "", clarificacao: data.clarificacao, perguntaOriginal: pergunta, respondida: false },
        conversa
      );
      return;
    }

    usadas = data.usadas ?? usadas + 1;
    atualizarUso();
    adicionarMensagem({ tipo: "bot", texto: data.resposta, consulta: Boolean(data.sugerirConsulta) }, conversa);
  } catch (erro) {
    console.error(erro);
    digitando.remove();
    adicionarMensagem({ tipo: "bot", texto: "Não consegui responder agora. Tente novamente em instantes.", erro: true }, conversa);
  } finally {
    enviando = false;
    bloquearEnvio(false);
    $("pergunta").focus();
  }
}

function renderChipsVazio() {
  const area = $("chipsVazio");
  BIBLIOTECA.slice(0, 4).forEach((item) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "chip";
    botao.dataset.pergunta = item.pergunta;
    botao.textContent = item.pergunta;
    area.append(botao);
  });
}

function montarMensagemWhatsapp(dados) {
  const linhas = [
    "*Nova solicitação de consulta*",
    "",
    `Nome: ${dados.nome}`,
    `Contato: ${dados.contato}`,
    `Perfil: ${NOMES_PERFIL[plano.perfil]}`,
    `Plano: ${plano.nome}`,
    `Modalidade: ${dados.modalidade === "online" ? "Online" : "Presencial"}`,
    `Período: ${{ manha: "Manhã", tarde: "Tarde", noite: "Noite" }[dados.periodo]}`,
    `Dia de preferência: ${dados.data_preferida ? dados.data_preferida.split("-").reverse().join("/") : "sem preferência"}`,
    "",
    `Motivo: ${dados.motivo}`,
  ];
  return linhas.join("\n");
}

async function enviarConsulta(evento) {
  evento.preventDefault();

  const status = $("consultaStatus");
  const dados = {
    user_id: usuario.id,
    nome: $("nomeResp").value.trim(),
    contato: $("contatoResp").value.trim(),
    modalidade: $("modalidade").value,
    periodo: $("periodo").value,
    data_preferida: $("dataPreferida").value || null,
    motivo: $("motivo").value.trim(),
    perfil: plano.perfil,
  };

  if (!dados.nome || !dados.contato || !dados.motivo) {
    status.textContent = "Preencha nome, contato e o motivo.";
    return;
  }

  // Abre a janela do WhatsApp já aqui, para o navegador não bloquear o pop-up
  const janela = window.open("", "_blank");
  const botao = $("enviarConsulta");
  botao.disabled = true;
  botao.textContent = "Enviando...";

  const { error } = await sb.from("consultas").insert(dados);
  if (error) console.error(error);

  const url = `https://wa.me/${WHATSAPP_KATIA}?text=${encodeURIComponent(montarMensagemWhatsapp(dados))}`;
  if (janela) {
    janela.location.href = url;
  } else {
    window.location.href = url;
  }

  botao.disabled = false;
  botao.textContent = "Enviar pelo WhatsApp";
  $("formConsulta").reset();
  status.textContent = "Abrimos o WhatsApp da Kátia com os seus dados. Confirme o envio por lá.";
}

async function carregarPlano() {
  const { data: sessao } = await sb.auth.getSession();
  if (!sessao.session) {
    window.location.href = "index_1.html";
    return false;
  }
  usuario = sessao.session.user;

  const { data: ativa } = await sb
    .from("assinaturas")
    .select("nome_plano, perfil, limite")
    .eq("status", "ativa")
    .gt("expira_em", new Date().toISOString())
    .order("ativada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ativa) {
    const { data: pendente } = await sb
      .from("assinaturas").select("id").eq("status", "pendente").limit(1).maybeSingle();
    window.location.href = pendente ? "pagamento.html" : "planos.html";
    return false;
  }

  plano = { nome: ativa.nome_plano, perfil: ativa.perfil, limite: ativa.limite };
  return true;
}

async function contarUso() {
  const inicioMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { count } = await sb
    .from("usos")
    .select("id", { count: "exact", head: true })
    .gte("criado_em", inicioMes);
  return count ?? 0;
}

async function iniciar() {
  if (!(await carregarPlano())) return;

  conversas = carregarConversas();
  usadas = await contarUso();

  $("contaEmail").textContent = usuario.email;
  $("planoNome").textContent = plano.nome;
  $("dataPreferida").min = new Date().toISOString().slice(0, 10);

  renderChipsVazio();
  atualizarTopo();
  atualizarUso();
  renderBiblioteca();
  renderHistorico();
  renderMensagens();
}

// Eventos
$("busca").addEventListener("input", () => {
  renderBiblioteca();
  renderHistorico();
});

$("novaConversa").addEventListener("click", novaConversa);
$("abrirSidebar").addEventListener("click", abrirSidebar);
$("fecharSidebar").addEventListener("click", fecharSidebar);
$("abrirConsulta").addEventListener("click", abrirConsulta);
$("fecharConsulta").addEventListener("click", fecharConsulta);
$("overlay").addEventListener("click", () => {
  fecharSidebar();
  fecharConsulta();
});

$("historico").addEventListener("click", (evento) => {
  const apagar = evento.target.closest("[data-apagar]");
  if (apagar) {
    apagarConversa(apagar.dataset.apagar);
    return;
  }

  const abrir = evento.target.closest("[data-id]");
  if (abrir) abrirConversa(abrir.dataset.id);
});

document.addEventListener("click", (evento) => {
  const pergunta = evento.target.closest("[data-pergunta]");
  if (pergunta) {
    fecharSidebar();
    enviar(pergunta.dataset.pergunta);
    return;
  }

  if (evento.target.closest("[data-acao='consulta']")) {
    abrirConsulta();
  }
});

$("form").addEventListener("submit", (evento) => {
  evento.preventDefault();
  enviar($("pergunta").value);
});

$("pergunta").addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" && !evento.shiftKey) {
    evento.preventDefault();
    $("form").requestSubmit();
  }
});

$("pergunta").addEventListener("input", ajustarAltura);
$("faixa").addEventListener("change", atualizarTopo);

$("formConsulta").addEventListener("submit", enviarConsulta);

$("sair").addEventListener("click", async () => {
  await sb.auth.signOut();
  localStorage.removeItem("kn_plano");
  window.location.href = "index.html";
});

iniciar();
