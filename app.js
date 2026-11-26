/* v3: «Живой атлас». Данные остаются в content/site-content.json. */

import { createCatalog } from "./catalog.js";
import { createQuiz } from "./quiz.js";
import { initStory } from "./story.js";
import { initAvatar } from "./avatar.js";
import { initMotion } from "./motion.js";

const DATA_URL = "data/site-content.json";

const dom = {
  stats: document.getElementById("hero-stats"),
  headline: document.getElementById("hero-title"),
  eyebrow: document.querySelector(".hero__eyebrow"),
  actions: document.querySelector(".hero__actions"),
  lede: document.getElementById("hero-lede"),
  legend: document.getElementById("link-legend"),
  warning: document.getElementById("method-warning"),
  thesisTitle: document.getElementById("thesis-title"),
  thesisBody: document.getElementById("thesis-body"),
  thesisCaveat: document.getElementById("thesis-caveat"),
  roadmap: document.getElementById("roadmap"),
  exampleKicker: document.getElementById("example-kicker"),
  exampleTitle: document.getElementById("example-title"),
  exampleFlow: document.getElementById("example-flow"),
  exampleCta: document.getElementById("example-cta"),
  catalogHint: document.getElementById("catalog-hint"),
  quizHeading: document.getElementById("quiz-title"),
  quizIntroText: document.getElementById("quiz-intro-text"),
  methodTitle: document.getElementById("methodology-title"),
  methodSummary: document.getElementById("methodology-summary"),
  methodScope: document.getElementById("method-scope"),
  sourceGrid: document.getElementById("source-grid"),
  bridges: document.getElementById("bridges-list"),
  bridgeNote: document.getElementById("bridge-note"),
  count: document.getElementById("catalog-count"),
  results: document.getElementById("catalog-results"),
  error: document.getElementById("catalog-error"),
  retry: document.getElementById("catalog-retry"),
  quizRoot: document.getElementById("quiz-root"),
  methodology: document.getElementById("methodology-body"),
  glossary: document.getElementById("glossary"),
  sources: document.getElementById("sources-list"),
  menuToggle: document.getElementById("menu-toggle"),
  siteNav: document.getElementById("site-nav"),
};

/* Все пользовательские формулировки приходят из site-content.json. */

let catalog = null;
let quiz = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function validate(data) {
  const fail = (message) => { throw new Error(`Некорректные данные: ${message}`); };
  if (!data || typeof data !== "object") fail("пустой ответ");
  if (!data.intro || typeof data.intro.title !== "string") fail("intro");
  if (typeof data.intro.headline !== "string" || typeof data.intro.lede !== "string") fail("intro.headline/lede");
  if (!data.intro.thesis?.title || !data.intro.thesis?.body || !data.intro.thesis?.caveat) fail("intro.thesis");
  if (!Array.isArray(data.intro.roadmap) || data.intro.roadmap.length < 4) fail("intro.roadmap");
  if (!data.intro.workedExample?.title || !Array.isArray(data.intro.workedExample.steps)) fail("intro.workedExample");
  if (!data.intro.quizIntro?.title || !data.intro.quizIntro?.body) fail("intro.quizIntro");
  if (!Array.isArray(data.intro.statsLabels) || data.intro.statsLabels.length < 3) fail("intro.statsLabels");
  if (!Array.isArray(data.sourceCards) || data.sourceCards.length !== 3) fail("sourceCards");
  if (!Array.isArray(data.bridges) || !data.bridges.length) fail("bridges");
  if (data.bridges.some((bridge) => !bridge.short || !bridge.tag || !bridge.standard)) fail("bridges short/tag/standard");
  if (!Array.isArray(data.cases) || !data.cases.length) fail("cases");
  if (!Array.isArray(data.quiz) || !data.quiz.length) fail("quiz");
  if (!data.quizResult || !data.quizResult.low) fail("quizResult");
  if (!data.methodology || typeof data.methodology.body !== "string") fail("methodology");
  if (!data.methodology.title || !data.methodology.summary || !data.methodology.scope) fail("methodology title/summary/scope");
  if (!Array.isArray(data.sources) || data.sources.some((source) => !source.short)) fail("sources");
  for (const item of data.cases) {
    if (!item.id || !item.title) fail("идентификатор кейса");
    if (!Array.isArray(item.categories) || !Array.isArray(item.links)) fail(`теги кейса ${item.id}`);
    if (!Array.isArray(item.mechanisms) || !Array.isArray(item.forms)) fail(`фильтры кейса ${item.id}`);
    if (!item.reports || typeof item.reports !== "object") fail(`отчётность кейса ${item.id}`);
  }
  for (const question of data.quiz) {
    if (!Array.isArray(question.choices) || question.choices.length < 2) fail(`варианты ${question.id}`);
    if (!question.choices.some((choice) => choice.id === question.correctId)) fail(`ключ ${question.id}`);
    if (!question.feedback) fail(`пояснение ${question.id}`);
  }
}

