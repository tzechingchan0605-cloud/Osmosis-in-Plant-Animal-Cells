// The swollen cell opens at two membrane sites. Its body remains visible while
// pink cytoplasm jets through the tears, following the supplied textbook figure.
export function drawRupturedCell(ctx, geometry, progress) {
  const { cx, cy, rx, ry, base } = geometry;
  const opening = progress * progress * (3 - 2 * progress);
  const sites = [
    { angle: 3.84, halfGap: 0.015 + opening * 0.13, size: 0.55 },
    { angle: 0.7, halfGap: 0.015 + opening * 0.22, size: 1.05 },
  ];
  const point = (angle, scale = 1) => ({
    x: cx + Math.cos(angle) * rx * scale,
    y: cy + Math.sin(angle) * ry * scale,
  });
  const arc = (start, end, move = false) => {
    for (let i = 0; i <= 64; i++) {
      const p = point(start + ((end - start) * i) / 64);
      if (move && i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  };
  const tear = (site, overlap = 0) => {
    for (let i = 1; i <= 7; i++) {
      const angle = site.angle - site.halfGap + (site.halfGap * 2 * i) / 7;
      const inset = i === 7 ? 0 : (i % 2 ? 0.09 : 0.24) * opening + overlap;
      const p = point(angle, 1 - inset);
      ctx.lineTo(p.x, p.y);
    }
  };
  const [leftSite, rightSite] = sites;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(geometry.rotation ?? 0);
  ctx.translate(-cx, -cy);

  // Filled cytoplasm has two notches; membrane strokes stop at their lips.
  ctx.beginPath();
  arc(
    rightSite.angle + rightSite.halfGap,
    leftSite.angle - leftSite.halfGap,
    true,
  );
  tear(leftSite);
  arc(
    leftSite.angle + leftSite.halfGap,
    rightSite.angle - rightSite.halfGap + Math.PI * 2,
  );
  tear(rightSite);
  ctx.closePath();
  ctx.fillStyle = "#f7d4e2";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#e85b9499";
  for (let i = 0; i < 140; i++) {
    const jitter = Math.sin(i * 73.31) * 0.18;
    const x = cx + (((i % 10) + 0.5 + jitter) / 10 - 0.5) * rx * 2.1;
    const y = cy + ((Math.floor(i / 10) + 0.5 - jitter) / 14 - 0.5) * ry * 2.6;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.75, base * 0.014), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "#dd6b9d";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  arc(
    rightSite.angle + rightSite.halfGap,
    leftSite.angle - leftSite.halfGap,
    true,
  );
  arc(
    leftSite.angle + leftSite.halfGap,
    rightSite.angle - rightSite.halfGap + Math.PI * 2,
    true,
  );
  ctx.stroke();

  const release = Math.max(0, (progress - 0.04) / 0.96);
  for (const site of sites) {
    const origin = point(site.angle, 0.94);
    const outward = { x: Math.cos(site.angle), y: Math.sin(site.angle) };
    const tangent = { x: -outward.y, y: outward.x };
    const length = base * site.size * release;
    const width = base * site.size * 0.38 * release;
    const jetPoint = (distance, spread) => ({
      x: origin.x + outward.x * distance + tangent.x * spread,
      y: origin.y + outward.y * distance + tangent.y * spread,
    });
    if (release > 0) {
      ctx.fillStyle = "#f5c8df";
      // Fill the whole opening and join it to the spray. The membrane remains
      // interrupted at the two lips, but there is no empty gap in the cytoplasm.
      const firstLip = point(site.angle - site.halfGap);
      const firstNeck = jetPoint(length * 0.35, -width * 0.7);
      const lastNeck = jetPoint(length * 0.35, width * 0.7);
      ctx.beginPath();
      ctx.moveTo(firstLip.x, firstLip.y);
      tear(site, 0.025 * opening);
      ctx.lineTo(lastNeck.x, lastNeck.y);
      ctx.lineTo(firstNeck.x, firstNeck.y);
      ctx.closePath();
      ctx.fill();
      // Connected, lobed sprays grow out of each hole instead of appearing as
      // detached membrane halves or a gap running through the cell centre.
      ctx.beginPath();
      const start = jetPoint(0, -width * 0.18);
      ctx.moveTo(start.x, start.y);
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 10;
        const radial = i % 2 ? 1 : 0.68;
        const end = jetPoint(
          length * (0.5 + Math.cos(a) * 0.5 * radial),
          Math.sin(a) * width,
        );
        const control = jetPoint(
          length * (0.55 + Math.cos(a - 0.14) * 0.55),
          Math.sin(a - 0.14) * width * 1.15,
        );
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
      }
      const finish = jetPoint(0, width * 0.18);
      ctx.lineTo(finish.x, finish.y);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const p = jetPoint(
          length * (0.6 + i * 0.14),
          width * Math.sin(i * 2.7) * 1.4,
        );
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          base * (0.017 + (i % 3) * 0.012) * release,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
