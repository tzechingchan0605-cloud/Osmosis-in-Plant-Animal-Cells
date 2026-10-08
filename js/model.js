// Classroom model: sucrose is impermeant and the bath has finite water volume,
// temperature is 25 °C, and the initial cell has no pressure potential.
export const CELL_PSI = -750;
export const INITIAL_SOLUTION_VOLUME = 4; // Relative water volume, cell starts at 1.
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
export function equilibriumVolume(
  cell,
  initialSolutionPsi,
  initialVolume = 1,
  initialSolutionVolume = INITIAL_SOLUTION_VOLUME,
) {
  if (Math.abs(cellPotential(cell, initialVolume) - initialSolutionPsi) < 1e-7)
    return initialVolume;
  const totalWater = initialVolume + initialSolutionVolume;
  if (cell === "animal")
    return initialSolutionPsi === 0
      ? Infinity
      : (CELL_PSI * totalWater) /
          (CELL_PSI + initialSolutionPsi * initialSolutionVolume);
  // Solve against the changing bath, conserving its impermeant solute and
  // total water. Cell potential increases monotonically with cell volume,
  // while bath potential decreases, so the common equilibrium is unique.
  let low = 1e-9,
    high = totalWater - 1e-9;
  for (let i = 0; i < 64; i++) {
    const volume = (low + high) / 2;
    const bathPsi =
      (initialSolutionPsi * initialSolutionVolume) / (totalWater - volume);
    if (cellPotential(cell, volume) > bathPsi) high = volume;
    else low = volume;
  }
  return (low + high) / 2;
}

function updateSolution(trial) {
  const totalWater = trial.initialVolume + trial.initialSolutionVolume;
  trial.solutionVolume = trial.burst ? totalWater : totalWater - trial.volume;
  trial.solutionConcentration =
    (trial.concentration * trial.initialSolutionVolume) / trial.solutionVolume;
  // After rupture, the released cell solutes share the whole water pool.
  trial.solutionPsi =
    (trial.initialSolutionPsi * trial.initialSolutionVolume +
      (trial.burst ? CELL_PSI : 0)) /
    trial.solutionVolume;
  return trial;
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
    initialSolutionPsi: solutionPsi,
    initialSolutionVolume: INITIAL_SOLUTION_VOLUME,
    solutionVolume: INITIAL_SOLUTION_VOLUME,
    solutionConcentration: concentration,
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
    if (next.elapsed >= 2.5) {
      next.volume = equilibriumVolume(
        trial.cell,
        trial.initialSolutionPsi,
        trial.initialVolume,
        trial.initialSolutionVolume,
      );
      next.status = "complete";
    }
    return updateSolution(next);
  }
  const equilibrium = equilibriumVolume(
    trial.cell,
    trial.initialSolutionPsi,
    trial.initialVolume,
    trial.initialSolutionVolume,
  );
  const willBurst = trial.cell === "animal" && equilibrium >= BURST_VOLUME;
  const target = willBurst ? BURST_VOLUME + 0.12 : equilibrium;
  // Schematic time, not a measurement of biological permeability or rate.
  next.volume += (target - next.volume) * (1 - Math.exp(-0.85 * dt));
  updateSolution(next);
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
  return updateSolution(next);
}
export function outcome(trial) {
  if (trial.tone === "iso") return "unchanged";
  if (trial.cell === "animal")
    return trial.tone === "hyper"
      ? "wrinkled"
      : trial.burst
        ? "lysed"
        : "swollen";
  return trial.tone === "hypo"
    ? "turgid"
    : trial.volume < 0.9
      ? "plasmolysed"
      : "flaccid";
}
