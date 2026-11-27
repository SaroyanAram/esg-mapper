/* v3: «Живой атлас». Данные остаются в content/site-content.json. */

import { createCatalog } from "./catalog.js";
import { createQuiz } from "./quiz.js";
import { initStory } from "./story.js";
import { initAvatar } from "./avatar.js";
import { initMotion } from "./motion.js";
import { initGuide } from "./guide.js";

const DATA_URL = "data/site-content.json";

const dom = {
  stats: document.getElementById("hero-stats"),
  headline: document.getElementById("hero-title"),
  eyebrow: document.querySelector(".hero__eyebrow"),
  actions: document.querySelector(".hero__actions"),
  lede: document.getElementById("hero-lede"),
  legend: document.getElementById("link-legend"),
  linkTheory: document.getElementById("link-theory-text"),
  warning: document.getElementById("method-warning"),
  thesisTitle: document.getElementById("thesis-title"),
  thesisBody: document.getElementById("thesis-body"),
  thesisCaveat: document.getElementById("thesis-caveat"),
  thesisChannels: document.getElementById("thesis-channels"),
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

function icon(paths, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const item of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", item);
    svg.append(path);
  }
  return svg;
}

function validate(data) {
  const fail = (message) => { throw new Error(`Некорректные данные: ${message}`); };
  if (!data || typeof data !== "object") fail("пустой ответ");
  if (!data.intro || typeof data.intro.title !== "string") fail("intro");
  if (typeof data.intro.headline !== "string" || typeof data.intro.lede !== "string") fail("intro.headline/lede");
  if (!data.intro.thesis?.title || !data.intro.thesis?.body || !data.intro.thesis?.caveat) fail("intro.thesis");
  if (!Array.isArray(data.intro.thesis.channels) || data.intro.thesis.channels.length !== 3) fail("intro.thesis.channels");
  if (data.intro.thesis.channels.some((channel) => !channel.title || !channel.text || !channel.example || !channel.caseId || !channel.linkText)) fail("intro.thesis.channels поля");
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
  if (!data.guide || !Array.isArray(data.guide.steps) || !data.guide.steps.length) fail("guide");
  if (!data.guide.name || !data.guide.off || !data.guide.on || !data.guide.next || !data.guide.progress || !data.guide.voiceOn || !data.guide.voiceOff) fail("guide controls");
  if (data.guide.steps.some((step) => !step.id || !step.title || !step.text || !step.target)) fail("guide.steps");
  if (data.guide.steps.some((step) => !document.getElementById(step.id) || !document.getElementById(step.target))) fail("guide anchors");
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
  if (dom.linkTheory) dom.linkTheory.textContent = data.intro.linkTheory || "";
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

function renderChannels(data) {
  if (!dom.thesisChannels) return;
  const glyphs = [
    ["M4 18h16", "M6 18v-6h12v6", "M9 12V8h6v4", "M12 4v2", "M4 9l2 1", "M20 9l-2 1"],
    ["M12 4v15", "M5 19h14", "M5 8h14", "M5 8 2 14h6z", "M19 8l-3 6h6z"],
    ["M6 3h8l4 4v14H6z", "M14 3v5h4", "M9 13l5 5", "M14 13l-5 5"],
  ];
  const cards = data.intro.thesis.channels.map((channel, index) => {
    const detail = el("details", { class: "channel-card__detail" });
    detail.append(
      el("summary", {},
        el("span", { class: "channel-card__index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
        icon(glyphs[index] || glyphs[0], "channel-card__glyph"),
        el("h3", { text: channel.title }),
        el("span", { class: "channel-card__arrow", "aria-hidden": "true" })
      ),
      el("div", { class: "channel-card__body" },
        el("p", { text: channel.text }),
        el("span", { class: "channel-card__example", text: channel.example })
      )
    );
    const link = el("button", {
      class: "channel-card__link",
      type: "button",
      dataset: { openCase: channel.caseId },
      "aria-label": `Открыть ${channel.linkText}`,
      title: channel.linkText,
    },
      icon(["M5 12h13", "M13 7l5 5-5 5"], "channel-card__link-icon"),
      el("span", { class: "visually-hidden", text: channel.linkText })
    );
    return el("article", {
      class: `channel-card channel-card--${index + 1}`,
      dataset: { channel: String(index + 1) },
    }, detail, link);
  });
  dom.thesisChannels.replaceChildren(...cards);
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
    const glyphs = [
      ["M12 3v18", "M16.5 7.2c0-1.8-2-2.8-4.5-2.8S7.5 5.4 7.5 7.2c0 4.2 9 2.4 9 6.6 0 1.9-2 2.9-4.5 2.9s-4.5-1-4.5-2.9"],
      ["M7 3h7l4 4v14H7z", "M14 3v5h4", "M10 13h5", "M10 17h5"],
      ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"],
      ["M4 19h16", "M7 16v-5M12 16V6M17 16v-8"],
    ];
    const steps = example.steps.map((step, index) => {
      const card = el("details", { class: "example-step" },
        el("summary", { class: "example-step__summary" },
          el("span", { class: "example-step__index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
          icon(glyphs[index] || glyphs[0], "example-step__glyph"),
          el("h3", { text: step.label }),
          el("span", { class: "example-step__arrow", "aria-hidden": "true" })
        ),
        el("div", { class: "example-step__body" }, el("p", { text: step.text }))
      );
      return card;
    });
    dom.exampleFlow.replaceChildren(...steps);
  }
  if (dom.exampleCta) {
    dom.exampleCta.textContent = example.cta;
    dom.exampleCta.dataset.openCase = example.caseId;
  }
}

function renderLedger(example) {
  const host = document.getElementById("hero-ledger");
  if (!host || !example.reportViews?.length) return;
  const scene = host.closest(".lens-desk");
  const selector = el("fieldset", { class: "ledger__switch" },
    el("legend", { class: "visually-hidden", text: "Выберите форму отчётности" }));
  const when = el("span", { class: "ledger__when" });
  const amount = el("strong", { class: "ledger__amount" });
  const line = el("span", { class: "ledger__line" });
  const note = el("p", { class: "ledger__note" });
  const result = el("div", { class: "ledger__sheet", "aria-live": "polite", "aria-atomic": "true" },
    when, el("div", { class: "ledger__entry" }, amount, line), note);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function choose(view, animate) {
    scene.dataset.report = view.id;
    when.textContent = view.when;
    amount.textContent = view.amount;
    line.textContent = view.line;
    note.textContent = view.note;
    if (!animate || reduced.matches) return;
    result.getAnimations().forEach((animation) => animation.cancel());
    result.animate([{ transform: "translateY(4px)", opacity: 0.8 }, { transform: "none", opacity: 1 }],
      { duration: 220, easing: "ease-out" });
    const ray = scene.querySelector(".signal-path");
    ray.getAnimations().forEach((animation) => animation.cancel());
    ray.animate([{ opacity: 0.28 }, { opacity: 1, offset: 0.45 }, { opacity: 0.62 }], { duration: 420 });
  }
  example.reportViews.forEach((view, index) => {
    const input = el("input", { type: "radio", name: "hero-report", value: view.id, checked: index === 0 });
    selector.append(el("label", {}, input, el("span", { text: view.label })));
    input.addEventListener("change", () => choose(view, true));
  });
  host.replaceChildren(selector, result);
  choose(example.reportViews[0], false);
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
      el("span", { class: "source-card__chain", text: card.chain || "" }),
      el("span", { class: "source-card__example", text: card.example || "" }),
      el("span", {
        class: "source-card__wave",
        "aria-hidden": "true",
      }, el("i", {}), el("i", {}), el("i", {})),
      el("span", { class: "source-card__hint", text: card.action || "Показать кейсы" })
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
  renderChannels(data);
  renderRoadmap(data);
  renderWorkedExample(data);
  renderLedger(data.intro.workedExample);
  renderSourceCards(data);
  renderMethodology(data.methodology);
  renderSources(data.sources);

  if (!catalog) catalog = createCatalog(data);
  else catalog.resetAll();

  const deepCase = new URLSearchParams(location.search).get("case");
  if (deepCase && data.cases.some((item) => item.id === deepCase)) catalog.openCase(deepCase);

  if (!quiz) quiz = createQuiz(data);
  renderBridges(data);
  initStory();
  initAvatar();
  initMotion();
  initRoadmap();
  initGuide(data);
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
  if (catalog) catalog.openCase(trigger.dataset.openCase, trigger);
});

if (dom.retry) dom.retry.addEventListener("click", loadData);

loadData();
