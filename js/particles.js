import { boundaryAt, containsPoint } from "./geometry.js";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;
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
  const initialInside = 28;
  const exteriorWater =
    solute === "salt" ? 65 : 72 - Math.round(trial.concentration * 1.4);
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
      const speed = type === "water" ? 13 + rng() * 8 : 5 + rng() * 6;
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
      });
    }
  }
  add("water", true, initialInside);
  add("water", false, exteriorWater);
  add("solute", false, exteriorSolute);
  add("cell-solute", true, 8);
  return {
    molecules,
    initialInside,
    initialVolume: trial.initialVolume ?? trial.volume,
    width: geometry.width,
    height: geometry.height,
    clock: 0,
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

function launch(state, p, entering, geometry, duration = 1.7) {
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
    entering,
    angle,
    duration,
    elapsed: 0,
    crossed: false,
    distance,
    startDistance: Math.hypot(p.x - geometry.cx, p.y - geometry.cy),
    startFraction:
      Math.hypot(p.x - geometry.cx, p.y - geometry.cy) / edge.distance,
  };
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

export function advanceParticles(state, geometry, trial, dt) {
  if (state.width !== geometry.width || state.height !== geometry.height) {
    const sx = geometry.width / state.width,
      sy = geometry.height / state.height;
    for (const p of state.molecules) {
      p.x *= sx;
      p.y *= sy;
      if (p.transfer) {
        p.transfer.angle = Math.atan2(
          Math.sin(p.transfer.angle) * sy,
          Math.cos(p.transfer.angle) * sx,
        );
        p.transfer.distance *= Math.min(sx, sy);
        p.transfer.startDistance *= Math.min(sx, sy);
      }
    }
    state.width = geometry.width;
    state.height = geometry.height;
  }
  if (!(dt > 0)) return state;
  state.clock += dt;
  if (!trial.burst) {
    const waterCount = state.molecules.filter((p) => p.type === "water").length;
    const target = Math.max(
      3,
      Math.min(
        waterCount - 8,
        Math.round((state.initialInside * trial.volume) / state.initialVolume),
      ),
    );
    // Net transfers use the same population as the balanced exchanges.
    const difference = target - projectedInside(state);
    for (let i = 0; i < Math.min(3, Math.abs(difference)); i++) {
      const entering = difference > 0;
      const p = choose(state, entering, state.sequence++ * GOLDEN_ANGLE);
      if (!p) break;
      launch(state, p, entering, geometry);
    }
    state.pairTimer -= dt;
    if (state.pairTimer <= 0) {
      const angle = state.sequence++ * GOLDEN_ANGLE;
      const incoming = choose(state, true, angle);
      const outgoing = choose(state, false, angle + Math.PI);
      if (incoming && outgoing) {
        launch(state, incoming, true, geometry);
        launch(state, outgoing, false, geometry);
      }
      state.pairTimer = 0.65;
    }
  }
  for (const p of state.molecules) {
    const transfer = p.transfer;
    if (trial.burst) p.transfer = null;
    if (!p.transfer) {
      drift(p, state, geometry, dt, trial.burst);
      continue;
    }
    transfer.elapsed += dt;
    const progress = Math.min(1, transfer.elapsed / transfer.duration);
    const edge = boundaryAt(geometry, transfer.angle);
    if (progress < 0.5) {
      const f = progress * 2;
      const startDistance = transfer.entering
        ? Math.max(transfer.startDistance, edge.distance + 4)
        : edge.distance * Math.min(0.97, transfer.startFraction);
      const startX = geometry.cx + Math.cos(transfer.angle) * startDistance;
      const startY = geometry.cy + Math.sin(transfer.angle) * startDistance;
      p.x = startX + (edge.x - startX) * f;
      p.y = startY + (edge.y - startY) * f;
    } else {
      if (!transfer.crossed) {
        transfer.crossed = true;
        p.inside = transfer.entering;
        const direction = transfer.entering ? "in" : "out";
        state.crossings[direction]++;
        const quadrant = Math.floor(
          ((transfer.angle + TAU) % TAU) / (Math.PI / 2),
        );
        state.quadrants[direction][quadrant]++;
      }
      const f = progress * 2 - 1;
      const endDistance = transfer.entering
        ? Math.min(transfer.distance, edge.distance * 0.65)
        : Math.max(transfer.distance, edge.distance + 12);
      const endX = geometry.cx + Math.cos(transfer.angle) * endDistance;
      const endY = geometry.cy + Math.sin(transfer.angle) * endDistance;
      p.x = edge.x + (endX - edge.x) * f;
      p.y = edge.y + (endY - edge.y) * f;
    }
    if (progress === 1) p.transfer = null;
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
      })),
    crossings: { ...state.crossings },
    quadrants: { in: [...state.quadrants.in], out: [...state.quadrants.out] },
    inside: state.molecules.filter((p) => p.type === "water" && p.inside)
      .length,
  };
}
