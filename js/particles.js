import { boundaryAt, containsPoint } from "./geometry.js";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;
const WATER_SPEED = 17;
const MAX_BALANCED_PAIRS = 2;
function random(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createParticles(geometry, trial, solute = "sucrose") {
  const rng = random(1059),
    molecules = [];
  const initialInside = 21;
  const exteriorWater = Math.round(
    (solute === "salt" ? 65 : 72 - Math.round(trial.concentration * 1.4)) *
      0.75,
  );
  const exteriorSolute =
    solute === "salt" ? 12 : Math.round(trial.concentration * 1.5);
  function add(type, inside, count) {
    for (let i = 0; i < count; i++) {
      let x, y;
      if (inside) {
        const angle = rng() * TAU,
          edge = boundaryAt(geometry, angle);
        const fraction = 0.15 + Math.sqrt(rng()) * 0.55;
        x = geometry.cx + (edge.x - geometry.cx) * fraction;
        y = geometry.cy + (edge.y - geometry.cy) * fraction;
      } else {
        do {
          x = 8 + rng() * (geometry.width - 16);
          y = 8 + rng() * (geometry.height - 16);
        } while (containsPoint(geometry.outline, x, y));
      }
      const direction = rng() * TAU;
      const speed = type === "water" ? WATER_SPEED : 5 + rng() * 6;
      molecules.push({
        id: molecules.length,
        type,
        inside,
        x,
        y,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        phase: rng() * TAU,
        transfer: null,
        touching: false,
        contactUntil: 0,
      });
    }
  }
  add("water", true, initialInside);
  add("water", false, exteriorWater);
  add("solute", false, exteriorSolute);
  return {
    molecules,
    initialInside,
    initialVolume: trial.initialVolume ?? trial.volume,
    width: geometry.width,
    height: geometry.height,
    clock: 0,
    contactClock: 0,
    pairTimer: 0.2,
    sequence: 0,
    crossings: { in: 0, out: 0 },
    quadrants: { in: [0, 0, 0, 0], out: [0, 0, 0, 0] },
    rng,
  };
}

function projectedInside(state) {
  return state.molecules.reduce(
    (count, p) =>
      count +
      (p.type !== "water"
        ? 0
        : p.transfer && !p.transfer.crossed
          ? p.transfer.entering
            ? 1
            : 0
          : Number(p.inside)),
    0,
  );
}

function choose(state, entering, angle) {
  const candidates = state.molecules.filter(
    (p) => p.type === "water" && !p.transfer && p.inside !== entering,
  );
  let chosen,
    best = Infinity;
  for (const p of candidates) {
    const a = Math.atan2(p.y - state.height / 2 + 2, p.x - state.width / 2);
    const difference = Math.abs(
      Math.atan2(Math.sin(a - angle), Math.cos(a - angle)),
    );
    if (difference < best) {
      best = difference;
      chosen = p;
    }
  }
  return chosen;
}

function launch(
  state,
  p,
  entering,
  geometry,
  duration = 1.7,
  intoVacuole = false,
  animalTransfer = false,
) {
  const angle = Math.atan2(p.y - geometry.cy, p.x - geometry.cx);
  const edge = boundaryAt(geometry, angle);
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  const roomX =
    dx > 0 ? (geometry.width - 7 - geometry.cx) / dx : (7 - geometry.cx) / dx;
  const roomY =
    dy > 0 ? (geometry.height - 7 - geometry.cy) / dy : (7 - geometry.cy) / dy;
  const distance = entering
    ? edge.distance * (0.35 + state.rng() * 0.2)
    : Math.min(edge.distance + 25 + state.rng() * 20, roomX, roomY);
  p.transfer = {
    kind: "net",
    entering,
    angle,
    duration,
    elapsed: 0,
    crossed: false,
    intoVacuole,
    animalTransfer,
    distance,
    startDistance: Math.hypot(p.x - geometry.cx, p.y - geometry.cy),
    startFraction:
      Math.hypot(p.x - geometry.cx, p.y - geometry.cy) / edge.distance,
  };
}

function radialRoom(geometry, angle) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  return Math.min(
    dx > 0 ? (geometry.width - 7 - geometry.cx) / dx : (7 - geometry.cx) / dx,
    dy > 0 ? (geometry.height - 7 - geometry.cy) / dy : (7 - geometry.cy) / dy,
  );
}

