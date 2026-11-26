/* Движение Люпы: только в ответ на указатель, фокус и выбор источника. */

const MOOD_OFFSETS = {
  idle: ["0px", "0px"],
  E: ["-8px", "4px"],
  S: ["0px", "-6px"],
  G: ["8px", "4px"],
};

let started = false;

export function initStory() {
  if (started) return;
  started = true;

  const lupa = document.getElementById("lupa");
  const stage = document.querySelector(".hero__stage");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const precise = matchMedia("(any-hover: hover) and (any-pointer: fine)");

  function setMood(mood) {
    if (!lupa) return;
    const [x, y] = MOOD_OFFSETS[mood] || MOOD_OFFSETS.idle;
    lupa.dataset.mood = mood;
    lupa.style.setProperty("--pupil-x", x);
    lupa.style.setProperty("--pupil-y", y);
  }

  for (const card of document.querySelectorAll(".source-card")) {
    const key = card.dataset.category;
    card.addEventListener("pointerenter", () => setMood(key));
    card.addEventListener("focus", () => setMood(key));
    card.addEventListener("click", () => setMood(key));
  }

  if (!stage || reduced.matches || !precise.matches) return;

  let bounds = null;
  const resetBounds = () => { bounds = null; };
  new ResizeObserver(resetBounds).observe(stage);
  addEventListener("scroll", resetBounds, { passive: true });

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reduced.matches || !precise.matches) return;
    bounds ??= stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
    lupa?.style.setProperty("--pupil-x", `${x.toFixed(1)}px`);
    lupa?.style.setProperty("--pupil-y", `${y.toFixed(1)}px`);
  });

  stage.addEventListener("pointerleave", () => setMood("idle"));
  reduced.addEventListener("change", () => setMood("idle"));
}