function renderStats(data) {
  const values = [data.cases.length, data.bridges.length, data.quiz.length];
  if (dom.headline) dom.headline.textContent = data.intro.headline;
  if (dom.eyebrow) dom.eyebrow.textContent = data.intro.eyebrow;
  if (dom.lede) dom.lede.textContent = data.intro.lede.replace("{count}", String(values[0]));
  if (dom.actions) {
    const links = dom.actions.querySelectorAll("a");
    if (links[0]) links[0].textContent = data.intro.primaryAction;
    if (links[1]) links[1].textContent = data.intro.secondaryAction;
  }
  if (dom.legend) dom.legend.textContent = data.intro.legend || "";
  if (dom.warning) dom.warning.textContent = data.intro.warning || "";
  const description = document.querySelector('meta[name="description"]');
  if (description && data.intro.description) description.setAttribute("content", data.intro.description);
  if (!dom.stats) return;
  dom.stats.querySelectorAll("b").forEach((node, index) => { node.textContent = String(values[index]); });
  dom.stats.querySelectorAll("span").forEach((node, index) => {
    if (data.intro.statsLabels[index]) node.textContent = data.intro.statsLabels[index];
  });
}

function renderThesis(data) {
  const thesis = data.intro.thesis;
  if (dom.thesisTitle) dom.thesisTitle.textContent = thesis.title;
  if (dom.thesisBody) dom.thesisBody.textContent = thesis.body;
  if (dom.thesisCaveat) dom.thesisCaveat.textContent = thesis.caveat;
  if (dom.catalogHint) dom.catalogHint.textContent = data.intro.catalogHint || "";
  if (dom.quizHeading) dom.quizHeading.textContent = data.intro.quizIntro.title;
  if (dom.quizIntroText) dom.quizIntroText.textContent = data.intro.quizIntro.body;
  if (dom.methodTitle) dom.methodTitle.textContent = data.methodology.title;
  if (dom.methodSummary) dom.methodSummary.textContent = data.methodology.summary;
  if (dom.methodScope) dom.methodScope.textContent = data.methodology.scope;
}

function renderRoadmap(data) {
  if (!dom.roadmap) return;
  const items = data.intro.roadmap.map((step) =>
    el("a", { class: "roadmap__item", href: `#${step.id}`, dataset: { step: step.id } },
      el("span", { class: "roadmap__step", "aria-hidden": "true", text: step.step }),
      el("span", { class: "roadmap__title", text: step.title }),
      el("span", { class: "roadmap__text", text: step.text })
    )
  );
  dom.roadmap.replaceChildren(...items);
}

