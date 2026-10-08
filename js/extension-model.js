// The saline value is GIVEN for this extension; it is independent of the
// sucrose conversion used in the core lab. All water potentials here are kPa.
export const SALINE_PSI = -794;
export const EXTENSION_CELLS = { A: -794, B: -700 };
export function extensionDirection(initialPsi) {
  if (Math.abs(initialPsi - SALINE_PSI) < 1e-10) return "none";
  return initialPsi < SALINE_PSI ? "in" : "out";
}
export function createExtensionCell(name) {
  if (!(name in EXTENSION_CELLS))
    throw new RangeError("Unknown extension cell");
  const initialPsi = EXTENSION_CELLS[name];
  return {
    name,
    initialPsi,
    volume: 1,
    elapsed: 0,
    status: "ready",
    direction: extensionDirection(initialPsi),
  };
}
export function extensionPotential(cell) {
  return cell.initialPsi / cell.volume;
}
export function advanceExtensionCell(cell, dt) {
  if (cell.status !== "running") return cell;
  const next = { ...cell, elapsed: cell.elapsed + dt };
  const target = cell.initialPsi / SALINE_PSI;
  next.volume += (target - next.volume) * (1 - Math.exp(-0.9 * dt));
  if (next.elapsed >= 2.5 && Math.abs(next.volume - target) < 0.00002) {
    next.volume = target;
    next.status = "complete";
  }
  return next;
}
