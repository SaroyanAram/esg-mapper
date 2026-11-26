/* v2: история «След сигнала». Данные остаются в content/site-content.json. */

import { createCatalog } from "./catalog.js";
import { createQuiz } from "./quiz.js";
import { initStory } from "./story.js";
import { initAvatar } from "./avatar.js";

const DATA_URL = "data/site-content.json";

const dom = {
  stats: document.getElementById("hero-stats"),
  lede: document.getElementById("hero-lede"),
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

const SOURCE_CARDS = [
  { key: "E", word: "Экология", caption: "Выбросы, платежи, активы" },
  { key: "S", word: "Социальное", caption: "Обучение, травмы, персонал" },
  { key: "G", word: "Управление", caption: "Правление, вознаграждение, раскрытие" },
];

const BRIDGE_SHORT = {
  expense: "Нет актива — расход периода.",
  capitalization: "Есть критерии признания — актив и амортизация.",
  provision: "Обязанность, вероятный отток, надёжная оценка.",
  impairment: "Балансовая выше возмещаемой — убыток.",
};

const SOURCE_SHORT = {
  "ifrs-accounting": "IFRS учёт",
  "ifrs-sustainability": "IFRS устойчивость",
  icma: "ICMA",
  gri: "GRI",
  ghg: "GHG Protocol",
};

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
  if (!Array.isArray(data.bridges) || !data.bridges.length) fail("bridges");
  if (!Array.isArray(data.cases) || !data.cases.length) fail("cases");
  if (!Array.isArray(data.quiz) || !data.quiz.length) fail("quiz");
  if (!data.methodology || typeof data.methodology.body !== "string") fail("methodology");
  if (!Array.isArray(data.sources)) fail("sources");
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
  if (!dom.stats) return;
  const values = [data.cases.length, data.bridges.length, data.quiz.length];
  dom.stats.querySelectorAll("b").forEach((node, index) => { node.textContent = String(values[index]); });
  if (dom.lede) {
    dom.lede.textContent = `${data.cases.length} кейсов показывают путь от экологического, социального или управленческого сигнала до баланса, ОФР и ОДДС.`;
  }
}

function renderSourceCards() {
  if (!dom.sourceGrid) return;
  const cards = SOURCE_CARDS.map((card) => {
    const button = el("button", {
      class: `source-card source-card--${card.key}`,
      type: "button",
      dataset: { category: card.key },
      "aria-label": `Показать кейсы ${card.word}`,
    });
    button.append(
      el("span", { class: "source-card__letter", "aria-hidden": "true", text: card.key }),
      el("h3", { text: card.word }),
      el("p", { text: card.caption }),
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
      more.append(el("summary", { text: "Формулировка механизма" }), el("p", { text: bridge.body }));

      const tile = el("article", { class: "bridge" });
      const media = el("div", { class: "bridge__media" });
      media.append(
        el("img", {
          src: `assets/bridge-${bridge.id}.webp`,
          width: "384",
          height: "218",
          loading: "lazy",
          decoding: "async",
          alt: "",
        }),
        el("span", { class: "bridge__index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") })
      );
      tile.append(
        media,
        el("h3", { text: bridge.title }),
        el("p", { class: "bridge__short", text: BRIDGE_SHORT[bridge.id] || bridge.body }),
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
        el("strong", { text: SOURCE_SHORT[source.id] || source.label }),
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

function closeMenu() {
  if (!dom.menuToggle || !dom.siteNav) return;
  dom.menuToggle.setAttribute("aria-expanded", "false");
  dom.siteNav.classList.remove("is-open");
}

function init(data) {
  validate(data);
  dom.error.hidden = true;

  renderStats(data);
  renderSourceCards();
  renderMethodology(data.methodology);
  renderSources(data.sources);

  if (!catalog) catalog = createCatalog(data);
  else catalog.resetAll();

  if (!quiz) quiz = createQuiz(data);
  renderBridges(data);
  initStory();
  initAvatar();
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
  closeMenu();
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
  if (catalog) catalog.openCase(trigger.dataset.openCase, trigger);
});

if (dom.retry) dom.retry.addEventListener("click", loadData);

loadData();
