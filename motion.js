/* Оживление атласа: прогресс пути, вход в кадр, параллакс и «запись» строки. */

let started = false;

export function initMotion() {
  if (started) return;
  started = true;

  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("has-motion");

  // Тонкая нить прогресса под шапкой.
  const progress = document.querySelector(".scroll-progress");
  if (progress) {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      progress.style.width = `${value.toFixed(2)}%`;
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    if ("ResizeObserver" in window) {
      new ResizeObserver(update).observe(document.body);
    }
    update();
  }

  // Декоративные петли работают только в видимой части страницы.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-inview", entry.isIntersecting);
        }
      },
      { threshold: 0.12 }
    );
    for (const section of document.querySelectorAll(".act, .footer")) observer.observe(section);
  } else {
    for (const section of document.querySelectorAll(".act, .footer")) section.classList.add("is-inview");
  }

  if (reduced) return;

  // Лёгкий параллакс внутри фото мостов: изображение остаётся на месте, сдвигается только крупный план.
  for (const media of document.querySelectorAll(".bridge__media")) {
    const image = media.querySelector("img");
    if (!image) continue;
    media.addEventListener("pointermove", (event) => {
      const rect = media.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
      image.style.setProperty("--px", `${x.toFixed(1)}px`);
      image.style.setProperty("--py", `${y.toFixed(1)}px`);
    });
    media.addEventListener("pointerleave", () => {
      image.style.setProperty("--px", "0px");
      image.style.setProperty("--py", "0px");
    });
  }

  // Когда каталог меняет заголовок сцены, линия отчёта «записывается» заново.
  const title = document.getElementById("stage-title");
  const line = document.querySelector(".stage-reportline");
  if (title && line && "MutationObserver" in window) {
    let timer;
    new MutationObserver(() => {
      line.classList.remove("is-writing");
      void line.offsetWidth;
      line.classList.add("is-writing");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => line.classList.remove("is-writing"), 1400);
    }).observe(title, { childList: true, characterData: true, subtree: true });
  }
}
