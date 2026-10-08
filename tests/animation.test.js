import test from "node:test";
import assert from "node:assert/strict";
import { cellGeometry, boundaryAt, containsPoint } from "../js/geometry.js";
import { cytoplasmDots, insideOrganelle } from "../js/cell-details.js";
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

test("Two chloroplasts and all pink cytoplasm dots stay inside the membrane and outside the vacuole at every cell size", () => {
  for (const width of [160, 360, 510]) {
    for (const volume of [0.12, 0.345, 0.6, 1, 1.02, 1.1455, 1.2072]) {
      const geometry = cellGeometry(width, 320, { cell: "plant", volume });
      assert.equal(geometry.chloroplasts.length, 2);
      for (const c of [...geometry.chloroplasts, geometry.vacuole]) {
        for (let i = 0; i < 120; i++) {
          const angle = (i * Math.PI) / 60,
            rotation = c.rotation ?? 0;
          const dx = Math.cos(angle) * c.rx,
            dy = Math.sin(angle) * c.ry;
          const x = c.x + dx * Math.cos(rotation) - dy * Math.sin(rotation);
          const y = c.y + dx * Math.sin(rotation) + dy * Math.cos(rotation);
          assert.ok(containsPoint(geometry.outline, x, y));
          if (c !== geometry.vacuole)
            assert.ok(!insideOrganelle(geometry.vacuole, x, y));
        }
      }
      const dots = cytoplasmDots(geometry);
      assert.ok(dots.length > 10);
      for (const dot of dots) {
        assert.ok(containsPoint(geometry.outline, dot.x, dot.y));
        assert.ok(!insideOrganelle(geometry.vacuole, dot.x, dot.y));
        assert.ok(!insideOrganelle(geometry.nucleus, dot.x, dot.y));
      }
    }
  }
  assert.ok(cellGeometry(360, 320, { cell: "animal", volume: 1 }).nucleus);
  assert.equal(
    cellGeometry(360, 320, { cell: "animal", volume: 1, appearance: "rbc" })
      .nucleus,
    null,
  );
});

test("Membrane contact flashes for half a real second, independently of playback speed, and freezes on pause", () => {
  const trial = createTrial("animal", 5);
  const geometry = cellGeometry(360, 320, trial);
  const particles = createParticles(geometry, trial);
  particles.pairTimer = Infinity;
  const water = particles.molecules.find((p) => p.type === "water" && p.inside);
  const edge = boundaryAt(geometry, 0);
  Object.assign(water, { x: edge.x - 1, y: edge.y, vx: -17, vy: 0 });
  advanceParticles(particles, geometry, trial, 0.005, 0.01);
  const read = () =>
    particleSnapshot(particles).water.find((p) => p.id === water.id);
  assert.equal(read().flashing, true);
  assert.ok(Math.abs(read().flashRemaining - 0.5) < 1e-10);
  const paused = particleSnapshot(particles);
  advanceParticles(particles, geometry, trial, 0, 1);
  assert.deepEqual(particleSnapshot(particles), paused);
  advanceParticles(particles, geometry, trial, 0.245, 0.49);
  assert.equal(read().flashing, true);
  advanceParticles(particles, geometry, trial, 0.01, 0.02);
  assert.equal(read().flashing, false);
});

test("After lysis the conserved water mixes freely with similar density inside the former cell region and outside", () => {
  let trial = { ...createTrial("animal", 0), status: "running" };
  const particles = createParticles(cellGeometry(360, 320, trial), trial);
  const ids = particleSnapshot(particles).water.map((p) => p.id);
  trial = stepParticles(particles, trial, 5, true);
  assert.equal(trial.burst, true);
  const geometry = cellGeometry(360, 320, trial);
  const beforeMix = particleSnapshot(particles);
  advanceParticles(particles, geometry, trial, 0);
  assert.deepEqual(particleSnapshot(particles), beforeMix);
  stepParticles(particles, trial, 3);
  const mixed = particleSnapshot(particles);
  assert.deepEqual(
    mixed.water.map((p) => p.id),
    ids,
  );
  assert.ok(
    mixed.water.every((p) => !p.inside && !p.transferring && !p.flashing),
  );
  const inRegion = mixed.water.filter((p) =>
    containsPoint(geometry.outline, p.x, p.y),
  ).length;
  const area = Math.PI * geometry.rx * geometry.ry;
  const insideDensity = inRegion / area;
  const outsideDensity = (mixed.water.length - inRegion) / (360 * 320 - area);
  assert.ok(
    insideDensity / outsideDensity > 0.65 &&
      insideDensity / outsideDensity < 1.4,
  );
  const oldPosition = { x: geometry.cx, y: geometry.cy };
  const water = particles.molecules[0];
  Object.assign(water, { ...oldPosition, vx: 17, vy: 0 });
  advanceParticles(particles, geometry, trial, 0.1);
  assert.ok(
    water.x > oldPosition.x,
    "The former cell interior remains accessible to water",
  );
});

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
    const plasmolysis = Math.max(0, Math.min(1, (1 - volume - 0.1) / 0.5));
    assert.ok(
      Math.abs(areaRatio - volume * (1 - 0.4 * plasmolysis) ** 2) < 1e-10,
    );
    assert.ok(shrunken.vacuole.x > initial.vacuole.x);
    assert.ok(
      Math.abs(shrunken.nucleus.x - shrunken.cx) <
        Math.abs(initial.nucleus.x - initial.cx),
    );
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

test("Turgid walls bow outward with an attached membrane, and the nucleus remains beside the vacuole", () => {
  for (const width of [160, 360, 510]) {
    const initial = cellGeometry(width, 320, { cell: "plant", volume: 1 });
    const initialWall = { ...initial, outline: initial.wallOutline };
    for (const volume of [0.12, 0.345, 0.6, 1, 1.02, 1.08, 1.1455, 1.2072]) {
      const geometry = cellGeometry(width, 320, { cell: "plant", volume });
      if (volume > 1) {
        const wall = { ...geometry, outline: geometry.wallOutline };
        const outwardBow = boundaryAt(wall, 0).x - boundaryAt(initialWall, 0).x;
        assert.ok(outwardBow > 0 && outwardBow < initial.wall.width * 0.04);
        assert.ok(
          boundaryAt(wall, Math.PI / 2).y >
            boundaryAt(initialWall, Math.PI / 2).y,
        );
        assert.deepEqual(geometry.commands, geometry.wallInnerCommands);
        assert.ok(geometry.nucleus.x < initial.nucleus.x);
      }
      const { nucleus, vacuole } = geometry;
      assert.ok(nucleus.rx > 0);
      for (let i = 0; i < 120; i++) {
        const angle = (i * Math.PI) / 60;
        const x = nucleus.x + Math.cos(angle) * nucleus.rx;
        const y = nucleus.y + Math.sin(angle) * nucleus.ry;
        assert.ok(
          containsPoint(geometry.outline, x, y),
          "The entire nucleus stays inside the membrane",
        );
        assert.ok(
          ((x - vacuole.x) / vacuole.rx) ** 2 +
            ((y - vacuole.y) / vacuole.ry) ** 2 >
            1,
          "The nucleus never overlaps the vacuole",
        );
      }
    }
  }
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
    ["animal", 8],
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