function launchBalancedPair(state, geometry, angle, intoVacuole = false) {
  const candidates = state.molecules
    .filter((p) => p.type === "water" && !p.transfer)
    .map((p) => {
      const direction = Math.atan2(p.y - geometry.cy, p.x - geometry.cx);
      const radius = Math.hypot(p.x - geometry.cx, p.y - geometry.cy);
      const edge = boundaryAt(geometry, direction).distance;
      return {
        p,
        direction,
        radius,
        edge,
        gap: Math.abs(radius - edge),
        room: radialRoom(geometry, direction),
      };
    })
    .filter((c) => (c.p.inside ? c.radius < c.edge : c.radius > c.edge));
  let bestPair,
    bestScore = Infinity;
  for (const incoming of candidates.filter((c) => !c.p.inside)) {
    for (const outgoing of candidates.filter((c) => c.p.inside)) {
      const approach = Math.max(incoming.gap, outgoing.gap);
      // A short radial turn gives both routes the same length, so both
      // molecules move at WATER_SPEED and cross the membrane together.
      const inTurn = (approach - incoming.gap) / 2;
      const outTurn = (approach - outgoing.gap) / 2;
      if (
        incoming.radius + inTurn > incoming.room ||
        outgoing.radius - outTurn < 3
      )
        continue;
      const angleGap = (a, b) =>
        Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
      const score =
        angleGap(incoming.direction, angle) +
        angleGap(outgoing.direction, angle + Math.PI) +
        approach * 0.025;
      if (score < bestScore) {
        bestScore = score;
        bestPair = { incoming, outgoing, approach, inTurn, outTurn };
      }
    }
  }
  if (!bestPair) return;
  const { incoming, outgoing, approach, inTurn, outTurn } = bestPair;
  const after = Math.min(
    intoVacuole ? geometry.base * 0.55 : 18,
    incoming.edge * 0.55,
    outgoing.room - outgoing.edge - 2,
  );
  for (const [candidate, entering, turn] of [
    [incoming, true, inTurn],
    [outgoing, false, outTurn],
  ]) {
    candidate.p.transfer = {
      kind: "balanced",
      pairId: state.sequence,
      entering,
      angle: candidate.direction,
      elapsed: 0,
      crossed: false,
      approach,
      after,
      turn,
      segment: 0,
      startDistance: candidate.radius,
      initialEdge: candidate.edge,
    };
  }
}

function crossMembrane(p, state, transfer) {
  if (transfer.crossed) return;
  transfer.crossed = true;
  p.inside = transfer.entering;
  if (!p.touching) p.contactUntil = state.contactClock + 0.5;
  const direction = transfer.entering ? "in" : "out";
  state.crossings[direction]++;
  const quadrant = Math.floor(((transfer.angle + TAU) % TAU) / (Math.PI / 2));
  state.quadrants[direction][quadrant]++;
}

