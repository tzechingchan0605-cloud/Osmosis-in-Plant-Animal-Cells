import { containsPoint } from "./geometry.js";

export function insideOrganelle(organelle, x, y, margin = 0) {
  if (!organelle) return false;
  const angle = organelle.rotation ?? 0;
  const dx = x - organelle.x,
    dy = y - organelle.y;
  return (
    ((dx * Math.cos(angle) + dy * Math.sin(angle)) / (organelle.rx + margin)) **
      2 +
      ((dy * Math.cos(angle) - dx * Math.sin(angle)) /
        (organelle.ry + margin)) **
        2 <=
    1
  );
}

// These are fixed cytoplasm details, separate from the moving water/solute
// population. They change only with the structure of the cell, never with time.
export function cytoplasmDots(geometry) {
  const dots = [];
  const width = geometry.innerW ?? geometry.rx * 2.1;
  const height = geometry.innerH ?? geometry.ry * 2.6;
  for (let i = 0; i < 140; i++) {
    const jitter = Math.sin(i * 73.31) * 0.18;
    const x = geometry.cx + (((i % 10) + 0.5 + jitter) / 10 - 0.5) * width;
    const y =
      geometry.cy + ((Math.floor(i / 10) + 0.5 - jitter) / 14 - 0.5) * height;
    if (
      containsPoint(geometry.outline, x, y) &&
      !insideOrganelle(geometry.vacuole, x, y, 3) &&
      !insideOrganelle(geometry.nucleus, x, y, 3) &&
      !(geometry.chloroplasts ?? []).some((c) => insideOrganelle(c, x, y, 3))
    ) {
      dots.push({ x, y });
    }
  }
  return dots;
}

export function drawNucleus(ctx, nucleus) {
  if (!nucleus) return;
  ctx.beginPath();
  ctx.ellipse(nucleus.x, nucleus.y, nucleus.rx, nucleus.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c598cb";
  ctx.fill();
  ctx.strokeStyle = "#8c5899";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#9850a8";
  for (let i = 0; i < 30; i++) {
    const angle = i * 2.399963,
      fraction = Math.sqrt((i + 0.5) / 30) * 0.82;
    ctx.beginPath();
    ctx.arc(
      nucleus.x + Math.cos(angle) * nucleus.rx * fraction,
      nucleus.y + Math.sin(angle) * nucleus.ry * fraction,
      0.7,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
