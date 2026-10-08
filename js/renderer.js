import { cellPotential } from "./model.js";

function random(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function hexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function arrow(ctx, x1, y1, x2, y2, colour, width = 2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(angle - 0.45), y2 - 8 * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - 8 * Math.cos(angle + 0.45), y2 - 8 * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}
function callout(ctx, label, x, y, toX, toY, align = "left") {
  ctx.font = '10px system-ui, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = align;
  const tw = ctx.measureText(label).width;
  const start = align === "right" ? x - tw / 2 : x + tw / 2;
  ctx.strokeStyle = "#a6b29b";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(start, y + 6);
  ctx.lineTo(start, y + 14);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.fillStyle = "#6f8360";
  ctx.beginPath();
  ctx.arc(toX, toY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#758368";
  ctx.fillText(label, x, y);
}

export function drawChamber(
  canvas,
  trial,
  {
    time = 0,
    active = false,
    labels = true,
    t,
    solute = "sucrose",
    potential = (current) => cellPotential(current.cell, current.volume),
  },
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bounds = canvas.getBoundingClientRect();
  const w = bounds.width,
    h = bounds.height;
  if (!w || !h) return;
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2,
    cy = h / 2 - 2;
  const base = Math.min(w * 0.27, h * 0.25, 80);
  const wallW = base * 1.85,
    wallH = base * 2.5;
  const rng = random(1059);
  const insideOutline = (x, y) =>
    trial.cell === "plant"
      ? Math.abs(x - cx) < wallW / 2 + 7 && Math.abs(y - cy) < wallH / 2 + 7
      : Math.hypot((x - cx) / (base * 1.3), (y - cy) / (base * 1.2)) < 1;

  // Exterior is a reservoir: schematic density changes with concentration only.
  const sugarCount =
    solute === "salt" ? 12 : Math.round(trial.concentration * 1.5);
  const waterCount =
    solute === "salt" ? 65 : 72 - Math.round(trial.concentration * 1.4);
  for (let i = 0; i < waterCount + sugarCount; i++) {
    let x, y;
    for (let attempt = 0; attempt < 100; attempt++) {
      x = 10 + rng() * (w - 20);
      y = 18 + rng() * (h - 42);
      if (!insideOutline(x, y)) break;
    }
    if (insideOutline(x, y)) continue;
    x += Math.sin(time * 0.35 + i * 1.7) * 3;
    y += Math.cos(time * 0.3 + i * 2.2) * 3;
    ctx.globalAlpha = i < waterCount ? 0.38 : 0.62;
    if (i < waterCount) {
      ctx.fillStyle = "#459fc2";
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (solute === "salt") {
      ctx.fillStyle = "#c9a057";
      ctx.beginPath();
      ctx.arc(x - 2, y, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a091b5";
      ctx.beginPath();
      ctx.arc(x + 3, y + 2, 2.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#d6a158";
      hexagon(ctx, x, y, 3.9);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const shadow = ctx.createRadialGradient(
    cx,
    cy + base * 0.8,
    1,
    cx,
    cy + base * 0.8,
    base * 1.5,
  );
  shadow.addColorStop(0, "#bccbb128");
  shadow.addColorStop(1, "#bccbb100");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + base * 1.1, base * 1.5, base * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  let innerW, innerH;
  if (trial.cell === "plant") {
    const wallX = cx - wallW / 2,
      wallY = cy - wallH / 2;
    rounded(ctx, wallX, wallY, wallW, wallH, base * 0.17);
    ctx.fillStyle = "#dcebc7";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#7e9f65";
    ctx.stroke();
    rounded(ctx, wallX + 4, wallY + 4, wallW - 8, wallH - 8, base * 0.14);
    ctx.fillStyle = "#f7fbef";
    ctx.fill();
    const scale =
      trial.volume < 1
        ? 0.92 * Math.sqrt(trial.volume)
        : Math.min(0.99, 0.92 + (trial.volume - 1) * 0.5);
    innerW = wallW * scale;
    innerH = wallH * scale;
    if (trial.volume < 0.9) {
      ctx.strokeStyle = "#c5c6b0";
      ctx.lineWidth = 0.75;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + sx * (wallW / 2 - 6), cy + sy * (wallH / 2 - 8));
          ctx.lineTo(cx + sx * (innerW / 2 - 8), cy + sy * (innerH / 2 - 8));
          ctx.stroke();
        }
    }
    rounded(
      ctx,
      cx - innerW / 2,
      cy - innerH / 2,
      innerW,
      innerH,
      Math.min(15, innerW / 4),
    );
    ctx.fillStyle = "#edc9cc";
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#b77c93";
    ctx.stroke();
    const vrx = innerW * (trial.volume > 1 ? 0.4 : 0.34),
      vry = innerH * (trial.volume > 1 ? 0.44 : 0.38);
    ctx.beginPath();
    ctx.ellipse(cx + innerW * 0.06, cy, vrx, vry, -0.07, 0, Math.PI * 2);
    const vg = ctx.createLinearGradient(cx - vrx, cy - vry, cx + vrx, cy + vry);
    vg.addColorStop(0, "#d0eced");
    vg.addColorStop(1, "#a5d1de");
    ctx.fillStyle = vg;
    ctx.fill();
    ctx.strokeStyle = "#81b7c3";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      cx - innerW * 0.31,
      cy + innerH * 0.16,
      Math.max(3, innerW * 0.065),
      Math.max(4, innerH * 0.055),
      -0.1,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#af87b6";
    ctx.fill();
    ctx.strokeStyle = "#916b9c";
    ctx.stroke();
    // Grey marks are conserved internal solute, not exterior sucrose.
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4,
        r = 0.76;
      ctx.fillStyle = "#b29ba2";
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * innerW * 0.46 * r,
        cy + Math.sin(a) * innerH * 0.46 * r,
        1.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (labels) {
      callout(
        ctx,
        t("cellWall"),
        w - 10,
        31,
        cx + wallW / 2,
        cy - wallH * 0.34,
        "right",
      );
      callout(
        ctx,
        t("cellMembrane"),
        9,
        h - 49,
        cx - innerW / 2,
        cy + innerH * 0.28,
      );
      callout(
        ctx,
        t("vacuole"),
        w - 10,
        h - 25,
        cx + innerW * 0.17,
        cy + innerH * 0.14,
        "right",
      );
    }
  } else {
    const scale = Math.cbrt(trial.volume);
    const rx = base * 1.08 * scale,
      ry = base * 0.88 * scale;
    innerW = rx * 2;
    innerH = ry * 2;
    const rg = ctx.createRadialGradient(cx, cy, base * 0.07, cx, cy, rx);
    rg.addColorStop(0, "#f5d5c9");
    rg.addColorStop(0.52, "#eeb5ad");
    rg.addColorStop(1, "#df978e");
    ctx.fillStyle = rg;
    ctx.strokeStyle = "#ca827b";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const wrinkling =
        trial.volume < 0.95
          ? Math.min(0.17, (1 - trial.volume) * 0.3) * Math.cos(angle * 11)
          : 0;
      const rr = 1 + wrinkling;
      const x = cx + Math.cos(angle) * rx * rr,
        y = cy + Math.sin(angle) * ry * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    if (!trial.burst) {
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0.5, Math.PI * 1.72);
      ctx.stroke();
      for (let i = 0; i < 17; i++) {
        const a = i * 2.399,
          distance = base * (1.1 + (i % 4) * 0.19);
        ctx.fillStyle = "#d8938970";
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(a) * distance,
          cy + Math.sin(a) * distance * 0.8,
          3 + (i % 3),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    if (!trial.burst && trial.volume < 1.2) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.52, ry * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f8ded280";
      ctx.fill();
    }
    if (labels)
      callout(
        ctx,
        t(trial.burst ? "haemoglobin" : "cellMembrane"),
        w - 10,
        37,
        cx + rx * 0.8,
        cy - ry * 0.6,
        "right",
      );
  }

  // Water within the cell changes with volume; blue is consistent with the legend.
  const waterRng = random(1714),
    insideCount = Math.round(17 * trial.volume);
  for (let i = 0; i < insideCount; i++) {
    const a = waterRng() * Math.PI * 2,
      radius = Math.sqrt(waterRng()) * 0.72;
    const x =
      cx +
      Math.cos(a) * innerW * 0.42 * radius +
      Math.sin(time * 0.45 + i) * 1.5;
    const y =
      cy +
      Math.sin(a) * innerH * 0.42 * radius +
      Math.cos(time * 0.4 + i) * 1.5;
    ctx.fillStyle = "#3999bb80";
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (active && !trial.burst) {
    const difference =
      trial.status === "complete" || trial.tone === "iso"
        ? 0
        : trial.solutionPsi - potential(trial);
    const bias = Math.max(-1, Math.min(1, difference / 150));
    // The membrane remains dynamic at equilibrium: equal inward/outward rates.
    for (const direction of ["in", "out"]) {
      const entering = direction === "in";
      const multiplier = 1 + (entering ? bias : -bias) * 0.65;
      const angle = entering ? -2.35 : 0.45;
      const outside = base * 1.65,
        inside =
          trial.cell === "plant"
            ? Math.min(innerW, innerH) * 0.12
            : base * 0.55;
      const x1 = cx + Math.cos(angle) * (entering ? outside : inside),
        y1 = cy + Math.sin(angle) * (entering ? outside : inside);
      const x2 = cx + Math.cos(angle) * (entering ? inside : outside),
        y2 = cy + Math.sin(angle) * (entering ? inside : outside);
      arrow(
        ctx,
        x1,
        y1,
        x2,
        y2,
        entering ? "#388fac99" : "#d2945399",
        1.4 + multiplier,
      );
      for (let i = 0; i < 3; i++) {
        const phase = (time * 0.32 * multiplier + i / 3) % 1;
        ctx.fillStyle = "#318eaf";
        ctx.beginPath();
        ctx.arc(
          x1 + (x2 - x1) * phase,
          y1 + (y2 - y1) * phase,
          3.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
}
