import test from "node:test";
import assert from "node:assert/strict";
import { cellGeometry, boundaryAt, containsPoint } from "../js/geometry.js";
import {
  createParticles,
  advanceParticles,
  particleSnapshot,
} from "../js/particles.js";
import {
  createTrial,
  advanceTrial,
  potentialToConcentration,
  CELL_PSI,
} from "../js/model.js";

function stepParticles(particles, trial, seconds, advanceCell = false) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    if (advanceCell) trial = advanceTrial(trial, 1 / 60);
    advanceParticles(particles, cellGeometry(360, 320, trial), trial, 1 / 60);
  }
  return trial;
}

test("Water density is reduced by one quarter and grey internal dots are omitted", () => {
  for (const concentration of [0, 5, 20]) {
    for (const solute of ["sucrose", "salt"]) {
      const trial = createTrial("plant", concentration);
      const particles = createParticles(
        cellGeometry(360, 320, trial),
        trial,
        solute,
      );
      const previousWaterCount =
        28 + (solute === "salt" ? 65 : 72 - Math.round(concentration * 1.4));
      const waterCount = particles.molecules.filter(
        (p) => p.type === "water",
      ).length;
      assert.ok(Math.abs(waterCount - previousWaterCount * 0.75) <= 1);
      assert.equal(
        particles.molecules.filter((p) => p.type === "solute").length,
        solute === "salt" ? 12 : Math.round(concentration * 1.5),
      );
      assert.ok(
        particles.molecules.every(
          (p) => p.type === "water" || p.type === "solute",
        ),
      );
    }
  }
});

test("Equilibrium has at most two simultaneous matched pairs, all moving at the same speed", () => {
  for (const cell of ["plant", "animal"]) {
    let trial = { ...createTrial(cell, 20), status: "running" };
    const particles = createParticles(cellGeometry(360, 320, trial), trial);
    trial = stepParticles(particles, trial, 25, true);
    const geometry = cellGeometry(360, 320, trial);
    const initial = particleSnapshot(particles);
    let movingPairs = 0,
      speedChecks = 0;
    for (let i = 0; i < 1200; i++) {
      const previous = particles.molecules.map((p) => ({
        x: p.x,
        y: p.y,
        kind: p.transfer?.kind,
        segment: p.transfer?.segment,
      }));
      advanceParticles(particles, geometry, trial, 1 / 60);
      const current = particleSnapshot(particles);
      assert.equal(current.inside, initial.inside);
      assert.equal(current.transfers.in, current.transfers.out);
      assert.ok(current.transfers.in <= 2);
      assert.ok(current.transfers.out <= 2);
      movingPairs = Math.max(movingPairs, current.transfers.in);
      assert.equal(
        current.crossings.in - initial.crossings.in,
        current.crossings.out - initial.crossings.out,
      );
      particles.molecules.forEach((p, index) => {
        if (p.type !== "water") return;
        assert.ok(Math.abs(Math.hypot(p.vx, p.vy) - 17) < 1e-8);
        const before = previous[index];
        if (
          before.kind === "balanced" &&
          p.transfer?.kind === "balanced" &&
          before.segment === p.transfer.segment
        ) {
          assert.ok(
            Math.abs(Math.hypot(p.x - before.x, p.y - before.y) * 60 - 17) <
              1e-7,
          );
          speedChecks++;
        }
      });
    }
    assert.equal(movingPairs, 2);
    assert.ok(speedChecks > 100);
    assert.ok(particles.crossings.in > initial.crossings.in);
  }
});

test("The starting plant membrane touches the wall, with fixed corners throughout plasmolysis", () => {
  const initial = cellGeometry(360, 320, createTrial("plant", 20));
  for (const volume of [0.85, 0.6, 0.35]) {
    const shrunken = cellGeometry(360, 320, { cell: "plant", volume });
    assert.deepEqual(shrunken.wall, initial.wall);
    const wallBoundary = { ...shrunken, outline: shrunken.wallOutline };
    const initialWall = { ...initial, outline: initial.wallOutline };
    const inwardBow =
      boundaryAt(initialWall, 0).x - boundaryAt(wallBoundary, 0).x;
    assert.ok(inwardBow > 0 && inwardBow < initial.wall.width * 0.04);
    assert.ok(boundaryAt(wallBoundary, 0).x > boundaryAt(shrunken, 0).x);
    assert.deepEqual(shrunken.corners, initial.corners);
    assert.deepEqual(
      shrunken.commands.filter((p) => p.kind === "quadratic"),
      initial.commands.filter((p) => p.kind === "quadratic"),
    );
    for (const corner of initial.corners)
      assert.ok(
        shrunken.outline.some(
          (p) => Math.hypot(p.x - corner.x, p.y - corner.y) < 1e-6,
        ),
      );
    assert.ok(boundaryAt(shrunken, 0).x < initial.right);
    assert.ok(boundaryAt(shrunken, Math.PI / 2).y < initial.bottom);
    const areaRatio =
      (shrunken.vacuole.rx * shrunken.vacuole.ry) /
      (initial.vacuole.rx * initial.vacuole.ry);
    assert.ok(Math.abs(areaRatio - volume) < 1e-10);
  }
  assert.deepEqual(initial.commands, initial.wallInnerCommands);
  assert.equal(
    boundaryAt(initial, 0).x,
    initial.wall.x + initial.wall.width - 3.5,
  );
  assert.equal(boundaryAt(initial, Math.PI).x, initial.wall.x + 3.5);
  assert.equal(
    boundaryAt(initial, Math.PI / 2).y,
    initial.wall.y + initial.wall.height - 3.5,
  );
  assert.equal(boundaryAt(initial, -Math.PI / 2).y, initial.wall.y + 3.5);
});