function advanceBalanced(p, state, geometry, dt) {
  const transfer = p.transfer;
  transfer.elapsed += dt;
  const travelled = transfer.elapsed * WATER_SPEED;
  const edge = boundaryAt(geometry, transfer.angle).distance;
  let radius;
  if (travelled < transfer.approach) {
    const away = Math.min(travelled, transfer.turn);
    const toward = Math.max(0, travelled - transfer.turn);
    radius =
      transfer.startDistance + (transfer.entering ? 1 : -1) * (away - toward);
    radius = transfer.entering
      ? radius + edge - transfer.initialEdge
      : (radius * edge) / transfer.initialEdge;
    transfer.segment = travelled < transfer.turn ? 0 : 1;
  } else {
    crossMembrane(p, state, transfer);
    const after = Math.min(transfer.after, travelled - transfer.approach);
    radius = edge + (transfer.entering ? -after : after);
    transfer.segment = 2;
  }
  p.x = geometry.cx + Math.cos(transfer.angle) * radius;
  p.y = geometry.cy + Math.sin(transfer.angle) * radius;
  if (travelled >= transfer.approach + transfer.after) {
    const direction = transfer.entering ? -1 : 1;
    p.vx = direction * Math.cos(transfer.angle) * WATER_SPEED;
    p.vy = direction * Math.sin(transfer.angle) * WATER_SPEED;
    p.transfer = null;
  }
}

function drift(p, state, geometry, dt, burst) {
  // Gentle changes of direction, with reflection rather than wrapping or respawning.
  const turn = Math.sin(state.clock * 1.5 + p.phase) * dt * 0.8;
  const vx = p.vx * Math.cos(turn) - p.vy * Math.sin(turn);
  p.vy = p.vx * Math.sin(turn) + p.vy * Math.cos(turn);
  p.vx = vx;
  let nx = p.x + p.vx * dt,
    ny = p.y + p.vy * dt;
  if (nx < 5 || nx > geometry.width - 5) {
    p.vx *= -1;
    nx = p.x;
  }
  if (ny < 5 || ny > geometry.height - 5) {
    p.vy *= -1;
    ny = p.y;
  }
  if (!burst && containsPoint(geometry.outline, nx, ny) !== p.inside) {
    if (p.type === "water" && !p.touching)
      p.contactUntil = state.contactClock + 0.5;
    p.vx *= -1;
    p.vy *= -1;
    // A moving membrane gently carries non-transferring cell contents with it.
    if (containsPoint(geometry.outline, p.x, p.y) !== p.inside) {
      const angle = Math.atan2(p.y - geometry.cy, p.x - geometry.cx);
      const edge = boundaryAt(geometry, angle);
      const distance = edge.distance + (p.inside ? -3 : 3);
      p.x = geometry.cx + Math.cos(angle) * distance;
      p.y = geometry.cy + Math.sin(angle) * distance;
    }
    return;
  }
  p.x = nx;
  p.y = ny;
}

function touchesMembrane(outline, x, y) {
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared
      ? Math.max(
          0,
          Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared),
        )
      : 0;
    if (
      (x - a.x - fraction * dx) ** 2 + (y - a.y - fraction * dy) ** 2 <=
      3.4 ** 2
    )
      return true;
  }
  return false;
}

function beginBurstMixing(state, geometry) {
  state.burstStarted = state.contactClock;
  const water = state.molecules.filter((p) => p.type === "water");
  const available = [...water];
  const columns = Math.ceil(
    Math.sqrt((water.length * geometry.width) / geometry.height),
  );
  const rows = Math.ceil(water.length / columns);
  // Redistribute the existing dots continuously across the shared solution.
  // No separate intracellular compartment remains after membrane rupture.
  for (let i = 0; i < water.length; i++) {
    const x =
      (((i % columns) + 0.3 + state.rng() * 0.4) * geometry.width) / columns;
    const y =
      ((Math.floor(i / columns) + 0.3 + state.rng() * 0.4) * geometry.height) /
      rows;
    let nearest = 0;
    for (let j = 1; j < available.length; j++) {
      if (
        Math.hypot(available[j].x - x, available[j].y - y) <
        Math.hypot(available[nearest].x - x, available[nearest].y - y)
      )
        nearest = j;
    }
    const p = available.splice(nearest, 1)[0];
    p.mixing = { fromX: p.x, fromY: p.y, x, y };
    p.inside = false;
    p.transfer = null;
    p.contactUntil = 0;
  }
}

