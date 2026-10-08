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

function horizontalBoundaryAtY(outline, y, right = false) {
  const intersections = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
      intersections.push(a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
  }
  return right ? Math.max(...intersections) : Math.min(...intersections);
}

const leftBoundaryAtY = (outline, y) => horizontalBoundaryAtY(outline, y);

export function cellGeometry(width, height, trial) {
  const cx = width / 2,
    cy = height / 2 - 2;
  const base = Math.min(width * 0.27, height * 0.25, 80);
  const geometry = { width, height, cx, cy, base };
  if (trial.cell === "animal") {
    const scale = Math.cbrt(trial.volume);
    const rbc = trial.appearance === "rbc";
    const rotation = rbc ? 0 : -0.38;
    const rx = base * (rbc ? 1.08 : 1.28) * scale,
      ry = base * (rbc ? 0.88 : 0.78) * scale;
    const wrinkle =
      trial.volume < 0.95 ? Math.min(0.17, (1 - trial.volume) * 0.3) : 0;
    const outline = Array.from({ length: 120 }, (_, i) => {
      const angle = (i / 120) * TAU,
        r = 1 + wrinkle * Math.cos(angle * 11);
      const x = Math.cos(angle) * rx * r,
        y = Math.sin(angle) * ry * r;
      return {
        x: cx + x * Math.cos(rotation) - y * Math.sin(rotation),
        y: cy + x * Math.sin(rotation) + y * Math.cos(rotation),
      };
    });
    return {
      ...geometry,
      rx,
      ry,
      rotation,
      outline,
      nucleus: rbc ? null : { x: cx, y: cy, rx: base * 0.22, ry: base * 0.22 },
    };
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
  const expansion = Math.max(0, Math.min(1, (trial.volume - 1) / 0.15));
  // Slight wall flex: inward during plasmolysis, outward during turgidity.
  const wallSideInset = wall.width * (0.045 * retraction - 0.04 * expansion);
  const wallEndInset = wall.height * (0.06 * retraction - 0.035 * expansion);
  // The expanding membrane remains against the wall's inner surface.
  const sideInset = retraction > 0 ? innerW * 0.42 * retraction : wallSideInset;
  const endInset = retraction > 0 ? innerH * 0.42 * retraction : wallEndInset;
  const commands = bowedRectangle(
    left,
    top,
    right,
    bottom,
    radius,
    sideInset,
    endInset,
  );
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
  const plasmolysis = Math.max(0, Math.min(1, (1 - trial.volume - 0.1) / 0.5));
  const vacuoleScale =
    (trial.volume > 1 ? 1 + expansion * 0.2 : Math.sqrt(trial.volume)) *
    (1 - plasmolysis * 0.4);
  const vacuole = {
    x: cx + innerW * (0.025 + plasmolysis * 0.125),
    y: cy + innerH * plasmolysis * 0.04,
    rx: innerW * 0.37 * vacuoleScale,
    ry: innerH * 0.4 * vacuoleScale,
  };
  const outline = sampleCommands(commands);
  if (plasmolysis > 0) {
    const rightLimit = Math.min(
      ...Array.from({ length: 25 }, (_, i) =>
        horizontalBoundaryAtY(
          outline,
          vacuole.y + vacuole.ry * (i / 12 - 1),
          true,
        ),
      ),
    );
    vacuole.x = Math.min(vacuole.x, rightLimit - vacuole.rx - 1.8);
  }
  const nucleusRY = Math.max(4, innerH * 0.053);
  const clearance = Math.max(1.8, base * 0.025);
  const nucleusY = Math.min(
    cy +
      innerH *
        ((0.12 + retraction * 0.1) * (1 - plasmolysis) - plasmolysis * 0.05),
    bottom - endInset * 0.75 - nucleusRY - clearance,
  );
  // Reserve a cytoplasm pocket beside the vacuole, accounting for the entire
  // nucleus height rather than just the two ellipse centres.
  const nucleusYs = [nucleusY - nucleusRY, nucleusY, nucleusY + nucleusRY];
  const cellLeft = Math.max(
    ...nucleusYs.map((y) => leftBoundaryAtY(outline, y)),
  );
  const closestVacuoleY = Math.max(
    0,
    Math.abs(nucleusY - vacuole.y) - nucleusRY,
  );
  const vacuoleLeft =
    vacuole.x -
    vacuole.rx *
      Math.sqrt(Math.max(0, 1 - (closestVacuoleY / vacuole.ry) ** 2));
  const availableWidth = vacuoleLeft - cellLeft - clearance * 2;
  const nucleusRX = Math.min(Math.max(3, innerW * 0.063), availableWidth / 2);
  const nucleus = {
    x: Math.min(
      (cellLeft + clearance + nucleusRX) * (1 - plasmolysis) +
        (cx - innerW * 0.06) * plasmolysis,
      vacuoleLeft - clearance - nucleusRX,
    ),
    y: nucleusY,
    rx: nucleusRX,
    ry: nucleusRY,
  };
  const chloroplasts = [
    { x: left + radius + base * 0.13, y: top + radius + base * 0.17 },
    { x: right - radius - base * 0.13, y: bottom - radius - base * 0.17 },
  ].map((position, index) => {
    const direction = index === 0 ? 1 : -1;
    const inward = {
      x: cx - direction * innerW * 0.18,
      y: cy - direction * innerH * 0.17,
    };
    position = {
      x: position.x * (1 - plasmolysis) + inward.x * plasmolysis,
      y: position.y * (1 - plasmolysis) + inward.y * plasmolysis,
    };
    let candidate;
    search: for (const scale of [1, 0.85, 0.7, 0.55]) {
      for (let offset = -4; offset <= 8; offset++) {
        candidate = {
          x: position.x + direction * offset * base * 0.02,
          y: position.y + direction * offset * base * 0.02,
          rx: base * 0.065 * scale,
          ry: base * 0.095 * scale,
          rotation: -Math.PI / 4,
        };
        let fits = true;
        for (let i = 0; i < 24; i++) {
          const angle = (i * Math.PI) / 12;
          const dx = Math.cos(angle) * candidate.rx,
            dy = Math.sin(angle) * candidate.ry;
          const x = candidate.x + (dx + dy) / Math.sqrt(2);
          const y = candidate.y + (dy - dx) / Math.sqrt(2);
          if (
            !containsPoint(outline, x, y) ||
            ((x - vacuole.x) / (vacuole.rx + 1)) ** 2 +
              ((y - vacuole.y) / (vacuole.ry + 1)) ** 2 <=
              1 ||
            ((x - nucleus.x) / (nucleus.rx + 1)) ** 2 +
              ((y - nucleus.y) / (nucleus.ry + 1)) ** 2 <=
              1
          ) {
            fits = false;
            break;
          }
        }
        if (fits) break search;
      }
    }
    return candidate;
  });
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
    nucleus,
    chloroplasts,
    outline,
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
