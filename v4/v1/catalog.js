/* Каталог: чистый поиск, фильтры и вывод карточек. */

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
  category: [
    ["all", "Все"],
    ["E", "E"],
    ["S", "S"],
    ["G", "G"],
  ],
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
  link: [
    ["all", "Все"],
    ["direct", "Прямая"],
    ["indirect", "Косвенная"],
  ],
};

const DEFAULT_FILTERS = {
  query: "",
  category: "all",
  mechanism: "all",
  form: "all",
  link: "all",
};

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

function sourceLink(source, label) {
  if (!source) return null;
  return el(
    "li",
    {},
    externalLink(source.url, label || source.label)
  );
}

function tag(text, letter, modifier) {
  const classes = ["tag"];
  if (modifier) classes.push(modifier);
  return el(
    "li",
    { class: classes.join(" ") },
    letter ? el("span", { class: "tag-letter", "aria-hidden": "true", text: letter }) : null,
    el("span", { text })
  );
}

function metaGroup(label, tags) {
  return [
    el("span", { class: "meta-label", text: label }),
    el("ul", { class: "tags" }, ...tags),
  ];
}

function block(title, ...children) {
  return el("div", { class: "block" }, el("h4", { text: title }), ...children);
}

function buildCard(item, isOpen, sourcesById) {
  const panelId = `case-${item.id}-panel`;
  const toggleId = `case-${item.id}-toggle`;
  const titleId = `case-${item.id}-title`;

  const card = el("article", {
    class: isOpen ? "case-card is-open" : "case-card",
    "aria-labelledby": titleId,
  });

  card.append(
    el("p", { class: "case-id", text: item.id }),
    el("h3", { class: "case-title", id: titleId, text: item.title })
  );

  const meta = el("div", { class: "case-meta" });
  meta.append(
    ...metaGroup(
      "ESG",
      (item.categories || []).map((key) => {
        const info = CATEGORY_LABELS[key] || { letter: key, word: "" };
        return tag(info.word || key, info.letter, `tag--${key.toLowerCase()}`);
      })
    ),
    ...metaGroup(
      "Связь",
      (item.links || []).map((key) => {
        const info = LINK_LABELS[key] || { letter: "", word: key };
        return tag(info.word, info.letter);
      })
    ),
    ...metaGroup(
      "Механизм",
      (item.mechanisms || []).map((key) => tag(MECHANISM_LABELS[key] || key))
    ),
    ...metaGroup(
      "Отчётность",
      (item.forms || []).map((key) => tag(FORM_LABELS[key] || key))
    )
  );
  card.append(meta);

  const toggle = el(
    "button",
    {
      class: "case-toggle",
      id: toggleId,
      type: "button",
      "aria-expanded": String(isOpen),
      "aria-controls": panelId,
      dataset: { caseId: item.id },
    },
    el("span", { class: "toggle-label", text: isOpen ? "Свернуть" : "Подробнее" }),
    el("span", { class: "toggle-glyph", "aria-hidden": "true", text: isOpen ? "−" : "+" })
  );
  card.append(toggle);

  const body = el("div", { class: "case-body", id: panelId });
  if (!isOpen) body.hidden = true;

  const main = el("div", { class: "case-body__main" });
  main.append(block("Показатель", el("p", { text: item.indicator })));

  main.append(
    block(
      "Цепочка",
      el("ol", { class: "chain" }, ...(item.chain || []).map((step) => el("li", { text: step })))
    )
  );

  main.append(block("Учёт и условия", el("p", { text: item.accounting })));

  if (item.id === "03") {
    main.append(
      block("Денежный поток", el("p", { text: "Признание неденежное: при обесценении угольных активов денежного оттока нет." }))
    );
  }

  if (item.example) {
    main.append(block("Пример", el("p", { text: item.example })));
  }

  const side = el("div", { class: "case-body__side" });
  const reportsBlock = el("div", { class: "block" }, el("h4", { text: "Отчётность" }));
  for (const key of ["balance", "income", "cashflow", "notes"]) {
    const text = item.reports?.[key];
    if (!text) continue;
    const inFilter = (item.forms || []).includes(key);
    const report = el("div", { class: inFilter ? "report" : "report report--clarification" });
    report.append(el("p", { class: "report__name", text: FORM_LABELS[key] || key }));
    if (!inFilter) {
      report.append(
        el("span", { class: "report__note", text: `Пояснение вне фильтра «${FORM_LABELS[key] || key}»` })
      );
    }
    report.append(el("p", { class: "report__text", text }));
    reportsBlock.append(report);
  }
  side.append(reportsBlock);

  const refs = el(
    "div",
    { class: "block" },
    el("h4", { text: "Источники" }),
    el("p", { class: "references", text: item.references })
  );

  const linkList = el("ul", { class: "source-links" });
  const accounting = sourceLink(sourcesById["ifrs-accounting"], "Справочник стандартов IFRS");
  if (accounting) linkList.append(accounting);
  if (/GRI/.test(item.references || "")) {
    const gri = sourceLink(sourcesById["gri"], "Стандарты GRI");
    if (gri) linkList.append(gri);
  }
  if (/GHG/.test(item.references || "")) {
    const ghg = sourceLink(sourcesById["ghg"], "GHG Protocol");
    if (ghg) linkList.append(ghg);
  }
  if (/ICMA/.test(item.references || "")) {
    const icma = sourceLink(sourcesById["icma"], "Принципы ICMA");
    if (icma) linkList.append(icma);
  }
  refs.append(linkList);
  side.append(refs);

  body.append(main, side);
  card.append(body);
  return card;
}

