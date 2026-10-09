import { extensionView } from "./extension-view.js";
import {
  SALINE_PSI,
  createExtensionCell,
  advanceExtensionCell,
  extensionPotential,
} from "./extension-model.js";
import { SIMULATION_SPEED } from "./settings.js";
import { drawChamber } from "./renderer.js";
import { conclusionPoint } from "./conclusion.js";

export function setupExtension({ t, returnToLab }) {
  const root = document.querySelector("#extension-study");
  root.innerHTML = extensionView;
  const $ = (selector) => root.querySelector(selector);
  let step = 1,
    paused = false,
    finished = false,
    testStarted = false;
  let a = createExtensionCell("A"),
    other = createExtensionCell("B");
  let results = {},
    lastRender = 0,
    feedbackShown = false,
    animationTime = 0,
    particleEpoch = 0;
  let visitedSteps = new Set([1]);
  const signedChange = (current) => {
    const change = (current.volume - 1) * 100;
    return Math.abs(change) < 0.005
      ? "0.00"
      : change > 0
        ? "+" + change.toFixed(2)
        : change.toFixed(2).replace("-", "−");
  };
  const hypothesisReady = () =>
    Boolean($("#compare-psi-a").value && $("#compare-psi-b").value);
  const cellObservation = (current) =>
    t(
      current.direction === "none"
        ? "unchanged"
        : current.direction === "in"
          ? "slightSwelling"
          : "shrinkingObservation",
      { change: Math.abs((current.volume - 1) * 100).toFixed(2) },
    );
  function prepareHypothesis() {
    a = createExtensionCell("A", $("#compare-psi-a").value || "equal");
    other = createExtensionCell("B", $("#compare-psi-b").value || "equal");
    results = {};
    finished = false;
    testStarted = false;
    paused = false;
    animationTime = 0;
    particleEpoch++;
    render();
  }

  function goTo(number) {
    if (step === 2 && number !== 2 && testStarted && !finished) paused = true;
    step = number;
    visitedSteps.add(number);
    render();
  }
  function startTest() {
    if (!hypothesisReady()) {
      goTo(1);
      return;
    }
    particleEpoch++;
    a = {
      ...createExtensionCell("A", $("#compare-psi-a").value),
      status: "running",
    };
    other = {
      ...createExtensionCell("B", $("#compare-psi-b").value),
      status: "running",
    };
    paused = false;
    finished = false;
    testStarted = true;
    animationTime = 0;
    goTo(2);
    $("#extension-step-2").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function render() {
    for (let i = 1; i <= 3; i++) {
      $(`#extension-step-${i}`).hidden = step !== i;
      const item = root.querySelector(`[data-step="${i}"]`);
      item.classList.toggle("completed", visitedSteps.has(i) && i !== step);
      if (i === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const button = item.querySelector("button");
      if (i === step) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
    $("#micrograph-image").setAttribute("aria-label", t("micrographAlt"));
    $(".extension-steps").setAttribute("aria-label", t("extensionProgress"));
    $("#extension-next-1").disabled = !hypothesisReady();
    $("#extension-hypothesis-required").hidden = hypothesisReady();
    $("#extension-test-card").hidden = !hypothesisReady();
    for (const name of ["a", "b"]) {
      const select = $(`#compare-psi-${name}`);
      for (const [relation, key] of [
        ["higher", "higherThanSaline"],
        ["lower", "lowerThanSaline"],
        ["equal", "equalToSaline"],
      ]) {
        select.querySelector(`[value="${relation}"]`).title = t(key);
      }
    }
    $("#extension-test-heading").textContent = t("abTestTitle");
    $("#extension-cell-other").textContent = t("cellB");
    for (const [name, current] of [
      ["a", a],
      ["other", other],
    ]) {
      $(`#extension-initial-${name}`).textContent =
        `Ψ₀ = ${current.initialPsi.toFixed(0).replace("-", "−")} kPa ${t("presetValue")}`;
    }
    $("#extension-pause").textContent = t(
      !testStarted
        ? "testHypothesis"
        : finished
          ? "replayTest"
          : paused
            ? "resumeShort"
            : "pauseShort",
    );
    $("#extension-test-result").hidden = !finished;
    for (const [name, current] of [
      ["a", a],
      ["other", other],
    ]) {
      $(`#extension-volume-${name}`).textContent = t("volumeChange", {
        change: signedChange(current),
      });
      $(`#extension-flow-${name}`).textContent = t(
        current.status === "complete" ? "balanced" : current.direction,
      );
      $(`#extension-canvas-${name}`).setAttribute(
        "aria-label",
        t("extensionCanvasAlt", {
          cell: t("cell" + current.name),
          psi: current.initialPsi.toFixed(0).replace("-", "−"),
          volume: current.volume.toFixed(4),
          direction: t(current.direction),
        }),
      );
    }
    if (finished) {
      $("#extension-result-title").textContent = t("hypothesisResultsTitle");
      const points = [a, other].map((current) => [
        current.direction === "none"
          ? "hypothesisEqualResult"
          : current.direction === "out"
            ? "hypothesisHigherResult"
            : "hypothesisLowerResult",
        {
          cell: t("cell" + current.name),
          psi: current.initialPsi.toFixed(0).replace("-", "−"),
          change: Math.abs((current.volume - 1) * 100).toFixed(2),
        },
      ]);
      points.push(["finalEquilibriumNote"]);
      $("#extension-result-points").replaceChildren(
        ...points.map(([key, parameters]) =>
          conclusionPoint(key, t, parameters),
        ),
      );
      renderPhotoComparison($("#extension-photo-comparison"), [a, other]);
    }
    if (step === 3) renderSummary();
    if (feedbackShown) checkExplanation();
  }
  function renderPhotoComparison(container, cells) {
    container.replaceChildren(
      ...cells.map((current) => {
        const matched =
          current.direction === (current.name === "A" ? "none" : "out");
        const line = document.createElement("p");
        line.dataset.matchesPhoto = String(matched);
        line.textContent = t("photoComparison", {
          cell: t("cell" + current.name),
          observed: t(current.name === "A" ? "unchanged" : "wrinkled"),
          simulated: cellObservation(current),
          assessment: t(
            matched ? "hypothesisMatchesPhoto" : "hypothesisDiffersPhoto",
          ),
        });
        return line;
      }),
    );
  }
  function renderSummary() {
    $("#extension-review-note").hidden = !!results.B;
    renderPhotoComparison(
      $("#extension-summary-comparison"),
      ["A", "B"].filter((name) => results[name]).map((name) => results[name]),
    );
    $("#extension-summary-body").replaceChildren(
      ...["A", "B"]
        .filter((name) => results[name])
        .map((name) => {
          const current = results[name],
            row = document.createElement("tr");
          const values = [
            t("cell" + name),
            current.initialPsi.toFixed(0).replace("-", "−"),
            t(
              current.direction === "none"
                ? "iso"
                : current.direction === "in"
                  ? "hypo"
                  : "hyper",
            ),
            t(current.direction),
            cellObservation(current),
          ];
          row.replaceChildren(
            ...values.map((text) =>
              Object.assign(document.createElement("td"), {
                textContent: text,
              }),
            ),
          );
          return row;
        }),
    );
  }
  function checkExplanation() {
    feedbackShown = true;
    const a = $("#infer-a").value,
      b = $("#infer-b").value;
    const box = $("#extension-final-feedback");
    box.hidden = false;
    if (!a || !b) {
      box.textContent = t("chooseBothInferences");
      box.dataset.correct = "false";
      return;
    }
    const correct = a === "equal" && b === "higher";
    box.dataset.correct = String(correct);
    box.replaceChildren(
      Object.assign(document.createElement("strong"), {
        textContent: t(correct ? "correctExplanation" : "revisitExplanation"),
      }),
      ...["inferAAnswer", "inferBAnswer", "relativeTonicity"].map((key) =>
        conclusionPoint(key, t, {}, "p"),
      ),
    );
  }
  function reset() {
    step = 1;
    visitedSteps = new Set([1]);
    paused = false;
    finished = false;
    testStarted = false;
    particleEpoch++;
    animationTime = 0;
    results = {};
    feedbackShown = false;
    a = createExtensionCell("A");
    other = createExtensionCell("B");
    for (const selector of [
      "#compare-psi-a",
      "#compare-psi-b",
      "#infer-a",
      "#infer-b",
    ])
      $(selector).value = "";
    $("#extension-final-feedback").hidden = true;
    render();
  }
  $("#extension-next-1").addEventListener("click", startTest);
  for (const name of ["a", "b"])
    $("#compare-psi-" + name).addEventListener("change", prepareHypothesis);
  $("#extension-revise-hypothesis").addEventListener("click", () => goTo(1));
  $("#extension-revise-summary").addEventListener("click", () => goTo(1));
  $("#extension-to-hypothesis").addEventListener("click", () => goTo(1));
  $("#extension-to-explain").addEventListener("click", () => goTo(3));
  $("#extension-check").addEventListener("click", checkExplanation);
  $("#extension-reset").addEventListener("click", reset);
  $("#extension-return").addEventListener("click", returnToLab);
  $("#extension-pause").addEventListener("click", () => {
    if (!testStarted || finished) startTest();
    else {
      paused = !paused;
      render();
    }
  });
  root.querySelectorAll("[data-extension-step]").forEach((button) => {
    button.addEventListener("click", () =>
      goTo(Number(button.dataset.extensionStep)),
    );
  });
  render();

  return {
    updateLanguage: render,
    tick(dt, time) {
      if (root.hidden || step !== 2) return;
      if (!paused) animationTime += dt * SIMULATION_SPEED;
      if (testStarted && !paused && !finished) {
        const advance = dt * SIMULATION_SPEED;
        a = advanceExtensionCell(a, advance);
        other = advanceExtensionCell(other, advance);
        if (a.status === "complete" && other.status === "complete") {
          finished = true;
          results.A = { ...a };
          results.B = { ...other };
          render();
        } else if (time - lastRender > 0.15) {
          render();
          lastRender = time;
        }
      }
      for (const [selector, current] of [
        ["#extension-canvas-a", a],
        ["#extension-canvas-other", other],
      ]) {
        const trial = {
          cell: "animal",
          appearance: "rbc",
          concentration: 0.9,
          volume: current.volume,
          initialVolume: 1,
          solutionPsi: SALINE_PSI,
          initialSolutionPsi: SALINE_PSI,
          initialPsi: current.initialPsi,
          status: current.status,
          burst: false,
          tone:
            current.direction === "in"
              ? "hypo"
              : current.direction === "out"
                ? "hyper"
                : "iso",
        };
        drawChamber($(selector), trial, {
          time: animationTime,
          resetKey: particleEpoch,
          labels: false,
          t,
          solute: "salt",
          potential: () => extensionPotential(current),
        });
      }
    },
  };
}