function initRoadmap() {
  if (!dom.roadmap) return;
  const items = [...dom.roadmap.querySelectorAll(".roadmap__item")];
  if (!items.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = 170;
    let active = items[0].dataset.step;
    for (const item of items) {
      const section = document.getElementById(item.dataset.step);
      if (!section) continue;
      if (section.getBoundingClientRect().top <= line) active = item.dataset.step;
    }
    for (const item of items) {
      const isActive = item.dataset.step === active;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  update();
}

function renderWorkedExample(data) {
  const example = data.intro.workedExample;
  if (dom.exampleKicker) dom.exampleKicker.textContent = example.kicker;
  if (dom.exampleTitle) dom.exampleTitle.textContent = example.title;
  if (dom.exampleFlow) {
    const steps = example.steps.map((step, index) =>
      el("article", { class: "example-step" },
        el("span", { class: "example-step__index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
        el("h3", { text: step.label }),
        el("p", { text: step.text })
      )
    );
    dom.exampleFlow.replaceChildren(...steps);
  }
  if (dom.exampleCta) {
    dom.exampleCta.textContent = example.cta;
    dom.exampleCta.dataset.openCase = example.caseId;
  }
}

function renderSourceCards(data) {
  if (!dom.sourceGrid) return;
  const cards = data.sourceCards.map((card) => {
    const button = el("button", {
      class: `source-card source-card--${card.key}`,
      type: "button",
      dataset: { category: card.key },
    });
    button.append(
      el("span", { class: "source-card__scan", "aria-hidden": "true" }),
      el("span", { class: "source-card__letter", "aria-hidden": "true", text: card.key }),
      el("h3", { text: card.word }),
      el("p", { text: card.caption }),
      el("span", { class: "source-card__example", text: card.example || "" }),
      el("span", { class: "source-card__visual", text: card.visual }),
      el("span", {
        class: "source-card__wave",
        "aria-hidden": "true",
      }, el("i", {}), el("i", {}), el("i", {})),
      el("span", { class: "source-card__hint", text: "Показать кейсы" })
    );
    button.addEventListener("click", () => {
      if (catalog) catalog.selectCategory(card.key);
      closeMenu();
    });
    return button;
  });
  dom.sourceGrid.replaceChildren(...cards);
}

function renderBridges(data) {
  if (!dom.bridges) return;
  dom.bridges.replaceChildren(
    ...data.bridges.map((bridge, index) => {
      const button = el("button", { class: "btn btn--ghost", type: "button", text: "Показать кейсы" });
      button.addEventListener("click", () => {
        if (catalog) catalog.selectMechanism(bridge.id);
        closeMenu();
      });

      const more = el("details", { class: "bridge__more" });
      more.append(
        el("summary", {},
          el("span", { class: "bridge__more-label", text: "Правило учёта" }),
          el("span", { class: "bridge__more-standard", text: bridge.standard || "" }),
          el("span", { class: "bridge__more-arrow", "aria-hidden": "true" })
        ),
        el("div", { class: "bridge__more-body" }, el("p", { text: bridge.body }))
      );

      const tile = el("article", { class: `bridge bridge--${bridge.id}` });
      const media = el("div", { class: "bridge__media" });
      media.append(
        el("img", {
          src: `assets/bridge-${bridge.id}.webp`,
          width: "640",
          height: "360",
          loading: "lazy",
          decoding: "async",
          alt: "",
        }),
        el("span", { class: "bridge__index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
        el("span", { class: "bridge__tag", "aria-hidden": "true", text: bridge.tag || "" }),
        el("span", { class: "bridge__flow", "aria-hidden": "true" }, el("i", {}))
      );
      tile.append(
        media,
        el("h3", { text: bridge.title }),
        el("p", { class: "bridge__short", text: bridge.short || bridge.body }),
        more,
        button
      );
      return tile;
    })
  );
  dom.bridgeNote.textContent = data.bridgeNote || "";
  dom.bridgeNote.hidden = !data.bridgeNote;
}

function paragraphize(text) {
  const sentences = [];
  let rest = String(text || "").trim();
  while (rest) {
    const match = rest.match(/\.\s+(?=[А-ЯЁ])/);
    if (!match) { sentences.push(rest); break; }
    const cut = match.index + 1;
    sentences.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return sentences.filter(Boolean);
}

function renderMethodology(methodology) {
  dom.methodology.replaceChildren(...paragraphize(methodology.body).map((text) => el("p", { text })));
  const items = String(methodology.glossary || "").split(";").map((entry) => entry.trim()).filter(Boolean);
  const rows = items.map((entry) => {
    const separator = entry.includes(" — ") ? " — " : entry.includes(" - ") ? " - " : null;
    if (!separator) return el("div", {}, el("dt", { text: "Словарь" }), el("dd", { text: entry }));
    const [term, ...rest] = entry.split(separator);
    return el("div", {}, el("dt", { text: term.trim() }), el("dd", { text: rest.join(separator).replace(/\.$/, "").trim() }));
  });
  dom.glossary.replaceChildren(...rows);
}

function renderSources(sources) {
  const items = sources.map((source) => {
    let host = "";
    try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch { host = ""; }
    return el(
      "li",
      {},
      el(
        "a",
        { href: source.url, target: "_blank", rel: "noopener noreferrer" },
        el("strong", { text: source.short || source.label }),
        el("span", { class: "ext-mark", "aria-hidden": "true", text: " ↗" }),
        el("span", { class: "visually-hidden", text: " (откроется в новой вкладке)" }),
        host ? el("span", { class: "source-url", text: host }) : null
      )
    );
  });
  dom.sources.replaceChildren(...items);
}

function showError() {
  dom.error.hidden = false;
  dom.count.textContent = "Каталог недоступен";
  dom.results.replaceChildren();
  dom.bridges.replaceChildren(el("p", { class: "loading-note", text: "Материалы не загружены. Нажмите «Повторить» в каталоге." }));
  dom.bridgeNote.hidden = true;
  dom.quizRoot.replaceChildren(el("p", { class: "loading-note", text: "Вопросы не загружены." }));
  dom.methodology.replaceChildren();
  dom.glossary.replaceChildren();
  dom.sources.replaceChildren();
}

function closeMenu({ restoreFocus = false } = {}) {
  if (!dom.menuToggle || !dom.siteNav) return;
  const hadFocus = dom.siteNav.contains(document.activeElement);
  dom.menuToggle.setAttribute("aria-expanded", "false");
  dom.siteNav.classList.remove("is-open");
  if (restoreFocus && hadFocus) dom.menuToggle.focus();
}

function init(data) {
  validate(data);
  dom.error.hidden = true;

  renderStats(data);
  renderThesis(data);
  renderRoadmap(data);
  renderWorkedExample(data);
  renderSourceCards(data);
  renderMethodology(data.methodology);
  renderSources(data.sources);

  if (!catalog) catalog = createCatalog(data);
  else catalog.resetAll();

  if (!quiz) quiz = createQuiz(data);
  renderBridges(data);
  initStory();
  initAvatar();
  initMotion();
  initRoadmap();
  alignToHash();
}

function alignToHash() {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  requestAnimationFrame(() => requestAnimationFrame(() => target.scrollIntoView({ block: "start" })));
}

async function loadData() {
  dom.error.hidden = true;
  dom.count.textContent = "Загрузка каталога…";
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    init(await response.json());
  } catch (error) {
    console.error("Не удалось загрузить данные ESG Mapper:", error);
    showError();
  }
}

if (dom.menuToggle && dom.siteNav) {
  dom.menuToggle.addEventListener("click", () => {
    const open = dom.menuToggle.getAttribute("aria-expanded") !== "true";
    dom.menuToggle.setAttribute("aria-expanded", String(open));
    dom.siteNav.classList.toggle("is-open", open);
  });
  dom.siteNav.addEventListener("click", (event) => { if (event.target.closest("a")) closeMenu(); });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMenu({ restoreFocus: true });
  const panel = document.getElementById("filters-panel");
  const toggle = document.getElementById("filters-toggle");
  if (panel?.classList.contains("is-open")) {
    panel.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.focus();
  }
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open-case]");
  if (!trigger) return;
  event.preventDefault();
  closeMenu();
  history.replaceState(null, "", "#catalog");
  if (catalog) catalog.openCase(trigger.dataset.openCase, trigger);
});

if (dom.retry) dom.retry.addEventListener("click", loadData);

loadData();