export function createCatalog(data) {
  const els = {
    search: document.getElementById("catalog-search"),
    reset: document.getElementById("catalog-reset"),
    results: document.getElementById("catalog-results"),
    count: document.getElementById("catalog-count"),
    filterPanel: document.getElementById("filters-panel"),
    filtersToggle: document.getElementById("filters-toggle"),
    filtersBadge: document.getElementById("filters-badge"),
    error: document.getElementById("catalog-error"),
    retry: document.getElementById("catalog-retry"),
    catalogTitle: document.getElementById("catalog-title"),
  };

  const sourcesById = {};
  for (const source of data.sources || []) sourcesById[source.id] = source;

  const state = { ...DEFAULT_FILTERS };
  const openIds = new Set();

  function renderFilterGroup(group, options) {
    const container = els.filterPanel.querySelector(`[data-filter="${group}"]`);
    if (!container) return;
    container.replaceChildren();
    for (const [value, label] of options) {
      const inputId = `filter-${group}-${value}`;
      const input = el("input", {
        type: "radio",
        name: group,
        value,
        id: inputId,
        checked: value === state[group],
      });
      const text = el("span", { text: label });
      const labelNode = el(
        "label",
        { for: inputId },
        el("span", { class: "chip-check", "aria-hidden": "true", text: "✓" }),
        text
      );
      if (group === "category" && value !== "all") {
        const word = CATEGORY_LABELS[value]?.word;
        if (word) labelNode.append(el("span", { class: "visually-hidden", text: `, ${word}` }));
      }
      container.append(el("div", { class: "chip" }, input, labelNode));
    }
  }

  function renderFilters() {
    for (const [group, options] of Object.entries(FILTER_OPTIONS)) {
      renderFilterGroup(group, options);
    }
  }

  function syncControls() {
    els.search.value = state.query;
    for (const input of els.filterPanel.querySelectorAll('input[type="radio"]')) {
      input.checked = state[input.name] === input.value;
    }
    updateBadge();
  }

  function activeGroupCount() {
    return ["category", "mechanism", "form", "link"].filter((key) => state[key] !== "all").length;
  }

  function updateBadge() {
    const count = activeGroupCount();
    if (!els.filtersBadge) return;
    els.filtersBadge.textContent = String(count);
    els.filtersBadge.hidden = count === 0;
    if (els.filtersToggle) {
      els.filtersToggle.setAttribute("aria-label", `Фильтры, активно групп: ${count}`);
    }
  }

  function emptyState() {
    return el(
      "div",
      { class: "catalog-empty" },
      el("p", { text: "Ничего не найдено. Измените фильтры или сбросьте их." }),
      el("button", { class: "btn btn-secondary", type: "button", dataset: { action: "reset" }, text: "Сбросить фильтры" })
    );
  }

  function render() {
    const focusedToggle = document.activeElement?.closest?.(".case-toggle");
    const focusedId = focusedToggle?.dataset.caseId || null;

    const visible = filterCases(data.cases, state);
    const visibleIds = new Set(visible.map((item) => item.id));
    for (const id of [...openIds]) {
      if (!visibleIds.has(id)) openIds.delete(id);
    }

    const cards = visible.map((item) => buildCard(item, openIds.has(item.id), sourcesById));
    els.results.replaceChildren(...(cards.length ? cards : [emptyState()]));
    els.count.textContent = `Найдено: ${visible.length} из ${data.cases.length}`;

    if (focusedId) {
      const next = document.getElementById(`case-${focusedId}-toggle`);
      if (next) next.focus({ preventScroll: true });
    }
  }

  function setFilter(group, value) {
    state[group] = value;
    render();
    updateBadge();
  }

  function resetAll({ focusSearch = false } = {}) {
    Object.assign(state, DEFAULT_FILTERS);
    openIds.clear();
    syncControls();
    render();
    if (focusSearch) els.search.focus();
  }

  function focusCatalogHeading() {
    if (!els.catalogTitle) return;
    els.catalogTitle.focus({ preventScroll: true });
    els.catalogTitle.scrollIntoView({ block: "start" });
  }

  function selectMechanism(mechanism) {
    Object.assign(state, DEFAULT_FILTERS, { mechanism });
    openIds.clear();
    syncControls();
    render();
    els.filterPanel.classList.remove("is-open");
    if (els.filtersToggle) els.filtersToggle.setAttribute("aria-expanded", "false");
    focusCatalogHeading();
  }

  function openCase(id) {
    const item = data.cases.find((entry) => entry.id === id);
    if (!item) return;
    Object.assign(state, DEFAULT_FILTERS);
    openIds.clear();
    openIds.add(id);
    syncControls();
    render();
    const toggle = document.getElementById(`case-${id}-toggle`);
    const card = toggle?.closest(".case-card");
    if (card) card.scrollIntoView({ block: "start" });
    if (toggle) toggle.focus({ preventScroll: true });
  }

  function toggleCase(id) {
    const item = data.cases.find((entry) => entry.id === id);
    if (!item) return;
    const open = !openIds.has(id);
    if (open) openIds.add(id);
    else openIds.delete(id);

    const toggle = document.getElementById(`case-${id}-toggle`);
    const card = toggle?.closest(".case-card");
    const body = document.getElementById(`case-${id}-panel`);
    if (!toggle || !card || !body) return;

    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector(".toggle-label");
    const glyph = toggle.querySelector(".toggle-glyph");
    if (label) label.textContent = open ? "Свернуть" : "Подробнее";
    if (glyph) glyph.textContent = open ? "−" : "+";
    body.hidden = !open;
    card.classList.toggle("is-open", open);
  }

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    render();
  });

  els.reset.addEventListener("click", () => resetAll({ focusSearch: false }));

  els.filterPanel.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    setFilter(input.name, input.value);
  });

  els.results.addEventListener("click", (event) => {
    const resetButton = event.target.closest('[data-action="reset"]');
    if (resetButton) {
      resetAll({ focusSearch: true });
      return;
    }
    const toggle = event.target.closest(".case-toggle");
    if (toggle) toggleCase(toggle.dataset.caseId);
  });

  if (els.filtersToggle) {
    els.filtersToggle.addEventListener("click", () => {
      const open = !els.filterPanel.classList.contains("is-open");
      els.filterPanel.classList.toggle("is-open", open);
      els.filtersToggle.setAttribute("aria-expanded", String(open));
    });
  }

  if (els.error) els.error.hidden = true;

  renderFilters();
  syncControls();
  render();

  return { resetAll, selectMechanism, openCase, state };
}
