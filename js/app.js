import {
  CELL_PSI,
  MAX_CONCENTRATION,
  concentrationToPotential,
  potentialToConcentration,
  createTrial,
  advanceTrial,
  outcome,
} from "./model.js";
import { translate } from "./i18n.js";
import { drawChamber } from "./renderer.js";
import { setupExtension } from "./extension.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const minimumPotential = Number(
  concentrationToPotential(MAX_CONCENTRATION).toFixed(1),
);
let language = "en";
try {
  language = localStorage.getItem("osmosis-language") === "zh" ? "zh" : "en";
} catch {
  /* Storage is optional. */
}
let cell = "plant",
  concentration = 5,
  prediction = null,
  errorKey = null;
let state = createTrial(cell, concentration);
let before = { ...state };
let histories = [];
try {
  const stored = JSON.parse(sessionStorage.getItem("osmosis-trials") || "[]");
  if (Array.isArray(stored))
    histories = stored
      .filter(
        (row) =>
          ["plant", "animal"].includes(row.cell) &&
          ["hypo", "iso", "hyper"].includes(row.tone) &&
          Number.isFinite(row.concentration) &&
          Number.isFinite(row.volume) &&
          row.volume > 0 &&
          Number.isFinite(row.solutionPsi),
      )
      .slice(-12);
} catch {
  /* Start with an empty notebook when storage is unavailable. */
}
const t = (key, parameters) => translate(language, key, parameters);
const format = (value, digits = 1) =>
  new Intl.NumberFormat(language === "zh" ? "zh-HK" : "en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
    .format(Math.abs(value) < 0.00001 ? 0 : value)
    .replace("-", "−");
const movementKey = (trial) =>
  trial.tone === "hypo" ? "in" : trial.tone === "hyper" ? "out" : "none";
const statusKey = (trial) =>
  trial.status === "complete"
    ? trial.burst
      ? "ruptured"
      : "equilibrium"
    : trial.status;

function paintSymbol(element, type) {
  const paths = {
    in: "M5 5L19 19M8 19H19V8",
    out: "M5 19L19 5M8 5H19V16",
    both: "M3 8H21M16 3L21 8L16 13M21 17H3M8 12L3 17L8 22",
    play: "M7 4L21 12L7 20Z",
    pause: "M8 4V20M17 4V20",
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[type]);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", type === "pause" ? "3" : "1.7");
  path.setAttribute("fill", type === "play" ? "currentColor" : "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  element.replaceChildren(svg);
}

function showActivity(extended) {
  if (extended && state.status === "running") {
    state.status = "paused";
    renderUI();
  }
  $("#core-lab").hidden = extended;
  $("#extension-study").hidden = !extended;
  $("#core-button").setAttribute("aria-pressed", String(!extended));
  $("#extension-button").setAttribute("aria-pressed", String(extended));
}
const extension = setupExtension({ t, returnToLab: () => showActivity(false) });
$("#extension-button").addEventListener("click", () => showActivity(true));
$("#core-button").addEventListener("click", () => showActivity(false));

function syncInputs(source) {
  if (source !== "concentration")
    $("#concentration").value = Number(concentration.toFixed(3));
  $("#concentration-range").value = concentration;
  if (source !== "potential")
    $("#potential").value = Number(
      concentrationToPotential(concentration).toFixed(1),
    );
  $("#potential").min = minimumPotential;
}
function prepareTrial(source) {
  state = createTrial(cell, concentration);
  before = { ...state };
  prediction = null;
  errorKey = null;
  syncInputs(source);
  renderUI();
}
function setConcentration(value, source) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_CONCENTRATION) {
    errorKey = source === "potential" ? "errorPotential" : "errorConcentration";
    renderUI();
    return;
  }
  concentration = value;
  prepareTrial(source);
}
function showError() {
  $("#input-error").hidden = !errorKey;
  $("#input-error").textContent = errorKey
    ? t(errorKey, { min: format(minimumPotential) })
    : "";
  $("#concentration").setAttribute(
    "aria-invalid",
    String(errorKey === "errorConcentration"),
  );
  $("#potential").setAttribute(
    "aria-invalid",
    String(errorKey === "errorPotential"),
  );
}

function renderLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
  document.title =
    language === "zh" ? "滲透實驗室 · Osmosis Lab" : "Osmosis Lab · 滲透實驗室";
  $$("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  $("#language-button").replaceChildren(
    document.createTextNode(language === "en" ? "繁體中文 " : "English "),
    Object.assign(document.createElement("span"), { textContent: "⇄" }),
  );
  $("#language-button").setAttribute("aria-label", t("languageSwitch"));
  $("#language-button").lang = language === "en" ? "zh-Hant" : "en";
  $("#close-guide").setAttribute("aria-label", t("closeGuide"));
  $("#concentration-range").setAttribute("aria-label", t("rangeLabel"));
  $("#speed").setAttribute("aria-label", t("animationSpeed"));
  $(".header-actions").setAttribute("aria-label", t("chamberTools"));
  $(".control-card").setAttribute("aria-label", t("controlLabel"));
  $(".observation-column").setAttribute("aria-label", t("observationLabel"));
  $(".brand").setAttribute("aria-label", t("brand"));
  $(".activity-nav").setAttribute("aria-label", t("activitiesLabel"));
  paintSymbol($(".note-icon"), "out");
  for (const [prediction, symbol] of [
    ["in", "in"],
    ["out", "out"],
    ["none", "both"],
  ])
    paintSymbol(
      $(`[data-prediction="${prediction}"] > span:first-child`),
      symbol,
    );
  extension.updateLanguage();
  renderUI();
  renderNotebook();
}

function renderUI() {
  const inProgress = ["running", "paused"].includes(state.status);
  $$("[data-cell]").forEach((button) => {
    const selected = button.dataset.cell === cell;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = inProgress;
  });
  $$(
    "[data-preset], [data-prediction], #concentration, #concentration-range, #potential",
  ).forEach((element) => {
    element.disabled = inProgress;
  });
  $$("[data-prediction]").forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.prediction === prediction),
    ),
  );
  const small = document.createElement("small");
  small.textContent = "kPa";
  $("#initial-potential").replaceChildren(
    document.createTextNode(format(state.initialPsi) + " "),
    small,
  );
  $(".fixed-pill").textContent = t(
    state.isRecovery ? "continuingValue" : "presetValue",
  );
  const startKey =
    state.status === "running"
      ? "pause"
      : state.status === "paused"
        ? "resume"
        : state.status === "complete"
          ? "runAgain"
          : "start";
  $("#start-label").textContent = t(startKey);
  paintSymbol(
    $("#start-symbol"),
    state.status === "running" ? "pause" : "play",
  );
  $("#start-button").disabled = Boolean(errorKey);
  $("#status").textContent = t(statusKey(state));
  $("#status").classList.toggle("running", state.status === "running");
  $("#after-tag").textContent = t(inProgress ? "during" : "after");
  $("#after-description").textContent = t(
    state.status === "ready"
      ? "awaitingStart"
      : inProgress
        ? "watching"
        : "finalState",
  );
  $$(".chamber-metric > span").forEach((element) => {
    element.textContent = t(cell === "plant" ? "plantVolume" : "cellVolume");
  });
  $("#before-volume").textContent = before.volume.toFixed(2) + "×";
  $("#after-volume").textContent = state.volume.toFixed(2) + "×";
  let flow =
    state.status === "ready"
      ? "pressStart"
      : state.status === "complete"
        ? state.burst
          ? "membraneBroken"
          : "balanced"
        : movementKey(state);
  $("#flow-text").textContent = t(flow);
  paintSymbol(
    $("#flow-symbol"),
    state.status === "complete" ||
      state.tone === "iso" ||
      state.status === "ready"
      ? "both"
      : state.tone === "hypo"
        ? "in"
        : "out",
  );
  $("#elapsed").textContent =
    `${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, "0")}`;
  $("#before-canvas").setAttribute(
    "aria-label",
    t("beforeAccessible", { cell: t(cell), volume: before.volume.toFixed(2) }),
  );
  $("#after-canvas").setAttribute(
    "aria-label",
    t("afterAccessible", {
      cell: t(cell),
      volume: state.volume.toFixed(2),
      status: t(statusKey(state)),
    }),
  );
  $("#result-card").hidden = state.status !== "complete";
  $("#result-placeholder").hidden = state.status === "complete";
  if (state.status === "complete") renderConclusion();
  showError();
}

function renderConclusion() {
  $("#result-card").className = "result-card " + state.tone;
  $("#result-heading").textContent = t(state.tone);
  paintSymbol(
    $("#result-icon"),
    state.tone === "hypo" ? "in" : state.tone === "hyper" ? "out" : "both",
  );
  const points = [
    t(state.tone + "Relation", {
      solution: format(state.solutionPsi),
      cell: format(state.initialPsi),
    }),
    t(state.tone + "Movement"),
    t(outcome(state) + "Description"),
  ];
  $("#conclusion").replaceChildren(
    ...points.map((point) =>
      Object.assign(document.createElement("li"), { textContent: point }),
    ),
  );
  $("#prediction-feedback").hidden = !prediction;
  const expected = movementKey(state);
  $("#prediction-feedback").textContent = !prediction
    ? ""
    : prediction === expected
      ? t("predictionCorrect")
      : t("predictionIncorrect", {
          prediction: t(prediction),
          actual: t(expected),
        });
  const canRecover = cell === "plant" && state.volume < 0.99;
  $("#recovery-button").hidden = !canRecover;
  $("#recovery-note").hidden = !canRecover;
}

