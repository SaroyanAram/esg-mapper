/* Карта следов: поиск, фильтры, короткий список и выдвижное досье. */

export const CATEGORY_LABELS = {
  E: { letter: "E", word: "Экология" },
  S: { letter: "S", word: "Социальное" },
  G: { letter: "G", word: "Управление" },
};

export const LINK_LABELS = {
  direct: { letter: "П", word: "Прямая" },
  indirect: { letter: "К", word: "Косвенная" },
};

export const MECHANISM_LABELS = {
  expense: "Расходы",
  capitalization: "Капитализация",
  provision: "Оценочные обязательства",
  impairment: "Обесценение",
  other: "Другие",
};

export const FORM_LABELS = {
  balance: "Баланс",
  income: "ОФР",
  cashflow: "ОДДС",
  notes: "Примечания",
};

const FILTER_OPTIONS = {
  category: [["all", "Все"], ["E", "E"], ["S", "S"], ["G", "G"]],
  mechanism: [
    ["all", "Все"],
    ["expense", "Расходы"],
    ["capitalization", "Капитализация"],
    ["provision", "Оценочные обязательства"],
    ["impairment", "Обесценение"],
    ["other", "Другие"],
  ],
  form: [
    ["all", "Все"],
    ["balance", "Баланс"],
    ["income", "ОФР"],
    ["cashflow", "ОДДС"],
    ["notes", "Примечания"],
  ],
  link: [["all", "Все"], ["direct", "Прямая"], ["indirect", "Косвенная"]],
};

const DEFAULT_FILTERS = { query: "", category: "all", mechanism: "all", form: "all", link: "all" };
const FEATURED_LIMIT = 3;

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

