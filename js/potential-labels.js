function horizontalSpan(outline, y) {
  const intersections = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
      intersections.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  intersections.sort((a, b) => a - b);
  return intersections.flatMap((left, i) =>
    i % 2 ? [] : [{ left, right: intersections[i + 1] }],
  );
}

function organelleBounds(organelle, margin) {
  const angle = organelle.rotation ?? 0;
  const rx =
    Math.hypot(organelle.rx * Math.cos(angle), organelle.ry * Math.sin(angle)) +
    margin;
  const ry =
    Math.hypot(organelle.rx * Math.sin(angle), organelle.ry * Math.cos(angle)) +
    margin;
  return {
    left: organelle.x - rx,
    right: organelle.x + rx,
    top: organelle.y - ry,
    bottom: organelle.y + ry,
  };
}

// Find a rectangle entirely within the upper cytoplasm, with clearance from
// the membrane, vacuole and other organelles. Text fitting uses this same box.
export function cytoplasmLabelBox(geometry, width, height) {
  const margin = Math.max(1.5, geometry.base * 0.025);
  const firstY = Math.min(...geometry.outline.map((p) => p.y)) + margin;
  const lastY =
    (geometry.vacuole
      ? geometry.vacuole.y - geometry.vacuole.ry - margin
      : geometry.nucleus
        ? geometry.nucleus.y - geometry.nucleus.ry - margin
        : geometry.cy) - height;
  const organelles = [geometry.nucleus, ...(geometry.chloroplasts ?? [])]
    .filter(Boolean)
    .map((o) => organelleBounds(o, margin));
  const preferredX = geometry.vacuole?.x ?? geometry.cx;
  for (let y = firstY; y <= lastY; y += 0.5) {
    // Check every polygon vertex height: a concave membrane may have several
    // separate interior spans, and the space between them is outside the cell.
    const rows = [
      y - margin,
      y + height + margin,
      ...geometry.outline
        .filter((p) => p.y > y - margin && p.y < y + height + margin)
        .map((p) => p.y),
    ];
    let available = [{ left: -Infinity, right: Infinity }];
    for (const row of rows) {
      const spans = horizontalSpan(geometry.outline, row);
      available = available
        .flatMap((a) =>
          spans.map((s) => ({
            left: Math.max(a.left, s.left),
            right: Math.min(a.right, s.right),
          })),
        )
        .filter((s) => s.right - s.left >= width + margin * 2);
      if (!available.length) break;
    }
    available = available.map((s) => ({
      left: s.left + margin,
      right: s.right - margin,
    }));
    for (const o of organelles) {
      if (y + height < o.top || y > o.bottom) continue;
      available = available.flatMap((s) =>
        o.right <= s.left || o.left >= s.right
          ? [s]
          : [
              { left: s.left, right: Math.min(s.right, o.left) },
              { left: Math.max(s.left, o.right), right: s.right },
            ],
      );
    }
    const fits = available.filter((s) => s.right - s.left >= width);
    if (!fits.length) continue;
    const positions = fits.map((s) => ({
      x: Math.max(s.left, Math.min(s.right - width, preferredX - width / 2)),
      y,
    }));
    positions.sort(
      (a, b) =>
        Math.abs(a.x + width / 2 - preferredX) -
        Math.abs(b.x + width / 2 - preferredX),
    );
    return { ...positions[0], width, height };
  }
  return null;
}
