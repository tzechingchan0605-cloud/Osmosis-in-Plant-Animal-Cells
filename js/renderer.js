import { cellGeometry, boundaryAt } from "./geometry.js";
import { cellPotential } from "./model.js";
import { drawRupturedCell } from "./rupture.js";
import { cytoplasmDots, drawNucleus } from "./cell-details.js";
import {
  createParticles,
  advanceParticles,
  particleSnapshot,
} from "./particles.js";

const chambers = new WeakMap();
function hexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const px = x + Math.cos(angle) * r,
      py = y + Math.sin(angle) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function membranePath(ctx, geometry) {
  ctx.beginPath();
  if (geometry.commands) {
    for (const command of geometry.commands) {
      if (command.kind === "move") ctx.moveTo(command.to.x, command.to.y);
      else if (command.kind === "cubic")
        ctx.bezierCurveTo(
          command.a.x,
          command.a.y,
          command.b.x,
          command.b.y,
          command.to.x,
          command.to.y,
        );
      else
        ctx.quadraticCurveTo(
          command.a.x,
          command.a.y,
          command.to.x,
          command.to.y,
        );
    }
  } else {
    geometry.outline.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
  }
  ctx.closePath();
}
function callout(ctx, label, x, y, toX, toY, align = "left") {
  ctx.font = '10px system-ui, "Microsoft JhengHei", sans-serif';
  ctx.textAlign = align;
  const tw = ctx.measureText(label).width;
  const endX = align === "right" ? x - tw - 5 : x + tw + 5;
  const elbowX = endX + (align === "right" ? -15 : 15);
  const lineY = y - 3;
  ctx.strokeStyle = "#7f8d73";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(elbowX, lineY);
  ctx.lineTo(endX, lineY); // The segment beside the wording is always horizontal.
  ctx.stroke();
  ctx.fillStyle = "#657458";
  ctx.fillText(label, x, y);
}

// Read-only snapshots let the checks inspect conservation and real crossings.
export function getParticleSnapshot(canvas) {
  const chamber = chambers.get(canvas);
  return chamber ? particleSnapshot(chamber.particles) : null;
}

export function getStructureSnapshot(canvas) {
  const structures = chambers.get(canvas)?.structures;
  return structures ? structuredClone(structures) : null;
}

