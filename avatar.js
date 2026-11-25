/* Подключение кадров из Blender. Пока флаг выключен, остаётся локальная SVG/DOM-заглушка. */

const FILES = {
  hero: "assets/avatar/hero-backdrop.webp",
  lupa: "assets/avatar/lupa.webp",
  e: "assets/avatar/portal-e.webp",
  s: "assets/avatar/portal-s.webp",
  g: "assets/avatar/portal-g.webp",
  report: "assets/avatar/report-sheet.webp",
  result: "assets/avatar/result-map.webp",
  outro: "assets/avatar/outro.webp",
};

export async function initAvatar() {
  let flags;
  try {
    const response = await fetch("assets/avatar/manifest.json", { cache: "no-store" });
    if (!response.ok) return;
    flags = await response.json();
  } catch {
    return;
  }

  for (const [key, file] of Object.entries(FILES)) {
    if (!flags[key]) continue;
    document.body.classList.add(`avatar-${key}`);

    if (key === "lupa") {
      for (const host of document.querySelectorAll(".lupa, .map-stage__lupa")) {
        const image = document.createElement("img");
        image.className = "lupa__photo";
        image.src = file;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.decoding = "async";
        host.append(image);
      }
    }
    if (key === "report") {
      const paper = document.querySelector(".map-stage__paper");
      if (paper) paper.src = file;
    }
  }
}
