import { test as base, expect } from "@playwright/test";

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});
test("Supplied photo uses biological leader lines and the requested source citation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#extension-button").click();
  await expect(page.locator("#extension-study")).toBeVisible();
  await expect(page.locator(".biological-leaders line")).toHaveCount(2);
  await expect(page.locator(".biological-photo circle")).toHaveCount(0);
  await expect(page.locator(".biological-labels")).toContainText(
    "regular shape",
  );
  await expect(page.locator(".biological-labels")).toContainText("Shrunken");
  await expect(page.locator(".photo-source")).toContainText("圖片來源：");
  await expect(page.locator(".photo-source a")).toHaveAttribute(
    "href",
    "https://unsplash.com/@niaid",
  );
  const photo = await page.request.get("/assets/Red%20Blood%20Cell.jpg");
  expect(photo.ok()).toBeTruthy();
  expect((await photo.body()).length).toBeGreaterThan(10000);
  await page.locator("#language-button").click();
  await expect(page.locator(".biological-labels")).toContainText("萎縮的");
  await expect(page.locator('[data-i18n="observationScenario"]')).toHaveText(
    "這些紅血細胞正浸於 0.9% 氯化鈉溶液中，即−794 kPa。",
  );
  await expect(page.locator('[data-i18n="observationPrompt"]')).toHaveText(
    "為什麼溶液會對個別細胞產生不同的影響？試推測細胞A、B的起始水勢。",
  );
  for (const name of ["a", "b"]) {
    await expect(page.locator(`#compare-psi-${name}`)).toHaveValue("");
    await expect(
      page.locator(`#compare-psi-${name} option`).filter({ hasNotText: "?" }),
    ).toHaveText([">", "<", "="]);
  }
});
test("The A/B extension preserves symbol predictions and supports a correct final inference", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#extension-button").click();
  await page.locator("#compare-psi-a").selectOption("equal");
  await page.locator("#compare-psi-b").selectOption("lower");
  await page.locator("#extension-next-1").click();
  await expect(page.locator("#extension-step-2")).toContainText("−700 kPa");
  await expect(page.locator("#extension-step-2")).not.toContainText("MPa");
  await expect(
    page.locator("#extension-hypothesis, #extension-reason"),
  ).toHaveCount(0);
  await expect(page.locator("#extension-step-2")).toContainText(
    "A TESTABLE HYPOTHESIS",
  );
  await expect(page.locator("#extension-step-2")).toContainText("Cell A");
  await expect(page.locator("#extension-step-2")).toContainText("Cell B");
  await page.locator("#predict-a").selectOption("none");
  await page.locator("#predict-b").selectOption("out");
  await page.locator("#language-button").click();
  await expect(page.locator("#compare-psi-a")).toHaveValue("equal");
  await expect(page.locator("#compare-psi-b")).toHaveValue("lower");
  await expect(page.locator("#extension-step-2")).toContainText("可測試的假說");
  await page.locator("#extension-start-test").click();
  await expect(page.locator("#extension-test-result")).toBeVisible();
  await expect(page.locator("#extension-volume-a")).toHaveText("體積：0.00%");
  await expect(page.locator("#extension-volume-other")).toHaveText(
    "體積：−11.84%",
  );
  await expect(page.locator("#extension-result-title")).toHaveText(
    "細胞 B 失水並萎縮。",
  );
  await expect(page.locator("#extension-canvas-other")).toHaveAttribute(
    "data-solution-potential",
    "-794",
  );
  await expect(page.locator("#extension-canvas-other")).toHaveAttribute(
    "data-cell-potential",
    "-794",
  );
  await expect(page.locator("#extension-result-points .key-point")).toHaveText([
    "速率相同",
    "維持不變",
    "高",
    "淨",
    "離開 B",
    "減少",
    "沒有淨移動",
  ]);
  await expect(
    page.locator("#extension-lower-test, #extension-prediction-feedback"),
  ).toHaveCount(0);
  await page.locator("#extension-to-explain").click();
  await expect(page.locator("#extension-summary-body tr")).toHaveCount(2);
  await expect(page.locator("#infer-a option").first()).toHaveText("請選擇");
  await expect(page.locator("#infer-b option").first()).toHaveText("請選擇");
  await expect(
    page.locator("#extension-summary-body tr td:nth-child(2)"),
  ).toHaveText(["−794", "−700"]);
  await page.locator('[data-extension-step="1"]').click();
  await expect(page.locator("#extension-step-1")).toBeVisible();
  await page.locator('[data-extension-step="2"]').click();
  await expect(page.locator("#compare-psi-b")).toHaveValue("lower");
  await expect(page.locator("#predict-b")).toHaveValue("out");
  await page.locator('[data-extension-step="3"]').click();
  await expect(page.locator("#extension-result-title")).toHaveText(
    "細胞 B 失水並萎縮。",
  );
  await page.locator('[data-extension-step="4"]').click();
  await expect(page.locator("#extension-summary-body tr")).toHaveCount(2);
  await page.locator("#infer-a").selectOption("equal");
  await page.locator("#infer-b").selectOption("lower");
  await page.locator("#extension-check").click();
  await expect(page.locator("#extension-final-feedback")).toHaveAttribute(
    "data-correct",
    "false",
  );
  await page.locator("#infer-b").selectOption("higher");
  await page.locator("#extension-check").click();
  await expect(page.locator("#extension-final-feedback")).toHaveAttribute(
    "data-correct",
    "true",
  );
  await expect(page.locator("#extension-final-feedback")).toContainText("等滲");
  await expect(page.locator("#extension-final-feedback")).not.toContainText(
    "其確切起始水勢仍未知。",
  );
  await expect(page.locator("#extension-final-feedback .key-point")).toHaveText(
    ["相對 細胞A 是等滲的", "相對 細胞B 是高滲的"],
  );
  await expect(
    page.locator("#extension-final-feedback .key-point").first(),
  ).toHaveCSS("color", "rgb(179, 43, 43)");
  await page.locator("#extension-return").click();
  await expect(page.locator("#core-lab")).toBeVisible();
});