export function drawChamber(
  canvas,
  trial,
  {
    time = 0,
    labels = true,
    t,
    solute = "sucrose",
    resetKey = 0,
    potential = (current) => cellPotential(current.cell, current.volume),
    potentialScale = 1,
    potentialUnit = "kPa",
    potentialDigits = 1,
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
  const geometry = cellGeometry(w, h, trial);
  const { cx, cy, base } = geometry;
  const key = `${resetKey}:${trial.cell}:${trial.appearance ?? "regular"}:${trial.concentration}:${trial.initialVolume}:${solute}`;
  let chamber = chambers.get(canvas);
  if (!chamber || chamber.key !== key) {
    chamber = {
      key,
      particles: createParticles(geometry, trial, solute),
      time,
      frameTime: performance.now() / 1000,
    };
    chambers.set(canvas, chamber);
  }
  advanceParticles(
    chamber.particles,
    geometry,
    trial,
    Math.min(0.12, Math.max(0, time - chamber.time)),
    Math.min(0.12, Math.max(0, performance.now() / 1000 - chamber.frameTime)),
  );
  chamber.time = time;
  chamber.frameTime = performance.now() / 1000;

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
  const callouts = [];

  if (trial.cell === "plant") {
    const { vacuole, nucleus } = geometry;
    membranePath(ctx, { commands: geometry.wallCommands });
    ctx.fillStyle = "#dcebc7";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#7e9f65";
    ctx.stroke();
    // At the starting volume, the membrane is flush with this inner surface.
    membranePath(ctx, { commands: geometry.wallInnerCommands });
    ctx.fillStyle = "#f7fbef";
    ctx.fill();
    membranePath(ctx, geometry);
    ctx.fillStyle = "#edc9cc";
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#b77c93";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      vacuole.x,
      vacuole.y,
      vacuole.rx,
      vacuole.ry,
      0,
      0,
      Math.PI * 2,
    );
    const vg = ctx.createLinearGradient(
      cx - vacuole.rx,
      cy - vacuole.ry,
      cx + vacuole.rx,
      cy + vacuole.ry,
    );
    vg.addColorStop(0, "#d0eced");
    vg.addColorStop(1, "#a5d1de");
    ctx.fillStyle = vg;
    ctx.fill();
    ctx.strokeStyle = "#81b7c3";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawNucleus(ctx, nucleus);
    for (const chloroplast of geometry.chloroplasts) {
      ctx.save();
      ctx.translate(chloroplast.x, chloroplast.y);
      ctx.rotate(chloroplast.rotation);
      ctx.translate(-chloroplast.x, -chloroplast.y);
      ctx.beginPath();
      ctx.ellipse(
        chloroplast.x,
        chloroplast.y,
        chloroplast.rx,
        chloroplast.ry,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#98c625";
      ctx.fill();
      ctx.strokeStyle = "#4d9637";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    if (labels) {
      const wallPoint = boundaryAt(
        { ...geometry, outline: geometry.wallOutline },
        -Math.PI * 0.2,
      );
      callouts.push([
        t("cellWall"),
        w - 10,
        31,
        wallPoint.x,
        wallPoint.y,
        "right",
      ]);
      const membrane = boundaryAt(geometry, Math.PI * 0.72);
      callouts.push([t("cellMembrane"), 9, h - 49, membrane.x, membrane.y]);
      callouts.push([
        t("vacuole"),
        w - 10,
        h - 25,
        vacuole.x + vacuole.rx * 0.65,
        vacuole.y + vacuole.ry * 0.75,
        "right",
      ]);
    }
  } else {
    const { rx, ry } = geometry;
    const rbc = trial.appearance === "rbc";
    const rg = ctx.createRadialGradient(cx, cy, base * 0.07, cx, cy, rx);
    rg.addColorStop(0, "#f5d5c9");
    rg.addColorStop(0.52, "#eeb5ad");
    rg.addColorStop(1, "#df978e");
    ctx.fillStyle = rbc ? rg : "#f7d4e2";
    ctx.strokeStyle = rbc ? "#ca827b" : "#dd6b9d";
    ctx.lineWidth = 1.8;
    membranePath(ctx, geometry);
    if (!trial.burst) {
      ctx.fill();
      ctx.stroke();
    } else {
      chamber.burstTime ??= time;
      const progress = Math.min(1, (time - chamber.burstTime) / 1.3);
      drawRupturedCell(ctx, geometry, progress);
      canvas.dataset.ruptureProgress = progress.toFixed(3);
    }
    if (rbc && !trial.burst && trial.volume < 1.2) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.52, ry * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f8ded280";
      ctx.fill();
    }
    if (labels)
      callouts.push([
        t(trial.burst ? "cytoplasmReleased" : "cellMembrane"),
        w - 10,
        37,
        cx + rx * (trial.burst ? 1.12 : 0.8),
        cy - ry * (trial.burst ? 0.3 : 0.6),
        "right",
      ]);
    if (!rbc) {
      drawNucleus(ctx, geometry.nucleus);
      if (labels && !trial.burst) {
        callouts.push([
          t("nucleus"),
          9,
          h - 38,
          geometry.nucleus.x - geometry.nucleus.rx,
          geometry.nucleus.y,
        ]);
        callouts.push([
          t("cytoplasm"),
          w - 10,
          h - 25,
          cx + rx * 0.55,
          cy + ry * 0.2,
          "right",
        ]);
      }
    }
  }

  const fixedDots =
    trial.appearance === "rbc" || trial.burst ? [] : cytoplasmDots(geometry);
  ctx.fillStyle = "#e85b9499";
  for (const dot of fixedDots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, Math.max(0.75, base * 0.014), 0, Math.PI * 2);
    ctx.fill();
  }
  chamber.structures = {
    appearance: trial.appearance ?? "regular",
    nucleus: geometry.nucleus,
    chloroplasts: geometry.chloroplasts ?? [],
    cytoplasmDots: fixedDots,
  };

  // Every dot belongs to the persistent population. Crossing dots do not spawn,
  // disappear, follow arrows, or change identity when the Start button is used.
  for (const p of chamber.particles.molecules) {
    if (p.type === "water") {
      const flashing =
        !trial.burst && p.contactUntil > chamber.particles.contactClock;
      ctx.fillStyle = flashing
        ? "#0b5e83"
        : p.inside && !trial.burst
          ? "#3999bba6"
          : "#459fc27a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, flashing ? 3.0 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (solute === "salt") {
      ctx.fillStyle = "#c9a057a0";
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a091b5a0";
      ctx.beginPath();
      ctx.arc(p.x + 3, p.y + 2, 2.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#d6a158a0";
      hexagon(ctx, p.x, p.y, 3.9);
      ctx.fill();
    }
  }
  for (const args of callouts) callout(ctx, ...args);
  const cellPsi = trial.burst ? null : potential(trial);
  canvas.dataset.cellPotential = cellPsi === null ? "" : String(cellPsi);
  canvas.dataset.solutionPotential = String(trial.solutionPsi);
  canvas.dataset.playbackSpeed = "0.5";
  if (!trial.burst) delete canvas.dataset.ruptureProgress;
  const number = (value) =>
    (Math.abs(value * potentialScale) < 10 ** -potentialDigits / 2
      ? 0
      : value * potentialScale
    )
      .toFixed(potentialDigits)
      .replace("-", "−");
  canvas.setAttribute(
    "aria-description",
    `${t("solutionPsiShort")}: ${number(trial.solutionPsi)} ${potentialUnit}; ` +
      (cellPsi === null
        ? t("membraneBroken")
        : `${t("cellPsiShort")}: ${number(cellPsi)} ${potentialUnit}`),
  );
  const roundedPotential = (value) =>
    Number((value * potentialScale).toFixed(potentialDigits));
  const difference =
    cellPsi === null
      ? 0
      : roundedPotential(cellPsi) - roundedPotential(trial.solutionPsi);
  const cellColor =
    difference > 0 ? "#248146" : difference < 0 ? "#b32b2b" : "#000000";
  const solutionColor =
    difference < 0 ? "#248146" : difference > 0 ? "#b32b2b" : "#000000";
  const badge = (title, value, x, y, maxWidth, valueColor) => {
    const fontSize = (maxWidth < 95 ? 9 : 11) / 2;
    ctx.font = `600 ${fontSize}px system-ui, "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = "center";
    const lines = [title, `${number(value)} ${potentialUnit}`];
    const width = Math.min(
      maxWidth,
      Math.max(...lines.map((line) => ctx.measureText(line).width)) + 8,
    );
    ctx.fillStyle = "#ffffffdf";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width, 18, 3);
    ctx.fill();
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? "#36586b" : valueColor;
      ctx.fillText(line, x, y + 7 + i * 7, width - 4);
    });
  };
  badge(
    t("solutionPsiShort"),
    trial.solutionPsi,
    Math.min(72, w * 0.23),
    6,
    w * 0.43,
    solutionColor,
  );
  if (cellPsi !== null) {
    const top = boundaryAt(geometry, -Math.PI / 2).y;
    badge(
      t("cellPsiShort"),
      cellPsi,
      cx,
      top + 8,
      Math.min(130, base * 1.3),
      cellColor,
    );
  }
}
