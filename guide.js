/* Люпа-проводник: одна закреплённая карточка, ручное перемещение, без перелётов по странице. */

const STORAGE_KEY = "esg-mapper-guide";
const VOICE_KEY = "esg-mapper-guide-voice";
const POSITION_KEY = "esg-mapper-guide-position";
let started = false;

function node(tag, attrs = {}, ...children) {
  const item = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") item.className = value;
    else if (key === "text") item.textContent = value;
    else if (key === "dataset") Object.assign(item.dataset, value);
    else if (value === true) item.setAttribute(key, "");
    else item.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    item.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return item;
}

function icon(paths, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const item of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", typeof item === "string" ? item : item.d);
    if (typeof item !== "string" && item.class) path.setAttribute("class", item.class);
    svg.append(path);
  }
  return svg;
}

function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* приватный режим */ }
}

export function initGuide(data) {
  const config = data?.guide;
  if (!config || !Array.isArray(config.steps) || !config.steps.length) return null;
  if (started) return window.__esgGuide || null;
  started = true;

  const steps = config.steps;
  const sections = steps.map((step) => document.getElementById(step.id));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  const title = node("h3", { class: "guide__title", id: "guide-title" });
  const text = node("p", { class: "guide__text", id: "guide-text", "aria-live": "polite" });
  const dots = node("ol", { class: "guide__dots", id: "guide-dots", "aria-label": config.progress || "Маршрут" });
  const next = node("button", { class: "guide__next", id: "guide-next", type: "button" });

  const voiceLabel = node("span", { class: "visually-hidden" });
  const voice = node("button", {
    class: "guide__voice", id: "guide-voice", type: "button", "aria-pressed": "false",
    "aria-label": config.voiceOn || "Включить озвучку",
    title: config.voiceOn || "Включить озвучку",
  },
    icon([
      { d: "M4 9h3.5L13 4.8v14.4L7.5 15H4z", class: "guide__voice-body" },
      { d: "M16 9.2c1.1 1.6 1.1 4 0 5.6", class: "guide__voice-wave" },
      { d: "M18.6 6.8c2.2 2.8 2.2 7.6 0 10.4", class: "guide__voice-wave" },
      { d: "M3.2 3.2 20.8 20.8", class: "guide__voice-slash" },
    ], "guide__icon guide__icon--voice"),
    voiceLabel
  );
  const home = node("button", {
    class: "guide__home", id: "guide-home", type: "button",
    "aria-label": "В угол", title: "Вернуть Люпу в правый нижний угол",
  },
    icon([
      "M14 5h5v5",
      "M19 5l-7 7",
      "M10 19H5v-5",
      "M5 19l7-7",
    ], "guide__icon"),
    node("span", { class: "visually-hidden", text: "В угол" })
  );
  const off = node("button", {
    class: "guide__off", id: "guide-off", type: "button",
    "aria-label": config.off || "Выключить", title: config.off || "Выключить",
  },
    icon(["M6 6l12 12", "M18 6 6 18"], "guide__icon"),
    node("span", { class: "visually-hidden", text: config.off || "Выключить" })
  );
  const handle = node("div", {
    class: "guide__handle", id: "guide-handle", tabindex: "0", role: "button",
    "aria-label": "Перетащите Люпу или перемещайте стрелками",
    title: "Перетащите Люпу",
  },
    node("img", { class: "guide__avatar", src: "assets/avatar/lupa.webp", alt: "", width: 52, height: 52, decoding: "async" }),
    node("span", { class: "guide__grip", "aria-hidden": "true" },
      node("i", {}), node("i", {}), node("i", {}))
  );
  const audio = node("audio", { id: "guide-audio", preload: "metadata" });
  const card = node("div", {
    class: "guide__card", id: "guide-card", role: "group",
    "aria-label": `${config.name || "Люпа"}. ${config.role || ""}`.trim(),
  },
    node("div", { class: "guide__bubble" },
      node("div", { class: "guide__tools" }, voice, home, off),
      title, text,
      node("div", { class: "guide__foot" }, dots, next)
    ),
    handle,
    audio
  );
  const root = node("div", { class: "guide", id: "guide", hidden: true }, card);
  const launcher = node("button", {
    class: "guide-launcher", id: "guide-launcher", type: "button", hidden: true,
    "aria-label": config.on || "Позвать Люпу", title: config.on || "Позвать Люпу",
  },
    node("img", { class: "guide-launcher__face", src: "assets/avatar/lupa.webp", alt: "", width: 34, height: 34 }),
    node("span", { class: "visually-hidden", text: config.on || "Позвать Люпу" })
  );

  document.body.append(root, launcher);
  steps.forEach((step, position) => {
    const dot = node("button", {
      class: "guide__dot", type: "button", "aria-label": step.title || `Шаг ${position + 1}`,
      dataset: { guideStep: String(position) },
    });
    dot.addEventListener("click", () => goTo(step.id));
    dots.append(node("li", {}, dot));
  });

  let enabled = readPreference(STORAGE_KEY) !== "off";
  let voiceEnabled = readPreference(VOICE_KEY) === "on";
  let suspended = false;
  let index = -1;
  let scrollLockUntil = 0;
  let drag = null;

  function voiceFile(position) {
    return `assets/voice/guide-${String(position).padStart(2, "0")}.mp3`;
  }

  function stopVoice() {
    audio.pause();
    if (audio.getAttribute("src")) audio.currentTime = 0;
  }

  function syncVoiceButton() {
    const label = voiceEnabled ? config.voiceOff || "Выключить звук" : config.voiceOn || "Включить озвучку";
    voiceLabel.textContent = label;
    voice.setAttribute("aria-label", label);
    voice.setAttribute("title", label);
    voice.setAttribute("aria-pressed", String(voiceEnabled));
  }

  function speak(position, { restart = false } = {}) {
    if (!voiceEnabled || !enabled || suspended) return;
    const file = voiceFile(position);
    if (restart || audio.getAttribute("src") !== file) {
      audio.src = file;
      audio.load();
    }
    const played = audio.play();
    if (played?.catch) played.catch(() => { /* браузер может заблокировать автозапуск */ });
  }

  function applyState() {
    root.hidden = !enabled || suspended;
    launcher.hidden = enabled || suspended;
    if (root.hidden) stopVoice();
  }

  function currentIndex() {
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) return steps.length - 1;
    const line = innerHeight * 0.42;
    let found = 0;
    sections.forEach((section, position) => {
      if (section && section.getBoundingClientRect().top <= line) found = position;
    });
    return found;
  }

  function render(position, { force = false } = {}) {
    const nextIndex = Math.min(Math.max(position, 0), steps.length - 1);
    const changed = nextIndex !== index;
    if (!changed && !force) return;
    const wasReady = index >= 0;
    index = nextIndex;
    const step = steps[index];
    title.textContent = step.title || "";
    text.textContent = step.text || "";
    next.textContent = step.action || config.next || "Дальше";
    [...dots.children].forEach((item, dotIndex) => {
      const button = item.firstElementChild;
      button.classList.toggle("is-active", dotIndex === index);
      if (dotIndex === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (wasReady && (changed || force)) speak(index);
  }

  function goTo(sectionId, { lock = true } = {}) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const position = steps.findIndex((step) => step.id === sectionId);
    if (position >= 0) render(position);
    if (lock) scrollLockUntil = performance.now() + (reduced.matches ? 60 : 900);
    target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
  }

  function onScroll() {
    if (!enabled || suspended || performance.now() < scrollLockUntil) return;
    render(currentIndex());
  }

  /* Перетаскивание карточки за шапку; стрелки работают без мыши. */
  function clampPosition(left, top) {
    const rect = card.getBoundingClientRect();
    return {
      left: Math.min(Math.max(left, 8), Math.max(8, innerWidth - rect.width - 8)),
      top: Math.min(Math.max(top, 68), Math.max(68, innerHeight - rect.height - 8)),
    };
  }

  function setPosition(left, top, save = false) {
    const safe = clampPosition(left, top);
    card.dataset.dragged = "true";
    card.style.left = `${Math.round(safe.left)}px`;
    card.style.top = `${Math.round(safe.top)}px`;
    card.style.right = "auto";
    card.style.bottom = "auto";
    if (save) writePreference(POSITION_KEY, JSON.stringify(safe));
  }

  function resetPosition() {
    delete card.dataset.dragged;
    card.style.left = "";
    card.style.top = "";
    card.style.right = "";
    card.style.bottom = "";
    writePreference(POSITION_KEY, "default");
  }

  function restorePosition() {
    let stored = null;
    try { stored = JSON.parse(readPreference(POSITION_KEY) || "null"); } catch { stored = null; }
    if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) {
      setPosition(stored.left, stored.top);
    }
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    const rect = card.getBoundingClientRect();
    drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    handle.setPointerCapture(event.pointerId);
    card.classList.add("is-dragging");
  });
  handle.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    setPosition(event.clientX - drag.dx, event.clientY - drag.dy);
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const rect = card.getBoundingClientRect();
    drag = null;
    card.classList.remove("is-dragging");
    setPosition(rect.left, rect.top, true);
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);
  handle.addEventListener("keydown", (event) => {
    const rect = card.getBoundingClientRect();
    const step = event.shiftKey ? 32 : 12;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      setPosition(rect.left + moves[event.key][0], rect.top + moves[event.key][1], true);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetPosition();
    }
  });
  home.addEventListener("click", resetPosition);

  next.addEventListener("click", () => {
    const forward = (index + 1) % steps.length;
    goTo(steps[forward].id);
  });
  voice.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    writePreference(VOICE_KEY, voiceEnabled ? "on" : "off");
    syncVoiceButton();
    if (voiceEnabled) speak(index, { restart: true });
    else stopVoice();
  });
  off.addEventListener("click", () => {
    enabled = false;
    writePreference(STORAGE_KEY, "off");
    applyState();
    launcher.focus({ preventScroll: true });
  });
  launcher.addEventListener("click", () => {
    enabled = true;
    writePreference(STORAGE_KEY, "on");
    applyState();
    render(currentIndex(), { force: true });
    off.focus({ preventScroll: true });
  });
  addEventListener("scroll", onScroll, { passive: true });
  /* Резервный опрос: instant-прокрутка в некоторых браузерах не шлёт scroll. */
  setInterval(() => {
    if (!enabled || suspended || performance.now() < scrollLockUntil) return;
    render(currentIndex());
  }, 100);
  addEventListener("resize", () => {
    if (card.dataset.dragged) {
      const rect = card.getBoundingClientRect();
      setPosition(rect.left, rect.top, true);
    }
  }, { passive: true });

  const dialog = document.getElementById("case-dossier");
  if (dialog) {
    const sync = () => {
      suspended = dialog.open;
      applyState();
    };
    dialog.addEventListener("toggle", sync);
    dialog.addEventListener("close", sync);
  }

  syncVoiceButton();
  restorePosition();
  applyState();
  render(currentIndex());
  window.__esgGuide = {
    state: () => ({
      enabled, suspended, index, voiceEnabled,
      id: steps[index]?.id || "",
      target: steps[index]?.target || "",
      text: text.textContent,
      voiceLabel: voice.textContent,
      position: card.dataset.dragged === "true" ? "dragged" : "corner",
      audio: {
        src: audio.getAttribute("src") || "",
        paused: audio.paused,
        currentTime: Number(audio.currentTime.toFixed(2)),
      },
    }),
  };
  return window.__esgGuide;
}
