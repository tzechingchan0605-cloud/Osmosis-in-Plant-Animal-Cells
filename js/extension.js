import { extensionView } from "./extension-view.js";
import {
  SALINE_PSI,
  createExtensionCell,
  advanceExtensionCell,
} from "./extension-model.js";
import { drawChamber } from "./renderer.js";

export function setupExtension({ t, returnToLab }) {
  const root = document.querySelector("#extension-study");
  root.innerHTML = extensionView;
  const $ = (selector) => root.querySelector(selector);
  let step = 1,
    otherName = "Y",
    paused = false,
    finished = false;
  let x = createExtensionCell("X"),
    other = createExtensionCell("Y");
  let results = {},
    lastRender = 0,
    feedbackShown = false,
    animationTime = 0,
    particleEpoch = 0;
  const signedChange = (current) => {
    const change = (current.volume - 1) * 100;
    return Math.abs(change) < 0.005
      ? "0.00"
      : change > 0
        ? "+" + change.toFixed(2)
        : change.toFixed(2).replace("-", "−");
  };

  function goTo(number) {
    step = number;
    render();
  }
  function startTest(name) {
    particleEpoch++;
    otherName = name;
    x = { ...createExtensionCell("X"), status: "running" };
    other = { ...createExtensionCell(name), status: "running" };
    paused = false;
    finished = false;
    animationTime = 0;
    goTo(3);
  }
  function render() {
    for (let i = 1; i <= 4; i++) {
      $(`#extension-step-${i}`).hidden = step !== i;
      const item = root.querySelector(`[data-step="${i}"]`);
      item.classList.toggle("completed", i < step);
      if (i === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    $("#micrograph-image").setAttribute("aria-label", t("micrographAlt"));
    $(".extension-steps").setAttribute("aria-label", t("extensionProgress"));
    $("#extension-speed").setAttribute("aria-label", t("extensionSpeed"));
    $("#extension-reason").placeholder = t("reasonPlaceholder");
    $("#extension-test-heading").textContent = t(
      otherName === "Y" ? "xyTestTitle" : "xzTestTitle",
    );
    $("#extension-cell-other").textContent = t("cell" + otherName);
    $("#extension-initial-other").textContent =
      `Ψ₀ = ${other.initialPsi.toFixed(3).replace("-", "−")} MPa`;
    $("#extension-pause").textContent = t(
      finished ? "replayTest" : paused ? "resumeShort" : "pauseShort",
    );
    $("#extension-test-result").hidden = !finished;
    $("#extension-higher-test").hidden = otherName === "Z";
    $("#extension-to-explain").hidden = otherName !== "Z";
    for (const [name, current] of [
      ["x", x],
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
          psi: current.initialPsi.toFixed(3).replace("-", "−"),
          volume: current.volume.toFixed(4),
          direction: t(current.direction),
        }),
      );
    }
    if (finished) {
      $("#extension-result-title").textContent = t(
        otherName === "Y" ? "lowerResultTitle" : "higherResultTitle",
      );
      const points = [
        t("xResult"),
        t(otherName === "Y" ? "yResult" : "zResult", {
          change: Math.abs((other.volume - 1) * 100).toFixed(2),
        }),
        t("finalEquilibriumNote"),
      ];
      $("#extension-result-points").replaceChildren(
        ...points.map((text) =>
          Object.assign(document.createElement("li"), { textContent: text }),
        ),
      );
      const px = $("#predict-x").value,
        py = $("#predict-y").value;
      $("#extension-prediction-feedback").textContent =
        otherName === "Y"
          ? t(
              !px && !py
                ? "noPredictions"
                : px === "none" && py === "in"
                  ? "predictionsMatched"
                  : "predictionsReview",
            )
          : $("#extension-hypothesis").value === "lower"
            ? t("hypothesisReview")
            : t("relativeTonicity");
    }
    if (step === 4) renderSummary();
    if (feedbackShown) checkExplanation();
  }
  function renderSummary() {
    $("#extension-summary-body").replaceChildren(
      ...["X", "Y", "Z"]
        .filter((name) => results[name])
        .map((name) => {
          const current = results[name],
            row = document.createElement("tr");
          const values = [
            t("cell" + name),
            current.initialPsi.toFixed(3).replace("-", "−"),
            t(
              current.direction === "none"
                ? "iso"
                : current.direction === "in"
                  ? "hypo"
                  : "hyper",
            ),
            t(current.direction),
            t(
              current.direction === "none"
                ? "unchanged"
                : current.direction === "in"
                  ? "slightSwelling"
                  : "slightShrinking",
            ),
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
        Object.assign(document.createElement("p"), { textContent: t(key) }),
      ),
    );
  }
  function reset() {
    step = 1;
    otherName = "Y";
    paused = false;
    finished = false;
    results = {};
    feedbackShown = false;
    x = createExtensionCell("X");
    other = createExtensionCell("Y");
    for (const selector of [
      "#extension-hypothesis",
      "#predict-x",
      "#predict-y",
      "#infer-a",
      "#infer-b",
      "#extension-reason",
    ])
      $(selector).value = "";
    $("#extension-final-feedback").hidden = true;
    render();
  }
  $("#extension-next-1").addEventListener("click", () => goTo(2));
  $("#extension-start-test").addEventListener("click", () => startTest("Y"));
  $("#extension-higher-test").addEventListener("click", () => startTest("Z"));
  $("#extension-to-explain").addEventListener("click", () => goTo(4));
  $("#extension-check").addEventListener("click", checkExplanation);
  $("#extension-reset").addEventListener("click", reset);
  $("#extension-return").addEventListener("click", returnToLab);
  $("#extension-pause").addEventListener("click", () => {
    if (finished) startTest(otherName);
    else {
      paused = !paused;
      render();
    }
  });
  render();

  return {
    updateLanguage: render,
    tick(dt, time) {
      if (root.hidden || step !== 3) return;
      if (!paused) animationTime += dt * Number($("#extension-speed").value);
      if (!paused && !finished) {
        const advance = dt * Number($("#extension-speed").value);
        x = advanceExtensionCell(x, advance);
        other = advanceExtensionCell(other, advance);
        if (x.status === "complete" && other.status === "complete") {
          finished = true;
          results.X = { ...x };
          results[otherName] = { ...other };
          render();
        } else if (time - lastRender > 0.15) {
          render();
          lastRender = time;
        }
      }
      for (const [selector, current] of [
        ["#extension-canvas-x", x],
        ["#extension-canvas-other", other],
      ]) {
        const displayVolume = 1 + (current.volume - 1) * 6;
        const trial = {
          cell: "animal",
          concentration: 0.9,
          volume: displayVolume,
          initialVolume: 1,
          solutionPsi: SALINE_PSI * 1000,
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
        });
      }
    },
  };
}
