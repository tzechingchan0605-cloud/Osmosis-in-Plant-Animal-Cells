// Classroom model: sucrose is impermeant, the bath is a large reservoir,
// temperature is 25 °C, and the initial cell has no pressure potential.
export const CELL_PSI = -500;
export const MAX_CONCENTRATION = 20;
export const KPA_PER_PERCENT = (10 / 342.3) * 8.314 * 298.15;
export const BURST_VOLUME = 1.6;
export const EQUALITY_TOLERANCE = 1; // kPa, accommodates rounded student inputs.

export const concentrationToPotential = (concentration) =>
  concentration === 0 ? 0 : -KPA_PER_PERCENT * concentration;
export const potentialToConcentration = (potential) =>
  -potential / KPA_PER_PERCENT;
export function cellPotential(cell, volume) {
  return (
    CELL_PSI / volume + (cell === "plant" ? Math.max(0, volume - 1) * 3000 : 0)
  );
}
export function classify(solutionPsi, cellPsi = CELL_PSI) {
  const difference = solutionPsi - cellPsi;
  return Math.abs(difference) <= EQUALITY_TOLERANCE
    ? "iso"
    : difference > 0
      ? "hypo"
      : "hyper";
}
export function equilibriumVolume(cell, solutionPsi) {
  if (cell === "animal")
    return solutionPsi === 0 ? Infinity : CELL_PSI / solutionPsi;
  if (solutionPsi <= CELL_PSI) return CELL_PSI / solutionPsi;
  // 3000v² - (3000 + solutionPsi)v - 500 = 0.
  const term = 3000 + solutionPsi;
  return (term + Math.sqrt(term * term + 6000000)) / 6000;
}
export function createTrial(cell, concentration, initialVolume = 1) {
  if (
    !["plant", "animal"].includes(cell) ||
    !Number.isFinite(concentration) ||
    concentration < 0 ||
    concentration > MAX_CONCENTRATION ||
    !Number.isFinite(initialVolume) ||
    initialVolume <= 0
  )
    throw new RangeError("Invalid trial settings");
  const solutionPsi = concentrationToPotential(concentration);
  const initialPsi = cellPotential(cell, initialVolume);
  return {
    cell,
    concentration,
    solutionPsi,
    initialPsi,
    initialVolume,
    volume: initialVolume,
    elapsed: 0,
    tone: classify(solutionPsi, initialPsi),
    status: "ready",
    burst: false,
  };
}
export function advanceTrial(trial, dt) {
  if (trial.status !== "running") return trial;
  const next = { ...trial, elapsed: trial.elapsed + dt };
  if (trial.tone === "iso") {
    if (next.elapsed >= 2.5) next.status = "complete";
    return next;
  }
  const equilibrium = equilibriumVolume(trial.cell, trial.solutionPsi);
  const willBurst = trial.cell === "animal" && equilibrium >= BURST_VOLUME;
  const target = willBurst ? BURST_VOLUME + 0.12 : equilibrium;
  // Schematic time, not a measurement of biological permeability or rate.
  next.volume += (target - next.volume) * (1 - Math.exp(-0.85 * dt));
  if (willBurst && next.volume >= BURST_VOLUME) {
    next.volume = BURST_VOLUME;
    next.burst = true;
    next.status = "complete";
  } else if (
    Math.abs(cellPotential(next.cell, next.volume) - next.solutionPsi) <
    EQUALITY_TOLERANCE / 2
  ) {
    next.volume = equilibrium;
    next.status = "complete";
  }
  return next;
}
export function outcome(trial) {
  if (trial.tone === "iso") return "unchanged";
  if (trial.cell === "animal")
    return trial.tone === "hyper"
      ? "wrinkled"
      : trial.burst
        ? "haemolysis"
        : "swollen";
  return trial.tone === "hypo"
    ? "turgid"
    : trial.volume < 0.9
      ? "plasmolysed"
      : "flaccid";
}