test("Existing water molecules cross both ways before Start without a net change", () => {
  for (const cell of ["plant", "animal"]) {
    const trial = createTrial(cell, 20);
    const geometry = cellGeometry(360, 320, trial);
    const particles = createParticles(geometry, trial);
    const original = particleSnapshot(particles);
    stepParticles(particles, trial, 12);
    const after = particleSnapshot(particles);
    assert.deepEqual(
      after.water.map((p) => p.id),
      original.water.map((p) => p.id),
    );
    assert.equal(after.inside, original.inside);
    assert.ok(after.crossings.in > 2);
    assert.equal(after.crossings.in, after.crossings.out);
    assert.ok(after.quadrants.in.every((count) => count > 0));
    assert.ok(after.quadrants.out.every((count) => count > 0));
    assert.ok(
      after.water.some((p, i) => p.inside !== original.water[i].inside),
    );
    assert.ok(
      after.water.some(
        (p, i) =>
          Math.hypot(p.x - original.water[i].x, p.y - original.water[i].y) > 10,
      ),
    );
  }
});

test("Net transport uses conserved molecules in all directions, then balances at equilibrium", () => {
  for (const [cell, concentration] of [
    ["plant", 0],
    ["plant", 20],
    ["animal", 5],
    ["animal", 20],
  ]) {
    let trial = createTrial(cell, concentration);
    const particles = createParticles(cellGeometry(360, 320, trial), trial);
    const ids = particleSnapshot(particles).water.map((p) => p.id);
    stepParticles(particles, trial, 3);
    trial.status = "running";
    trial = stepParticles(particles, trial, 25, true);
    const equilibrium = particleSnapshot(particles);
    assert.equal(trial.status, "complete");
    assert.deepEqual(
      equilibrium.water.map((p) => p.id),
      ids,
    );
    assert.equal(
      equilibrium.inside,
      Math.round(particles.initialInside * trial.volume),
    );
    assert.equal(
      equilibrium.crossings.in - equilibrium.crossings.out,
      equilibrium.inside - particles.initialInside,
    );
    assert.ok(equilibrium.quadrants.in.every((count) => count > 0));
    assert.ok(equilibrium.quadrants.out.every((count) => count > 0));
    stepParticles(particles, trial, 10);
    const later = particleSnapshot(particles);
    assert.equal(later.inside, equilibrium.inside);
    assert.ok(later.crossings.in > equilibrium.crossings.in);
    assert.equal(
      later.crossings.in - equilibrium.crossings.in,
      later.crossings.out - equilibrium.crossings.out,
    );
  }
});

test("Water and sucrose enter the wall–membrane space, while solute cannot cross the membrane", () => {
  let trial = { ...createTrial("plant", 20), status: "running" };
  const particles = createParticles(cellGeometry(360, 320, trial), trial);
  let waterInGap = false,
    sugarInGap = false;
  for (let i = 0; i < 1800; i++) {
    trial = advanceTrial(trial, 1 / 60);
    const geometry = cellGeometry(360, 320, trial);
    advanceParticles(particles, geometry, trial, 1 / 60);
    for (const p of particles.molecules) {
      if (p.type === "solute")
        assert.equal(containsPoint(geometry.outline, p.x, p.y), false);
      const inGap =
        containsPoint(geometry.wallInnerOutline, p.x, p.y) &&
        !containsPoint(geometry.outline, p.x, p.y);
      if (inGap && p.type === "water") waterInGap = true;
      if (inGap && p.type === "solute") sugarInGap = true;
    }
  }
  assert.ok(waterInGap && sugarInGap);
});

test("Paused particle positions are stable; isotonic and recovery trials keep their populations", () => {
  let trial = createTrial("plant", potentialToConcentration(CELL_PSI));
  const geometry = cellGeometry(360, 320, trial);
  const particles = createParticles(geometry, trial);
  const frozen = particleSnapshot(particles);
  advanceParticles(particles, geometry, trial, 0);
  assert.deepEqual(particleSnapshot(particles), frozen);
  trial.status = "running";
  trial = stepParticles(particles, trial, 10, true);
  assert.equal(particleSnapshot(particles).inside, particles.initialInside);
  trial = { ...createTrial("plant", 0, 0.345), status: "running" };
  const recovery = createParticles(cellGeometry(360, 320, trial), trial);
  const ids = particleSnapshot(recovery).water.map((p) => p.id);
  trial = stepParticles(recovery, trial, 25, true);
  const recovered = particleSnapshot(recovery);
  assert.deepEqual(
    recovered.water.map((p) => p.id),
    ids,
  );
  assert.ok(recovered.inside > recovery.initialInside);
  assert.ok(trial.volume > 1);
});