function renderNotebook() {
  $("#notebook-empty").hidden = histories.length > 0;
  $("#notebook-table-wrap").hidden = histories.length === 0;
  $("#clear-trials").disabled = histories.length === 0;
  $("#trials-body").replaceChildren(
    ...histories.map((trial, index) => {
      const row = document.createElement("tr");
      const values = [
        String(index + 1).padStart(2, "0"),
        t(trial.isRecovery ? "notebookRecovery" : trial.cell),
        `${format(trial.concentration, 2)}% · ${t(trial.tone)}`,
        `${format(trial.solutionPsi)} kPa`,
        t(movementKey(trial)),
        t(outcome(trial)),
      ];
      row.replaceChildren(
        ...values.map((value) =>
          Object.assign(document.createElement("td"), { textContent: value }),
        ),
      );
      return row;
    }),
  );
}
function saveNotebook() {
  try {
    sessionStorage.setItem("osmosis-trials", JSON.stringify(histories));
  } catch {
    /* The notebook works in memory as well. */
  }
}
function completeTrial() {
  histories.push({ ...state });
  histories = histories.slice(-12);
  saveNotebook();
  renderNotebook();
  renderUI();
}

$$("[data-cell]").forEach((button) =>
  button.addEventListener("click", () => {
    cell = button.dataset.cell;
    prepareTrial();
  }),
);
$("#concentration").addEventListener("input", (event) => {
  setConcentration(event.target.valueAsNumber, "concentration");
});
$("#concentration-range").addEventListener("input", (event) => {
  setConcentration(Number(event.target.value), "range");
});
$("#potential").addEventListener("input", (event) => {
  const value = event.target.valueAsNumber;
  if (!Number.isFinite(value) || value > 0 || value < minimumPotential) {
    errorKey = "errorPotential";
    renderUI();
    return;
  }
  setConcentration(
    Math.min(MAX_CONCENTRATION, potentialToConcentration(value)),
    "potential",
  );
});
$$("[data-preset]").forEach((button) =>
  button.addEventListener("click", () => {
    setConcentration(
      button.dataset.preset === "water"
        ? 0
        : button.dataset.preset === "strong"
          ? 20
          : potentialToConcentration(CELL_PSI),
      "preset",
    );
  }),
);
$$("[data-prediction]").forEach((button) =>
  button.addEventListener("click", () => {
    if (state.status === "complete") prepareTrial();
    prediction =
      prediction === button.dataset.prediction
        ? null
        : button.dataset.prediction;
    renderUI();
  }),
);
$("#start-button").addEventListener("click", () => {
  if (errorKey) return;
  if (state.status === "running") state.status = "paused";
  else if (state.status === "paused") state.status = "running";
  else {
    if (state.status === "complete") {
      state = createTrial(cell, concentration);
      before = { ...state };
    }
    state.status = "running";
  }
  renderUI();
});
$("#reset-button").addEventListener("click", () => prepareTrial());
$("#recovery-button").addEventListener("click", () => {
  const currentVolume = state.volume;
  concentration = 0;
  prediction = null;
  errorKey = null;
  state = {
    ...createTrial("plant", 0, currentVolume),
    isRecovery: true,
    status: "running",
  };
  before = { ...state, status: "ready" };
  syncInputs();
  renderUI();
});
$("#clear-trials").addEventListener("click", () => {
  histories = [];
  saveNotebook();
  renderNotebook();
});
$("#language-button").addEventListener("click", () => {
  language = language === "en" ? "zh" : "en";
  try {
    localStorage.setItem("osmosis-language", language);
  } catch {
    /* Language switching does not require storage. */
  }
  renderLanguage();
});
$("#help-button").addEventListener("click", () =>
  $("#guide-dialog").showModal(),
);
for (const button of ["#close-guide", "#guide-done"])
  $(button).addEventListener("click", () => $("#guide-dialog").close());
$("#guide-dialog").addEventListener("click", (event) => {
  if (event.target === $("#guide-dialog")) {
    const r = event.target.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      event.target.close();
  }
});

syncInputs();
renderLanguage();
let previousTime = 0,
  visualTime = 0,
  lastUIUpdate = 0;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
function frame(now) {
  const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.06) : 0;
  previousTime = now;
  if (state.status !== "paused" && !reduceMotion.matches)
    visualTime += dt * Number($("#speed").value);
  if (state.status === "running") {
    state = advanceTrial(state, dt * Number($("#speed").value));
    if (state.status === "complete") completeTrial();
    else if (now - lastUIUpdate > 180) {
      renderUI();
      lastUIUpdate = now;
    }
  }
  if (!document.hidden) {
    const options = { time: visualTime, labels: $("#show-labels").checked, t };
    drawChamber($("#before-canvas"), before, { ...options, active: false });
    drawChamber($("#after-canvas"), state, {
      ...options,
      active: state.status !== "ready",
    });
    extension.tick(dt, now / 1000);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
