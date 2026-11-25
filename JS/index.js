// Menu recolhido no celular
const menuToggle = document.getElementById("menuToggle");
const menu = document.getElementById("menu");

function fecharMenu() {
  menu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
}

menuToggle.addEventListener("click", () => {
  const aberto = menuToggle.getAttribute("aria-expanded") === "true";

  if (aberto) {
    fecharMenu();
  } else {
    menu.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fechar menu");
  }
});

menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", fecharMenu);
});

// Com login: botão "Minha conta" e convite para o atendimento; sem login: convite para entrar
const lockCard = document.getElementById("lockCard");
const ctaCard = document.getElementById("ctaCard");

function atualizarAcesso(sessao) {
  const logado = Boolean(sessao);

  document.getElementById("linkEntrar").hidden = logado;
  document.getElementById("linkCriar").hidden = logado;
  document.getElementById("linkMinhaConta").hidden = !logado;
  lockCard.hidden = logado;
  ctaCard.hidden = !logado;
  document.getElementById("linkConversar").href = logado ? "ia.html" : "index_1.html";
}

sb.auth.getSession().then(({ data }) => atualizarAcesso(data.session));
sb.auth.onAuthStateChange((_evento, sessao) => atualizarAcesso(sessao));

// Cabeçalho com sombra ao rolar
document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");

function atualizarCabecalho() {
  header.classList.toggle("scrolled", window.scrollY > 10);
}

window.addEventListener("scroll", atualizarCabecalho, { passive: true });
atualizarCabecalho();

// Entrada suave dos blocos ao rolar
const alvosReveal = document.querySelectorAll(
  ".hero-text, .hero-photo, .section h2, .section .eyebrow, .about-text, .card-metodo, .lock-card, .endereco-info, .mapa, .contato p"
);

alvosReveal.forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = (i % 4) * 0.1 + "s";
});

const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;

      const el = entrada.target;
      el.classList.add("visivel");

      // Ao terminar a entrada, limpa as classes para não atrapalhar o hover
      el.addEventListener(
        "transitionend",
        () => {
          el.classList.remove("reveal", "visivel");
          el.style.transitionDelay = "";
        },
        { once: true }
      );

      observador.unobserve(el);
    });
  },
  { threshold: 0.15 }
);

alvosReveal.forEach((el) => observador.observe(el));
