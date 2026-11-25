const scanner = document.querySelector(".scanner");
const stage = scanner.querySelector(".scanner-stage");
const tablist = scanner.querySelector(".scanner-tabs");
const reports = [...tablist.querySelectorAll("button")].map((button) => ({
  button,
  key: button.dataset.report,
  panel: document.getElementById(`scanner-report-${button.dataset.report}`),
}));

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const precisePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");
const restingGaze = [
  { x: -1.45, y: 2.5 },
  { x: 0, y: 2.5 },
  { x: 1.45, y: 2.5 },
];
let activeIndex = 0;
let frame = 0;
let x = 0;
let y = 0;
let goal = restingGaze[0];

function animateGaze() {
  x += (goal.x - x) * 0.23;
  y += (goal.y - y) * 0.23;
  const settled = Math.abs(goal.x - x) < 0.05 && Math.abs(goal.y - y) < 0.05;
  const gazeX = settled ? goal.x : x;
  const gazeY = settled ? goal.y : y;
  stage.style.setProperty("--gaze-x", `${gazeX}px`);
  stage.style.setProperty("--gaze-y", `${gazeY}px`);
  stage.style.setProperty("--tilt-x", `${gazeY * -0.29}deg`);
  stage.style.setProperty("--tilt-y", `${gazeX * 0.31}deg`);
  frame = settled ? 0 : requestAnimationFrame(animateGaze);
}

function lookAt(target) {
  if (reducedMotion.matches || !precisePointer.matches) return;
  goal = target;
  if (!frame) frame = requestAnimationFrame(animateGaze);
}

function showReport(index) {
  activeIndex = index;
  scanner.dataset.report = reports[index].key;
  reports.forEach(({ button, panel }, reportIndex) => {
    const selected = reportIndex === index;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  });
  lookAt(restingGaze[activeIndex]);
}

tablist.setAttribute("role", "tablist");
for (const [index, { button, panel }] of reports.entries()) {
  button.setAttribute("role", "tab");
  button.setAttribute("aria-controls", panel.id);
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", button.id);
  panel.tabIndex = 0;
  button.addEventListener("click", () => showReport(index));
}
showReport(0);
scanner.classList.add("is-ready");

tablist.addEventListener("keydown", (event) => {
  const offsets = { ArrowLeft: -1, ArrowRight: 1 };
  let next = activeIndex;
  if (event.key in offsets) next = (next + offsets[event.key] + reports.length) % reports.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = reports.length - 1;
  else return;
  event.preventDefault();
  showReport(next);
  reports[next].button.focus();
});

let bounds;
const updateBounds = () => { bounds = null; };
new ResizeObserver(updateBounds).observe(stage);
addEventListener("scroll", updateBounds, { passive: true });
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" || reducedMotion.matches || !precisePointer.matches) return;
  bounds ??= stage.getBoundingClientRect();
  const horizontal = (event.clientX - bounds.left) / bounds.width - 0.27;
  const vertical = (event.clientY - bounds.top) / bounds.height - 0.52;
  const magnitude = Math.max(1, Math.hypot(horizontal * 2, vertical * 2));
  lookAt({ x: (horizontal * 10) / magnitude, y: (vertical * 9) / magnitude });
});
stage.addEventListener("pointerleave", () => lookAt(restingGaze[activeIndex]));
function resetMotion() {
  cancelAnimationFrame(frame);
  frame = 0;
  x = 0;
  y = 0;
  for (const property of ["--gaze-x", "--gaze-y", "--tilt-x", "--tilt-y"]) {
    stage.style.removeProperty(property);
  }
  lookAt(restingGaze[activeIndex]);
}

reducedMotion.addEventListener("change", resetMotion);
precisePointer.addEventListener("change", resetMotion);
