import test from "node:test";
import assert from "node:assert/strict";
import { translations } from "../js/i18n.js";
import {
  SALINE_PSI,
  createExtensionCell,
  extensionPotential,
  advanceExtensionCell,
  extensionDirection,
} from "../js/extension-model.js";
import {
  CELL_PSI,
  BURST_VOLUME,
  concentrationToPotential,
  potentialToConcentration,
  cellPotential,
  equilibriumVolume,
  classify,
  createTrial,
  advanceTrial,
  outcome,
} from "../js/model.js";

function finish(trial) {
  let state = { ...trial, status: "running" };
  for (let i = 0; i < 2400 && state.status === "running"; i++)
    state = advanceTrial(state, 1 / 60);
  assert.equal(
    state.status,
    "complete",
    "Trial must reach equilibrium or rupture",
  );
  return state;
}
test("The linked inputs round-trip and pure water has zero water potential", () => {
  assert.equal(concentrationToPotential(0), 0);
  for (const c of [0.1, 5, 10, 20])
    assert.ok(
      Math.abs(potentialToConcentration(concentrationToPotential(c)) - c) <
        1e-10,
    );
  assert.ok(concentrationToPotential(20) < concentrationToPotential(5));
});
test("Tonicity compares water potential with correct ordering of negative values", () => {
  assert.equal(classify(-200), "hypo");
  assert.equal(classify(-750), "iso");
  assert.equal(classify(-900), "hyper");
  assert.equal(classify(-750.4), "iso");
});
test("Equal water potential preserves both cell models", () => {
  for (const cell of ["animal", "plant"]) {
    const trial = finish(createTrial(cell, potentialToConcentration(CELL_PSI)));
    assert.equal(trial.volume, 1);
    assert.equal(outcome(trial), "unchanged");
    assert.equal(trial.burst, false);
  }
});
test("Pure water makes the plant turgid while pressure balances inward osmosis", () => {
  const trial = finish(createTrial("plant", 0));
  assert.ok(trial.volume > 1 && trial.volume < 1.3);
  assert.equal(trial.burst, false);
  assert.equal(outcome(trial), "turgid");
  assert.ok(Math.abs(cellPotential("plant", trial.volume)) < 1e-7);
});
test("Pure water ruptures the animal cell; mild hypotonic solution does not", () => {
  const burst = finish(createTrial("animal", 0));
  assert.equal(burst.volume, BURST_VOLUME);
  assert.equal(burst.burst, true);
  assert.equal(outcome(burst), "lysed");
  assert.equal(
    burst.solutionVolume,
    burst.initialVolume + burst.initialSolutionVolume,
  );
  assert.equal(burst.solutionPsi, CELL_PSI / burst.solutionVolume);
  const mild = finish(createTrial("animal", 8));
  assert.ok(mild.volume > 1 && mild.volume < BURST_VOLUME);
  assert.equal(mild.burst, false);
  assert.equal(outcome(mild), "swollen");
  assert.ok(
    Math.abs(cellPotential("animal", mild.volume) - mild.solutionPsi) < 1e-7,
  );
});
test("Strong hypertonic solution produces plasmolysis or a shrunken wrinkled cell", () => {
  for (const cell of ["animal", "plant"]) {
    const trial = finish(createTrial(cell, 20));
    assert.ok(trial.volume < 0.6);
    assert.equal(trial.burst, false);
    assert.equal(outcome(trial), cell === "plant" ? "plasmolysed" : "wrinkled");
    assert.ok(
      Math.abs(cellPotential(cell, trial.volume) - trial.solutionPsi) < 1e-7,
    );
  }
});
test("Recovery retains the shrunken plant and restores turgidity with distilled water", () => {
  const shrunken = finish(createTrial("plant", 20));
  const recovery = createTrial("plant", 0, shrunken.volume);
  assert.equal(recovery.initialVolume, shrunken.volume);
  assert.ok(Math.abs(recovery.initialPsi - shrunken.solutionPsi) < 1e-7);
  const result = finish(recovery);
  assert.equal(outcome(result), "turgid");
  assert.ok(result.volume > 1);
  assert.ok(Math.abs(result.volume - equilibriumVolume("plant", 0)) < 1e-7);
});
test("During net movement, changing volume moves the cell potential toward the solution potential", () => {
  for (const cell of ["animal", "plant"])
    for (const concentration of [0, 5, 7, 12, 20]) {
      let trial = { ...createTrial(cell, concentration), status: "running" };
      let difference = Math.abs(
        cellPotential(cell, trial.volume) - trial.solutionPsi,
      );
      for (let i = 0; i < 600 && trial.status === "running"; i++) {
        trial = advanceTrial(trial, 1 / 60);
        const nextDifference = Math.abs(
          cellPotential(cell, trial.volume) - trial.solutionPsi,
        );
        assert.ok(
          nextDifference <= difference + 1e-9,
          "Water must move down its potential gradient",
        );
        difference = nextDifference;
      }
    }
});
test("Both cell types change the finite bath potential while conserving water and external sucrose", () => {
  for (const cell of ["plant", "animal"]) {
    for (const concentration of [8, 20]) {
      const initial = createTrial(cell, concentration);
      let trial = { ...initial, status: "running" };
      for (let i = 0; i < 1800 && trial.status === "running"; i++) {
        const previous = trial;
        trial = advanceTrial(trial, 1 / 60);
        assert.equal(trial.burst, false);
        assert.ok(Math.abs(trial.volume + trial.solutionVolume - 5) < 1e-10);
        assert.ok(
          Math.abs(
            trial.solutionConcentration * trial.solutionVolume -
              concentration * initial.solutionVolume,
          ) < 1e-10,
        );
        assert.ok(
          Math.abs(
            concentrationToPotential(trial.solutionConcentration) -
              trial.solutionPsi,
          ) < 1e-9,
        );
        if (trial.tone === "hyper") {
          assert.ok(trial.solutionPsi >= previous.solutionPsi);
          assert.ok(
            trial.solutionConcentration <= previous.solutionConcentration,
          );
        } else {
          assert.ok(trial.solutionPsi <= previous.solutionPsi);
          assert.ok(
            trial.solutionConcentration >= previous.solutionConcentration,
          );
        }
      }
      assert.equal(trial.status, "complete");
      assert.ok(
        Math.abs(cellPotential(cell, trial.volume) - trial.solutionPsi) < 1e-7,
      );
      assert.equal(trial.initialSolutionPsi, initial.solutionPsi);
      assert.notEqual(trial.solutionPsi, initial.solutionPsi);
      assert.equal(
        initial.solutionPsi,
        concentrationToPotential(concentration),
      );
      assert.equal(initial.volume, 1);
    }
  }
});
test("Paused trials do not advance, and invalid settings are rejected", () => {
  const paused = { ...createTrial("plant", 5), status: "paused" };
  assert.deepEqual(advanceTrial(paused, 5), paused);
  for (const c of [-1, 21, NaN, Infinity])
    assert.throws(() => createTrial("plant", c), RangeError);
  assert.throws(() => createTrial("other", 5), RangeError);
});
test("Every translation has a matching English and Traditional Chinese entry", () => {
  assert.deepEqual(
    Object.keys(translations.en).sort(),
    Object.keys(translations.zh).sort(),
  );
});
test("Extension A is unchanged and higher-potential B shrinks", () => {
  for (const [name, direction, expectedRatio] of [
    ["A", "none", 1],
    ["B", "out", 700 / 794],
  ]) {
    let cell = { ...createExtensionCell(name), status: "running" };
    assert.equal(cell.direction, direction);
    for (let i = 0; i < 1200 && cell.status === "running"; i++)
      cell = advanceExtensionCell(cell, 1 / 60);
    assert.equal(cell.status, "complete");
    assert.ok(Math.abs(cell.volume - expectedRatio) < 1e-10);
    assert.ok(Math.abs(extensionPotential(cell) - SALINE_PSI) < 1e-10);
  }
});
test("Extension gradient ordering holds for kPa and is separate from sucrose conversion", () => {
  assert.equal(extensionDirection(-810), "in");
  assert.equal(extensionDirection(-794), "none");
  assert.equal(extensionDirection(-700), "out");
  assert.notEqual(concentrationToPotential(0.9), SALINE_PSI);
});