export function normalizeSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/co₂|co2/g, "co2")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchIndex(item) {
  const parts = [
    item.id,
    item.title,
    item.indicator,
    item.accounting,
    item.example,
    item.references,
    ...(item.aliases || []),
    ...(item.chain || []),
    ...(item.categories || []).map((key) => `${key} ${CATEGORY_LABELS[key]?.word || ""}`),
    ...(item.links || []).map((key) => `${key} ${LINK_LABELS[key]?.word || ""}`),
    ...(item.mechanisms || []).map((key) => MECHANISM_LABELS[key] || key),
    ...(item.forms || []).map((key) => FORM_LABELS[key] || key),
    ...Object.values(item.reports || {}),
  ];
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

export function filterCases(cases, filters) {
  const words = normalizeSearch(filters.query).split(" ").filter(Boolean);
  return cases.filter((item) => {
    if (filters.category !== "all" && !(item.categories || []).includes(filters.category)) return false;
    if (filters.mechanism !== "all" && !(item.mechanisms || []).includes(filters.mechanism)) return false;
    if (filters.form !== "all" && !(item.forms || []).includes(filters.form)) return false;
    if (filters.link !== "all" && !(item.links || []).includes(filters.link)) return false;
    if (!words.length) return true;
    const haystack = buildSearchIndex(item);
    return words.every((word) => haystack.includes(word));
  });
}

function externalLink(url, label) {
  return el(
    "a",
    { href: url, target: "_blank", rel: "noopener noreferrer" },
    label,
    el("span", { class: "ext-mark", "aria-hidden": "true", text: "↗" }),
    el("span", { class: "visually-hidden", text: " (откроется в новой вкладке)" })
  );
}

function dossierBlock(title, ...children) {
  return el("div", { class: "dossier__block" }, el("h4", { text: title }), ...children);
}

function buildDossier(item, sourcesById) {
  const wrap = el("div");
  const tags = el("div", { class: "dossier__tags" });
  for (const key of item.categories || []) {
    const info = CATEGORY_LABELS[key] || { letter: key, word: key };
    tags.append(el("span", { text: `${info.letter} · ${info.word}` }));
  }
  for (const key of item.links || []) tags.append(el("span", { text: LINK_LABELS[key]?.word || key }));
  for (const key of item.mechanisms || []) tags.append(el("span", { text: MECHANISM_LABELS[key] || key }));
  wrap.append(tags);

  const grid = el("div", { class: "dossier__grid" });
  const main = el("div");
  main.append(
    dossierBlock("Показатель", el("p", { text: item.indicator })),
    dossierBlock(
      "Цепочка",
      el("ol", {}, ...(item.chain || []).map((step) => el("li", { text: step })))
    ),
    dossierBlock("Учёт и условия", el("p", { text: item.accounting }))
  );
  if (item.cashflowNote) {
    main.append(dossierBlock("Денежный поток", el("p", { text: item.cashflowNote })));
  }
  if (item.example) main.append(dossierBlock("Пример", el("p", { text: item.example })));

  const side = el("div");
  const reports = dossierBlock("Отчётность");
  for (const key of ["balance", "income", "cashflow", "notes"]) {
    const text = item.reports?.[key];
    if (!text) continue;
    const inFilter = (item.forms || []).includes(key);
    const block = el("div", { class: inFilter ? "dossier__report" : "dossier__report dossier__report--clarify" });
    block.append(
      el("b", { text: FORM_LABELS[key] || key }),
      el("p", { text })
    );
    if (!inFilter) {
      block.append(el("p", { class: "dossier__clarify", text: `Пояснение вне фильтра «${FORM_LABELS[key] || key}»` }));
    }
    reports.append(block);
  }
  side.append(reports);

  const refs = dossierBlock("Источники", el("p", { class: "dossier__refs", text: item.references }));
  const links = el("div", { class: "dossier__links" });
  if (sourcesById["ifrs-accounting"]) links.append(externalLink(sourcesById["ifrs-accounting"].url, "IFRS"));
  if (/GRI/.test(item.references || "") && sourcesById["gri"]) links.append(externalLink(sourcesById["gri"].url, "GRI"));
  if (/GHG/.test(item.references || "") && sourcesById["ghg"]) links.append(externalLink(sourcesById["ghg"].url, "GHG Protocol"));
  if (/ICMA/.test(item.references || "") && sourcesById["icma"]) links.append(externalLink(sourcesById["icma"].url, "ICMA"));
  refs.append(links);
  side.append(refs);

  grid.append(main, side);
  wrap.append(grid);
  return wrap;
}

function buildRow(item) {
  const row = el("button", {
    class: "case-row",
    type: "button",
    dataset: { openCase: item.id },
  });
  const esg = el("span", { class: "case-row__esg", "aria-hidden": "true" });
  for (const key of item.categories || []) esg.append(el("i", { dataset: { esg: key }, text: key }));
  const forms = el("span", { class: "case-row__forms", "aria-hidden": "true" });
  for (const key of item.forms || []) forms.append(el("span", { text: FORM_LABELS[key] || key }));
  const chain = (item.chain || []).map((step) => String(step).replace(/\.$/, "")).join(" → ");
  row.append(
    el("span", { class: "case-row__id", "aria-hidden": "true", text: item.id }),
    el("span", { class: "case-row__main" },
      el("span", { class: "case-row__title", text: item.title }),
      chain ? el("span", { class: "case-row__chain", text: chain, title: chain }) : null,
      forms
    ),
    esg,
    el("span", { class: "case-row__arrow", "aria-hidden": "true", text: "›" })
  );
  return row;
}

function emptyState() {
  return el(
    "div",
    { class: "catalog-empty" },
    el("p", { text: "Ничего не найдено. Измените фильтры или сбросьте их." }),
    el("button", { class: "btn btn--ghost", type: "button", dataset: { action: "reset" }, text: "Сбросить фильтры" })
  );
}

export function createCatalog(data) {
  const els = {
    search: document.getElementById("catalog-search"),
    reset: document.getElementById("catalog-reset"),
    results: document.getElementById("catalog-results"),
    count: document.getElementById("catalog-count"),
    title: document.getElementById("catalog-title"),
    panel: document.getElementById("filters-panel"),
    toggle: document.getElementById("filters-toggle"),
    badge: document.getElementById("filters-badge"),
    error: document.getElementById("catalog-error"),
    showAll: document.getElementById("show-all"),
    hiddenCount: document.getElementById("hidden-count"),
    dossier: document.getElementById("case-dossier"),
    dossierId: document.getElementById("dossier-id"),
    dossierTitle: document.getElementById("dossier-title"),
    dossierBody: document.getElementById("dossier-body"),
    dossierClose: document.getElementById("dossier-close"),
    stageTitle: document.getElementById("stage-title"),
    lupa: document.getElementById("lupa"),
    mapLupa: document.querySelector(".map-stage__lupa"),
  };

  const sourcesById = {};
  for (const source of data.sources || []) sourcesById[source.id] = source;

  const state = { ...DEFAULT_FILTERS };
  let selectedId = null;
  let expanded = false;
  let lastTrigger = null;

  function renderFilterGroup(group, options) {
    const container = els.panel.querySelector(`[data-filter="${group}"]`);
    if (!container) return;
    const chips = el("div", { class: "filter-chips" });
    for (const [value, label] of options) {
      const inputId = `filter-${group}-${value}`;
      const input = el("input", {
        type: "radio",
        name: group,
        value,
        id: inputId,
        checked: state[group] === value,
      });
      const letter = group === "category" && value !== "all" ? el("span", { class: "chip__letter", text: value }) : null;
      const labelNode = el("label", { for: inputId }, letter, el("span", { text: label }));
      chips.append(el("div", { class: `chip chip--${group === "category" ? value : ""}` }, input, labelNode));
    }
    const legend = container.querySelector("legend") || el("legend", { text: "" });
    container.replaceChildren(legend, chips);
  }

  function renderFilters() {
    for (const [group, options] of Object.entries(FILTER_OPTIONS)) renderFilterGroup(group, options);
  }

  function syncControls() {
    els.search.value = state.query;
    for (const input of els.panel.querySelectorAll('input[type="radio"]')) {
      input.checked = state[input.name] === input.value;
    }
    updateBadge();
  }

  function activeGroupCount() {
    return ["category", "mechanism", "form", "link"].filter((key) => state[key] !== "all").length;
  }

  function updateBadge() {
    const count = activeGroupCount();
    els.badge.textContent = String(count);
    els.badge.hidden = count === 0;
    els.toggle.setAttribute("aria-label", `Настроить линзу, активно групп: ${count}`);
  }

  function isDefaultView() {
    return !state.query && activeGroupCount() === 0;
  }

  function setStage(item) {
    const mood = item?.categories?.[0] || "idle";
    const offsets = { E: ["-7px", "3px"], S: ["0px", "-5px"], G: ["7px", "4px"] };
    const [x, y] = offsets[mood] || ["0px", "0px"];
    for (const node of [els.lupa, els.mapLupa]) {
      if (!node) continue;
      node.dataset.mood = mood;
      node.style.setProperty("--pupil-x", x);
      node.style.setProperty("--pupil-y", y);
      node.style.setProperty("--map-x", x);
      node.style.setProperty("--map-y", y);
    }
    els.stageTitle.textContent = item ? item.title : "Выберите след";
    for (const chip of document.querySelectorAll("[data-stage-report]")) {
      chip.classList.toggle("is-lit", Boolean(item && (item.forms || []).includes(chip.dataset.stageReport)));
    }
  }

  function openDossier(item) {
    selectedId = item.id;
    els.dossierId.textContent = item.id;
    els.dossierTitle.textContent = item.title;
    els.dossierBody.replaceChildren(buildDossier(item, sourcesById));
    setStage(item);
    if (!els.dossier.open) els.dossier.showModal();
    els.dossierTitle.focus({ preventScroll: true });
  }

  function focusTrigger(trigger) {
    if (!trigger?.isConnected) return;
    const rect = trigger.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) trigger.scrollIntoView({ block: "center" });
    trigger.focus({ preventScroll: true });
  }

  function closeDossier({ restoreFocus = false } = {}) {
    const wasOpen = els.dossier.open;
    if (wasOpen) els.dossier.close();
    selectedId = null;
    setStage(null);
    if (!wasOpen && restoreFocus && lastTrigger?.isConnected) {
      const trigger = lastTrigger;
      lastTrigger = null;
      requestAnimationFrame(() => focusTrigger(trigger));
    }
  }

  function render() {
    const visible = filterCases(data.cases, state);
    const limited = isDefaultView() && !expanded;
    const rows = limited ? visible.slice(0, FEATURED_LIMIT) : visible;
    els.results.replaceChildren(...(rows.length ? rows.map(buildRow) : [emptyState()]));
    els.count.textContent = `Найдено: ${visible.length} из ${data.cases.length}`;
    els.hiddenCount.textContent = String(Math.max(0, visible.length - rows.length));
    els.showAll.hidden = !limited || visible.length <= FEATURED_LIMIT;
    if (selectedId && !visible.some((item) => item.id === selectedId)) closeDossier();
    if (!selectedId && !limited) setStage(null);
  }

  function focusMap() {
    els.title.focus({ preventScroll: true });
    els.title.scrollIntoView({ block: "start" });
  }

  function resetAll({ focusSearch = false } = {}) {
    Object.assign(state, DEFAULT_FILTERS);
    expanded = false;
    closeDossier();
    setStage(null);
    syncControls();
    render();
    if (focusSearch) els.search.focus();
  }

  function selectMechanism(mechanism) {
    Object.assign(state, DEFAULT_FILTERS, { mechanism });
    expanded = false;
    closeDossier();
    setStage(null);
    syncControls();
    render();
    closePanel();
    focusMap();
  }

  function selectCategory(category) {
    Object.assign(state, DEFAULT_FILTERS, { category });
    expanded = false;
    closeDossier();
    setStage(null);
    syncControls();
    render();
    focusMap();
  }

  function openCase(id, trigger = null) {
    const item = data.cases.find((entry) => entry.id === id);
    if (!item) return;
    Object.assign(state, DEFAULT_FILTERS);
    expanded = false;
    syncControls();
    render();
    const freshRow = document.querySelector(`.case-list [data-open-case="${id}"]`);
    const sameRow = trigger?.classList?.contains("case-row") && trigger.isConnected;
    lastTrigger = sameRow ? trigger : freshRow || trigger;
    openDossier(item);
    els.title.scrollIntoView({ block: "start" });
  }

  function closePanel() {
    els.panel.classList.remove("is-open");
    els.toggle.setAttribute("aria-expanded", "false");
  }

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    render();
  });

  els.reset.addEventListener("click", () => resetAll());
  els.showAll.addEventListener("click", () => {
    expanded = true;
    render();
  });

  els.panel.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    state[input.name] = input.value;
    render();
    updateBadge();
  });

  els.results.addEventListener("click", (event) => {
    const resetButton = event.target.closest('[data-action="reset"]');
    if (resetButton) {
      resetAll({ focusSearch: true });
      return;
    }
    const row = event.target.closest("[data-open-case]");
    if (row) {
      event.stopPropagation();
      openCase(row.dataset.openCase, row);
    }
  });

  els.toggle.addEventListener("click", () => {
    if (getComputedStyle(els.panel).display !== "none") return;
    const open = !els.panel.classList.contains("is-open");
    els.panel.classList.toggle("is-open", open);
    els.toggle.setAttribute("aria-expanded", String(open));
    if (open) els.panel.querySelector("input")?.focus();
  });

  els.dossierClose.addEventListener("click", () => closeDossier({ restoreFocus: true }));
  els.dossier.addEventListener("close", () => {
    selectedId = null;
    const trigger = lastTrigger;
    lastTrigger = null;
    requestAnimationFrame(() => focusTrigger(trigger));
  });
  els.dossier.addEventListener("click", (event) => {
    if (event.target === els.dossier) closeDossier({ restoreFocus: true });
  });

  if (els.error) els.error.hidden = true;
  renderFilters();
  syncControls();
  render();
  setStage(null);

  return { resetAll, selectMechanism, selectCategory, openCase, state };
}
