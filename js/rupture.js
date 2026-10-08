// Open, jagged membrane remnants distinguish a burst animal cell from an
// intact swollen cell. Organelles are drawn separately by the renderer.
export function drawRupturedCell(ctx, geometry, progress) {
  const { cx, cy, rx, ry } = geometry;
  const opening = 0.12 + progress * 0.22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(geometry.rotation ?? 0);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = "#f3c8d8b8";
  ctx.strokeStyle = "#d86a96";
  ctx.lineWidth = 1.7;
  for (const side of [-1, 1]) {
    const offset = side * ry * progress * 0.12;
    const start = side === -1 ? Math.PI + 0.28 : 0.28;
    const end = side === -1 ? 2 * Math.PI - 0.28 : Math.PI - 0.28;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const angle = start + ((end - start) * i) / 48;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry + offset;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    // Ragged lips retract from a wide opening through the former cell centre.
    const backwards = side === -1 ? 1 : -1;
    for (let i = 0; i <= 14; i++) {
      const fraction = i / 14;
      const x = cx + backwards * rx * (1 - fraction * 2) * 0.96;
      const ragged =
        (i % 2 ? -0.1 : 0.075) * (0.55 + (1 + Math.sin(i * 2.7)) * 0.4);
      ctx.lineTo(x, cy + side * ry * (opening + ragged) + offset);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Small pieces separate at the two rupture sites.
  for (const side of [-1, 1]) {
    const x = cx + side * rx * (0.98 + progress * 0.2);
    const y = cy + side * ry * 0.1;
    ctx.beginPath();
    ctx.moveTo(x, y - ry * 0.12);
    ctx.lineTo(x + side * rx * 0.13, y - ry * 0.02);
    ctx.lineTo(x + side * rx * 0.08, y + ry * 0.12);
    ctx.lineTo(x - side * rx * 0.03, y + ry * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let i = 0; i < 48; i++) {
    const side = i % 2 ? -1 : 1;
    const spread = (i % 11) / 10;
    const angle = i * 2.399963;
    const endX = cx + side * rx * (0.75 + spread * 0.65);
    const endY = cy + Math.sin(angle) * ry * (0.25 + spread * 0.8);
    ctx.fillStyle = `rgba(217, 90, 146, ${0.56 * progress})`;
    ctx.beginPath();
    ctx.arc(endX, endY, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