test("All four stage buttons support review, keyboard activation and pausing without losing answers", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#extension-button").click();
  await expect(page.locator(".extension-steps button")).toHaveCount(4);
  await page.locator('[data-extension-step="4"]').click();
  await expect(page.locator("#extension-step-4")).toBeVisible();
  await expect(page.locator("#extension-review-note")).toBeVisible();
  await expect(page.locator("#extension-summary-body tr")).toHaveCount(0);
  await page.locator('[data-extension-step="2"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#extension-step-2")).toBeVisible();
  await page.locator("#predict-a").selectOption("none");
  await page.locator("#predict-b").selectOption("out");
  await page.locator('[data-extension-step="3"]').click();
  await expect(page.locator("#extension-pause")).toHaveText(
    "Test the predictions",
  );
  const rbcDetails = await page.evaluate(async () => {
    const { getStructureSnapshot } = await import("/js/renderer.js");
    return getStructureSnapshot(
      document.querySelector("#extension-canvas-other"),
    );
  });
  expect(rbcDetails.appearance).toBe("rbc");
  expect(rbcDetails.nucleus).toBeNull();
  await expect(page.locator("#extension-canvas-other")).toHaveAttribute(
    "data-cell-potential",
    "-700",
  );
  await page.locator("#extension-pause").click();
  await page.waitForTimeout(600);
  await page.locator('[data-extension-step="1"]').click();
  await page.locator('[data-extension-step="3"]').click();
  await expect(page.locator("#extension-pause")).toHaveText("Resume");
  const pausedPsi = await page
    .locator("#extension-canvas-other")
    .getAttribute("data-cell-potential");
  expect(Number(pausedPsi)).toBeLessThan(-700);
  expect(Number(pausedPsi)).toBeGreaterThan(-794);
  await page.waitForTimeout(300);
  await expect(page.locator("#extension-canvas-other")).toHaveAttribute(
    "data-cell-potential",
    pausedPsi,
  );
  await page.locator('[data-extension-step="2"]').click();
  await expect(page.locator("#predict-a")).toHaveValue("none");
  await expect(page.locator("#predict-b")).toHaveValue("out");
});
test("Extension fits a mobile screen and switching activities pauses the core experiment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#start-button").click();
  await page.locator("#extension-button").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const photoBox = await page.locator(".micrograph-card").boundingBox();
  const questionBox = await page
    .locator("#extension-step-1 .extension-question-card")
    .boundingBox();
  expect(questionBox.y).toBeGreaterThanOrEqual(photoBox.y + photoBox.height);
  expect(questionBox.width).toBeGreaterThan(300);
  await page.locator("#extension-next-1").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("#extension-start-test").click();
  await page.locator("#extension-pause").click();
  const value = await page.locator("#extension-volume-other").textContent();
  await page.waitForTimeout(250);
  await expect(page.locator("#extension-volume-other")).toHaveText(value);
  await page.locator("#extension-pause").click();
  await expect(page.locator("#extension-test-result")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("#extension-reset").click();
  await expect(page.locator("#extension-step-1")).toBeVisible();
  await expect(page.locator("#compare-psi-a")).toHaveValue("");
  await expect(page.locator("#compare-psi-b")).toHaveValue("");
  await page.locator("#core-button").click();
  await expect(page.locator("#status")).toHaveText("Paused");
});
