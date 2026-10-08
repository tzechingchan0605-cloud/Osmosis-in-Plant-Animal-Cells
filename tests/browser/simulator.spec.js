import { test as base, expect } from "@playwright/test";
import {
  concentrationToPotential,
  potentialToConcentration,
} from "../../js/model.js";

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors, "No browser runtime errors").toEqual([]);
  },
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator("#speed").selectOption("2");
});
async function startAndFinish(page) {
  await page.locator("#start-button").click();
  await expect(page.locator("#result-card")).toBeVisible();
}

test("Concentration and water potential update each other and reject invalid inputs", async ({
  page,
}) => {
  await page.locator("#concentration").fill("10");
  expect(Number(await page.locator("#potential").inputValue())).toBeCloseTo(
    concentrationToPotential(10),
    0,
  );
  await page.locator("#potential").fill("-500");
  expect(Number(await page.locator("#concentration").inputValue())).toBeCloseTo(
    potentialToConcentration(-500),
    2,
  );
  await page.locator("#potential").fill("50");
  await expect(page.locator("#input-error")).toBeVisible();
  await expect(page.locator("#start-button")).toBeDisabled();
  await page.locator('[data-preset="equal"]').click();
  await expect(page.locator("#input-error")).toBeHidden();
  await expect(page.locator("#start-button")).toBeEnabled();
  await page.locator("#concentration").fill("21");
  await expect(page.locator("#start-button")).toBeDisabled();
  await page.locator("#concentration").fill("");
  await expect(page.locator("#start-button")).toBeDisabled();
  await page.locator('[data-preset="water"]').click();
  await expect(page.locator("#potential")).toHaveValue("0");
});

test("Plant plasmolysis, bilingual conclusions, notebook and distilled-water recovery", async ({
  page,
}) => {
  await page.locator('[data-preset="strong"]').click();
  await page.locator('[data-prediction="out"]').click();
  await startAndFinish(page);
  await expect(page.locator("#result-heading")).toHaveText(
    "Hypertonic solution",
  );
  await expect(page.locator("#conclusion")).toContainText("plasmolysis");
  await expect(page.locator("#conclusion .key-point")).toHaveText([
    "net",
    "out of the cell",
    "equilibrium",
    "plasmolysis",
    "flaccid",
  ]);
  await expect(page.locator("#conclusion .key-point").first()).toHaveCSS(
    "color",
    "rgb(179, 43, 43)",
  );
  await expect(page.locator("#prediction-feedback")).toContainText("matched");
  await expect(page.locator("#trials-body tr")).toHaveCount(1);
  const finalVolume = await page.locator("#after-volume").textContent();
  await page.locator("#language-button").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.locator("#result-heading")).toHaveText("高滲溶液");
  await expect(page.locator("#conclusion")).toContainText("質壁分離");
  await expect(page.locator("#conclusion .key-point")).toHaveText([
    "淨",
    "離開細胞",
    "平衡",
    "質壁分離",
    "軟縮",
  ]);
  await expect(page.locator("#conclusion")).toContainText(
    "水分子藉滲透淨移動離開細胞，即水分子進入細胞的速率較離開細胞的速率低，直至細胞內、外的水分達至平衡。",
  );
  await expect(page.locator("#after-volume")).toHaveText(finalVolume);
  await page.locator("#recovery-button").click();
  await expect(page.locator("#before-volume")).toHaveText(finalVolume);
  await expect(page.locator("#concentration")).toHaveValue("0");
  await expect(page.locator("#result-card")).toBeVisible();
  await expect(page.locator("#result-heading")).toHaveText("低滲溶液");
  await expect(page.locator("#conclusion")).toContainText("硬脹");
  await expect(page.locator("#conclusion .key-point")).toHaveText([
    "淨",
    "進入細胞",
    "平衡",
    "硬脹",
    "平衡",
  ]);
  await expect(page.locator("#trials-body tr")).toHaveCount(2);
  expect(
    parseFloat(await page.locator("#after-volume").textContent()),
  ).toBeGreaterThan(1);
  await page.reload();
  await expect(page.locator("#trials-body tr")).toHaveCount(2);
  await page.locator("#clear-trials").click();
  await expect(page.locator("#notebook-empty")).toBeVisible();
});

test("Red blood cells show haemolysis in pure water and wrinkles in concentrated sucrose", async ({
  page,
}) => {
  await page.locator('[data-cell="animal"]').click();
  await page.locator('[data-preset="water"]').click();
  await startAndFinish(page);
  await expect(page.locator("#conclusion")).toContainText("haemolysis");
  await expect(page.locator("#conclusion .key-point")).toHaveText([
    "net",
    "into the cell",
    "swelled",
    "burst",
    "haemoglobin",
    "haemolysis",
  ]);
  await expect(page.locator("#status")).toHaveText("Cell membrane ruptured");
  await expect(page.locator("#recovery-button")).toBeHidden();
  await page.locator('[data-preset="strong"]').click();
  await startAndFinish(page);
  await expect(page.locator("#conclusion")).toContainText(
    "shrank and became wrinkled",
  );
  await expect(page.locator("#conclusion .key-point")).toHaveText([
    "net",
    "out of the cell",
    "equilibrium",
    "shrank",
    "wrinkled",
  ]);
  await expect(page.locator("#trials-body tr")).toHaveCount(2);
});