export function advanceParticles(state, geometry, trial, dt, contactDt = dt) {
  if (state.width !== geometry.width || state.height !== geometry.height) {
    const sx = geometry.width / state.width,
      sy = geometry.height / state.height;
    for (const p of state.molecules) {
      p.x *= sx;
      p.y *= sy;
      if (p.mixing) {
        p.mixing.fromX *= sx;
        p.mixing.x *= sx;
        p.mixing.fromY *= sy;
        p.mixing.y *= sy;
      }
      if (p.transfer) {
        p.transfer.angle = Math.atan2(
          Math.sin(p.transfer.angle) * sy,
          Math.cos(p.transfer.angle) * sx,
        );
        p.transfer.startDistance *= Math.min(sx, sy);
        if (p.transfer.kind === "balanced") {
          p.transfer.initialEdge *= Math.min(sx, sy);
          p.transfer.approach *= Math.min(sx, sy);
          p.transfer.after *= Math.min(sx, sy);
          p.transfer.turn *= Math.min(sx, sy);
        } else {
          p.transfer.distance *= Math.min(sx, sy);
        }
      }
    }
    state.width = geometry.width;
    state.height = geometry.height;
  }
  if (!(dt > 0)) return state;
  state.clock += dt;
  state.contactClock += contactDt;
  if (trial.burst && state.burstStarted === undefined)
    beginBurstMixing(state, geometry);
  if (!trial.burst) {
    const waterCount = state.molecules.filter((p) => p.type === "water").length;
    // In fresh turgid plant diagrams, water-dot occupancy follows the visible
    // vacuole area. This preserves dot density as it enlarges and makes intake
    // clear; the numerical volume/potential model remains independent.
    const waterRatio =
      trial.cell === "plant" && state.initialVolume === 1 && trial.volume > 1
        ? geometry.vacuoleAreaRatio
        : trial.volume / state.initialVolume;
    const target = Math.max(
      3,
      Math.min(waterCount - 8, Math.round(state.initialInside * waterRatio)),
    );
    const difference = target - projectedInside(state);
    const changing = trial.status === "running" && trial.tone !== "iso";
    const changingRbc = changing && trial.appearance === "rbc";
    if (!changing) {
      const pairIds = [
        ...new Set(
          state.molecules
            .filter((p) => p.transfer?.kind === "balanced")
            .map((p) => p.transfer.pairId),
        ),
      ];
      const keep = new Set(pairIds.slice(0, MAX_BALANCED_PAIRS));
      for (const p of state.molecules) {
        if (p.transfer?.kind === "balanced" && !keep.has(p.transfer.pairId))
          p.transfer = null;
      }
    }
    // Net osmosis can have more simultaneous crossings. The one-to-two
    // matched-pair limit applies to the reference view and equilibrium.
    for (let i = 0; i < Math.min(4, Math.abs(difference)); i++) {
      const entering = difference > 0;
      const p = choose(state, entering, state.sequence++ * GOLDEN_ANGLE);
      if (!p) break;
      const intoVacuole = entering && trial.cell === "plant";
      const animalTransfer = trial.cell === "animal";
      const duration =
        (intoVacuole || animalTransfer) && changing
          ? Math.max(
              changingRbc ? 5.5 : 1.7,
              Math.min(
                5.5,
                Math.abs(
                  (trial.initialPsi ?? 0) - (trial.initialSolutionPsi ?? 0),
                ) / 130,
              ),
            )
          : 1.7;
      launch(
        state,
        p,
        entering,
        geometry,
        duration,
        intoVacuole,
        animalTransfer,
      );
    }
    state.pairTimer -= dt;
    const balancedCount =
      state.molecules.filter((p) => p.transfer?.kind === "balanced").length / 2;
    // Matched counterflow keeps both directions visible, while additional
    // real transfers make the net direction stand out.
    // Mild RBC volume changes transfer only a few dots overall. More matched
    // exchanges make both directions visible, with additional net transport.
    // Their paired crossings preserve the cell's actual water-dot loss.
    const pairLimit = changingRbc ? 3 : changing ? 1 : MAX_BALANCED_PAIRS;
    if (state.pairTimer <= 0 && balancedCount < pairLimit) {
      const angle = state.sequence++ * GOLDEN_ANGLE;
      launchBalancedPair(
        state,
        geometry,
        angle,
        changing && trial.cell === "plant" && trial.tone === "hypo",
      );
      state.pairTimer = 0.8;
    }
  }
  for (const p of state.molecules) {
    const transfer = p.transfer;
    if (trial.burst) p.transfer = null;
    if (p.mixing) {
      const progress = Math.min(
        1,
        (state.contactClock - state.burstStarted) / 2.6,
      );
      const eased = progress * progress * (3 - 2 * progress);
      p.x = p.mixing.fromX + (p.mixing.x - p.mixing.fromX) * eased;
      p.y = p.mixing.fromY + (p.mixing.y - p.mixing.fromY) * eased;
      if (progress === 1) p.mixing = null;
      continue;
    }
    if (!p.transfer) {
      drift(p, state, geometry, dt, trial.burst);
      continue;
    }
    if (transfer.kind === "balanced") {
      advanceBalanced(p, state, geometry, dt);
      continue;
    }
    transfer.elapsed += dt;
    const progress = Math.min(1, transfer.elapsed / transfer.duration);
    const edge = boundaryAt(geometry, transfer.angle);
    const crossingFraction =
      transfer.intoVacuole || transfer.animalTransfer ? 0.2 : 0.5;
    if (progress < crossingFraction) {
      const f = progress / crossingFraction;
      const startDistance = transfer.entering
        ? Math.max(transfer.startDistance, edge.distance + 4)
        : edge.distance * Math.min(0.97, transfer.startFraction);
      const startX = geometry.cx + Math.cos(transfer.angle) * startDistance;
      const startY = geometry.cy + Math.sin(transfer.angle) * startDistance;
      p.x = startX + (edge.x - startX) * f;
      p.y = startY + (edge.y - startY) * f;
    } else {
      crossMembrane(p, state, transfer);
      const f = (progress - crossingFraction) / (1 - crossingFraction);
      const endDistance = transfer.entering
        ? Math.min(transfer.distance, edge.distance * 0.65)
        : Math.max(transfer.distance, edge.distance + 12);
      const vacuole =
        transfer.entering && transfer.intoVacuole && geometry.vacuole;
      const endX = vacuole
        ? vacuole.x + Math.cos(transfer.angle) * vacuole.rx * 0.45
        : geometry.cx + Math.cos(transfer.angle) * endDistance;
      const endY = vacuole
        ? vacuole.y + Math.sin(transfer.angle) * vacuole.ry * 0.45
        : geometry.cy + Math.sin(transfer.angle) * endDistance;
      p.x = edge.x + (endX - edge.x) * f;
      p.y = edge.y + (endY - edge.y) * f;
    }
    if (progress === 1) p.transfer = null;
  }
  for (const p of state.molecules) {
    if (p.type !== "water") continue;
    const touching =
      !trial.burst && touchesMembrane(geometry.outline, p.x, p.y);
    if (touching && !p.touching) p.contactUntil = state.contactClock + 0.5;
    p.touching = touching;
  }
  return state;
}

export function particleSnapshot(state) {
  return {
    water: state.molecules
      .filter((p) => p.type === "water")
      .map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        inside: p.inside,
        transferring: !!p.transfer,
        flashing: p.contactUntil > state.contactClock,
        flashRemaining: Math.max(0, p.contactUntil - state.contactClock),
      })),
    crossings: { ...state.crossings },
    transfers: {
      in: state.molecules.filter((p) => p.transfer?.entering === true).length,
      out: state.molecules.filter((p) => p.transfer?.entering === false).length,
    },
    quadrants: { in: [...state.quadrants.in], out: [...state.quadrants.out] },
    inside: state.molecules.filter((p) => p.type === "water" && p.inside)
      .length,
  };
}
