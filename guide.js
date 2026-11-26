/* Люпа-проводник: реплики привязаны к разделам, маскот движется вместе с чтением. */

const STORAGE_KEY = "esg-mapper-guide";
const VOICE_KEY = "esg-mapper-guide-voice";
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
  const compact = matchMedia("(max-width: 979px)");

  const figure = node("div", { class: "guide__figure", "aria-hidden": "true" },
    node("img", { src: "assets/avatar/lupa.webp", alt: "", width: 84, height: 84, decoding: "async" }),
    node("span", { class: "guide__spark" })
  );
  const title = node("h3", { class: "guide__title", id: "guide-title" });
  const text = node("p", { class: "guide__text", id: "guide-text", "aria-live": "polite" });
  const dots = node("ol", { class: "guide__dots", id: "guide-dots", "aria-label": config.progress || "Маршрут" });
  const next = node("button", { class: "guide__next", id: "guide-next", type: "button" });
  const off = node("button", { class: "guide__off", id: "guide-off", type: "button", text: config.off || "Выключить" });
  const voice = node("button", {
    class: "guide__voice", id: "guide-voice", type: "button", "aria-pressed": "false",
  });
  const audio = node("audio", { id: "guide-audio", preload: "metadata" });
  const card = node("div", {
    class: "guide__card", id: "guide-card", role: "group",
    "aria-label": `${config.name || "Люпа"}. ${config.role || ""}`.trim(),
  },
    node("div", { class: "guide__head" },
      node("span", { class: "guide__name", text: config.name || "Люпа" }),
      node("span", { class: "guide__role", text: config.role || "" }),
      voice, off
    ),
    title, text,
    node("div", { class: "guide__foot" }, dots, next),
    audio
  );
  const root = node("div", { class: "guide", id: "guide", hidden: true }, figure, card);
  const launcher = node("button", {
    class: "guide-launcher", id: "guide-launcher", type: "button", hidden: true,
  },
    node("span", { class: "guide-launcher__dot", "aria-hidden": "true" }),
    node("span", { text: config.on || "Позвать Люпу" })
  );

  document.body.append(root, launcher);
  steps.forEach((step, index) => {
    const dot = node("button", {
      class: "guide__dot", type: "button", "aria-label": step.title || `Шаг ${index + 1}`,
      dataset: { guideStep: String(index) },
    });
    dot.addEventListener("click", () => goTo(index));
    dots.append(node("li", {}, dot));
  });

  let enabled = readPreference(STORAGE_KEY) !== "off";
  let voiceEnabled = readPreference(VOICE_KEY) === "on";
  let suspended = false;
  let index = -1;
  let frame = 0;
  let hopTimer = 0;

  function voiceFile(position) {
    return `assets/voice/guide-${String(position).padStart(2, "0")}.mp3`;
  }

  function stopVoice() {
    audio.pause();
    if (audio.getAttribute("src")) audio.currentTime = 0;
  }

  function syncVoiceButton() {
    const label = voiceEnabled ? config.voiceOff || "Выключить звук" : config.voiceOn || "Включить озвучку";
    voice.textContent = label;
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

  function place() {
    if (!enabled || suspended || compact.matches) return;
    const active = sections[index] || sections[0];
    if (!active) return;
    const bounds = active.getBoundingClientRect();
    const shell = active.querySelector(".shell")?.getBoundingClientRect() || bounds;
    const figureSize = 84;
    const cardWidth = Math.min(318, innerWidth - 28);
    const lane = index % 2 === 0 ? 0.88 : 0.12;
    const x = Math.min(Math.max(shell.left + shell.width * lane - figureSize / 2, 12), innerWidth - figureSize - 12);
    const y = Math.min(Math.max(bounds.top + Math.min(150, Math.max(80, bounds.height * 0.25)), 108), innerHeight - figureSize - 128);
    let cardLeft = x - cardWidth - 18;
    if (cardLeft < 14) cardLeft = x + figureSize + 12;
    cardLeft = Math.min(Math.max(cardLeft, 14), Math.max(14, innerWidth - cardWidth - 14));
    const cardTop = Math.min(Math.max(y - 24, 96), Math.max(96, innerHeight - 232));

    root.style.setProperty("--guide-x", `${Math.round(x)}px`);
    root.style.setProperty("--guide-y", `${Math.round(y)}px`);
    root.style.setProperty("--guide-card-x", `${Math.round(cardLeft)}px`);
    root.style.setProperty("--guide-card-y", `${Math.round(cardTop)}px`);
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
    next.dataset.target = step.target || "";
    [...dots.children].forEach((item, dotIndex) => {
      const button = item.firstElementChild;
      button.classList.toggle("is-active", dotIndex === index);
      if (dotIndex === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if ((changed || force) && !reduced.matches) {
      root.classList.remove("is-hopping");
      void figure.offsetWidth;
      root.classList.add("is-hopping");
      clearTimeout(hopTimer);
      hopTimer = setTimeout(() => root.classList.remove("is-hopping"), 700);
    }
    place();
    if (wasReady && (changed || force)) speak(index);
  }

  function goTo(position) {
    const target = document.getElementById(steps[position]?.target);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
  }

  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!enabled || suspended) return;
      render(currentIndex());
    });
  }

  next.addEventListener("click", () => goTo(index));
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
  addEventListener("resize", () => place(), { passive: true });
  compact.addEventListener("change", () => place());

  const dialog = document.getElementById("case-dossier");
  if (dialog) {
    const sync = () => {
      suspended = dialog.open;
      applyState();
      if (!suspended) place();
    };
    dialog.addEventListener("toggle", sync);
    dialog.addEventListener("close", sync);
  }

  syncVoiceButton();
  applyState();
  render(currentIndex());
  window.__esgGuide = {
    state: () => ({
      enabled, suspended, index, voiceEnabled,
      id: steps[index]?.id || "",
      target: steps[index]?.target || "",
      text: text.textContent,
      voiceLabel: voice.textContent,
      audio: {
        src: audio.getAttribute("src") || "",
        paused: audio.paused,
        currentTime: Number(audio.currentTime.toFixed(2)),
      },
    }),
  };
  return window.__esgGuide;
}