test("Both cells remain unchanged in an isotonic solution", async ({
  page,
}) => {
  for (const cell of ["plant", "animal"]) {
    await page.locator(`[data-cell="${cell}"]`).click();
    await page.locator('[data-preset="equal"]').click();
    await startAndFinish(page);
    await expect(page.locator("#result-heading")).toHaveText(
      "Isotonic solution",
    );
    await expect(page.locator("#conclusion")).toContainText(
      "both directions at equal rates",
    );
    await expect(page.locator("#after-volume")).toHaveText("1.00×");
    await expect(page.locator("#conclusion .key-point")).toHaveText([
      "equal rates",
      "no net movement",
      "remained unchanged",
    ]);
  }
});

test("Pause preserves the cell state; resume, reset and language switching work during a trial", async ({
  page,
}) => {
  await page.locator('[data-preset="strong"]').click();
  await page.locator("#speed").selectOption("0.5");
  await page.locator("#start-button").click();
  await expect(page.locator("#concentration")).toBeDisabled();
  await page.waitForTimeout(400);
  await page.locator("#start-button").click();
  await expect(page.locator("#status")).toHaveText("Paused");
  const volume = await page.locator("#after-volume").textContent();
  await page.waitForTimeout(300);
  await expect(page.locator("#after-volume")).toHaveText(volume);
  await page.locator("#language-button").click();
  await expect(page.locator("#status")).toHaveText("已暫停");
  await page.locator("#start-button").click();
  await expect(page.locator("#status")).toHaveText("觀察中");
  await page.locator("#reset-button").click();
  await expect(page.locator("#after-volume")).toHaveText("1.00×");
  await expect(page.locator("#concentration")).toBeEnabled();
  await expect(page.locator("#result-card")).toBeHidden();
});

test("Mobile layout fits the screen, and the science guide is keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#language-button").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("#help-button").click();
  await expect(page.locator("#guide-dialog")).toBeVisible();
  await expect(page.locator("#guide-dialog")).toContainText("差異透性膜");
  await expect(page.locator("#guide-dialog")).toContainText("細胞壁具全透性");
  await expect(page.locator("#guide-dialog details")).toHaveCount(0);
  await expect(page.locator("#guide-dialog")).not.toContainText("開始探索");
  await page.keyboard.press("Escape");
  await expect(page.locator("#guide-dialog")).toBeHidden();
  await page.locator('[data-preset="equal"]').click();
  await startAndFinish(page);
  await expect(page.locator("#result-heading")).toHaveText("等滲溶液");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("Water keeps its identity across Start, pause and equilibrium, with balanced initial exchanges", async ({
  page,
}) => {
  const snapshot = () =>
    page.evaluate(async () => {
      const { getParticleSnapshot } = await import("/js/renderer.js");
      return getParticleSnapshot(document.querySelector("#after-canvas"));
    });
  await page.locator('[data-preset="strong"]').click();
  const initial = await snapshot();
  await expect
    .poll(async () => (await snapshot()).crossings.in)
    .toBeGreaterThan(2);
  const ready = await snapshot();
  expect(ready.water).toHaveLength(54);
  expect(ready.transfers.in).toBeLessThanOrEqual(2);
  expect(ready.transfers.in).toBe(ready.transfers.out);
  expect(ready.inside).toBe(initial.inside);
  expect(ready.crossings.in).toBe(ready.crossings.out);
  expect(
    ready.water.some((p, i) => p.inside !== initial.water[i].inside),
  ).toBeTruthy();
  await page.locator("#start-button").click();
  await expect
    .poll(async () => (await snapshot()).inside)
    .toBeLessThan(initial.inside);
  await page.locator("#start-button").click();
  await expect(page.locator("#status")).toHaveText("Paused");
  const paused = await snapshot();
  await page.waitForTimeout(300);
  expect(await snapshot()).toEqual(paused);
  await page.locator("#language-button").click();
  expect(await snapshot()).toEqual(paused);
  await page.locator("#start-button").click();
  await expect(page.locator("#result-card")).toBeVisible();
  await expect.poll(async () => (await snapshot()).inside).toBe(7);
  const complete = await snapshot();
  expect(complete.water.map((p) => p.id)).toEqual(
    initial.water.map((p) => p.id),
  );
  expect(complete.crossings.in).toBeGreaterThanOrEqual(ready.crossings.in);
  expect(complete.crossings.out).toBeGreaterThan(complete.crossings.in);
  await expect
    .poll(async () => (await snapshot()).crossings.in)
    .toBeGreaterThan(complete.crossings.in + 3);
  const later = await snapshot();
  expect(later.transfers.in).toBeLessThanOrEqual(2);
  expect(later.transfers.in).toBe(later.transfers.out);
  expect(later.inside).toBe(complete.inside);
  expect(later.crossings.in - complete.crossings.in).toBe(
    later.crossings.out - complete.crossings.out,
  );
  expect(later.quadrants.in.every((n) => n > 0)).toBeTruthy();
  expect(later.quadrants.out.every((n) => n > 0)).toBeTruthy();
});
