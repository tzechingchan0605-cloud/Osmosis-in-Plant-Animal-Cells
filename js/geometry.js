// One outline is shared by the drawing and the particle boundary calculations.
const TAU = Math.PI * 2;

export function containsPoint(outline, x, y) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i],
      b = outline[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export function boundaryAt(geometry, angle) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  let distance = Infinity;
  const { outline, cx, cy } = geometry;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    const ex = b.x - a.x,
      ey = b.y - a.y;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-8) continue;
    const ax = a.x - cx,
      ay = a.y - cy;
    const ray = (ax * ey - ay * ex) / denominator;
    const segment = (ax * dy - ay * dx) / denominator;
    if (ray >= 0 && segment >= 0 && segment <= 1)
      distance = Math.min(distance, ray);
  }
  return { x: cx + dx * distance, y: cy + dy * distance, distance };
}

function sampleCommands(commands) {
  const points = [];
  let start;
  for (const command of commands) {
    if (command.kind === "move") {
      start = command.to;
      points.push(start);
      continue;
    }
    const from = start;
    for (let i = 1; i <= 16; i++) {
      const t = i / 16,
        u = 1 - t;
      points.push(
        command.kind === "cubic"
          ? {
              x:
                u ** 3 * from.x +
                3 * u ** 2 * t * command.a.x +
                3 * u * t ** 2 * command.b.x +
                t ** 3 * command.to.x,
              y:
                u ** 3 * from.y +
                3 * u ** 2 * t * command.a.y +
                3 * u * t ** 2 * command.b.y +
                t ** 3 * command.to.y,
            }
          : {
              x:
                u ** 2 * from.x +
                2 * u * t * command.a.x +
                t ** 2 * command.to.x,
              y:
                u ** 2 * from.y +
                2 * u * t * command.a.y +
                t ** 2 * command.to.y,
            },
      );
    }
    start = command.to;
  }
  return points;
}

function bowedRectangle(left, top, right, bottom, radius, sideInset, endInset) {
  const cx = (left + right) / 2,
    cy = (top + bottom) / 2;
  const innerW = right - left,
    innerH = bottom - top;
  const point = (x, y) => ({ x, y });
  const commands = [
    { kind: "move", to: point(left + radius, top) },
    {
      kind: "cubic",
      a: point(cx - innerW * 0.16, top + endInset),
      b: point(cx + innerW * 0.16, top + endInset),
      to: point(right - radius, top),
    },
    { kind: "quadratic", a: point(right, top), to: point(right, top + radius) },
    {
      kind: "cubic",
      a: point(right - sideInset, cy - innerH * 0.16),
      b: point(right - sideInset, cy + innerH * 0.16),
      to: point(right, bottom - radius),
    },
    {
      kind: "quadratic",
      a: point(right, bottom),
      to: point(right - radius, bottom),
    },
    {
      kind: "cubic",
      a: point(cx + innerW * 0.16, bottom - endInset),
      b: point(cx - innerW * 0.16, bottom - endInset),
      to: point(left + radius, bottom),
    },
    {
      kind: "quadratic",
      a: point(left, bottom),
      to: point(left, bottom - radius),
    },
    {
      kind: "cubic",
      a: point(left + sideInset, cy + innerH * 0.16),
      b: point(left + sideInset, cy - innerH * 0.16),
      to: point(left, top + radius),
    },
    { kind: "quadratic", a: point(left, top), to: point(left + radius, top) },
  ];
  return commands;
}

export function cellGeometry(width, height, trial) {
  const cx = width / 2,
    cy = height / 2 - 2;
  const base = Math.min(width * 0.27, height * 0.25, 80);
  const geometry = { width, height, cx, cy, base };
  if (trial.cell === "animal") {
    const scale = Math.cbrt(trial.volume);
    const rx = base * 1.08 * scale,
      ry = base * 0.88 * scale;
    const wrinkle =
      trial.volume < 0.95 ? Math.min(0.17, (1 - trial.volume) * 0.3) : 0;
    const outline = Array.from({ length: 120 }, (_, i) => {
      const angle = (i / 120) * TAU,
        r = 1 + wrinkle * Math.cos(angle * 11);
      return {
        x: cx + Math.cos(angle) * rx * r,
        y: cy + Math.sin(angle) * ry * r,
      };
    });
    return { ...geometry, rx, ry, outline };
  }

  const wall = {
    x: cx - (base * 1.85) / 2,
    y: cy - (base * 2.5) / 2,
    width: base * 1.85,
    height: base * 2.5,
    radius: base * 0.17,
  };
  // The membrane coincides with the inner wall surface at the reference volume.
  const inset = 3.5;
  const left = wall.x + inset,
    top = wall.y + inset;
  const right = wall.x + wall.width - inset,
    bottom = wall.y + wall.height - inset;
  const innerW = right - left,
    innerH = bottom - top;
  const radius = Math.max(2, wall.radius - inset);
  const retraction = Math.max(0, Math.min(0.88, 1 - trial.volume));
  const sideInset = innerW * 0.42 * retraction;
  const endInset = innerH * 0.42 * retraction;
  const commands = bowedRectangle(
    left,
    top,
    right,
    bottom,
    radius,
    sideInset,
    endInset,
  );
  // A slight illustrated wall bow is much smaller than membrane retraction.
  const wallSideInset = wall.width * 0.045 * retraction;
  const wallEndInset = wall.height * 0.06 * retraction;
  const wallCommands = bowedRectangle(
    wall.x,
    wall.y,
    wall.x + wall.width,
    wall.y + wall.height,
    wall.radius,
    wallSideInset,
    wallEndInset,
  );
  const wallInnerCommands = bowedRectangle(
    left,
    top,
    right,
    bottom,
    radius,
    wallSideInset,
    wallEndInset,
  );
  const point = (x, y) => ({ x, y });
  const vacuoleScale = Math.min(1.09, Math.sqrt(trial.volume));
  const vacuole = {
    x: cx + innerW * 0.025,
    y: cy,
    rx: innerW * 0.37 * vacuoleScale,
    ry: innerH * 0.4 * vacuoleScale,
  };
  const cornerOffset = radius / 4;
  return {
    ...geometry,
    wall,
    wallCommands,
    wallInnerCommands,
    wallOutline: sampleCommands(wallCommands),
    wallInnerOutline: sampleCommands(wallInnerCommands),
    innerW,
    innerH,
    commands,
    vacuole,
    outline: sampleCommands(commands),
    corners: [
      point(left + cornerOffset, top + cornerOffset),
      point(right - cornerOffset, top + cornerOffset),
      point(right - cornerOffset, bottom - cornerOffset),
      point(left + cornerOffset, bottom - cornerOffset),
    ],
    sideInset,
    endInset,
    left,
    top,
    right,
    bottom,
  };
}
