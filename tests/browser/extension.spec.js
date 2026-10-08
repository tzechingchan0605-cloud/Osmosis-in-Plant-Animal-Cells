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
});
test("The extension tests the lower-potential misconception and supports a correct final inference", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#extension-button").click();
  await page.locator("#extension-next-1").click();
  await page.locator("#extension-hypothesis").selectOption("lower");
  await page
    .locator("#extension-reason")
    .fill(
      "I am testing whether a lower initial water potential causes shrinking.",
    );
  await page.locator("#predict-x").selectOption("none");
  await page.locator("#predict-y").selectOption("out");
  await page.locator("#language-button").click();
  await expect(page.locator("#extension-reason")).toHaveValue(
    "I am testing whether a lower initial water potential causes shrinking.",
  );
  await expect(page.locator("#extension-hypothesis")).toHaveValue("lower");
  await page.locator("#extension-start-test").click();
  await expect(page.locator("#extension-test-result")).toBeVisible();
  await expect(page.locator("#extension-volume-x")).toHaveText("體積：0.00%");
  await expect(page.locator("#extension-volume-other")).toHaveText(
    "體積：+2.02%",
  );
  await expect(page.locator("#extension-result-title")).toHaveText(
    "細胞 Y 吸水，並未萎縮。",
  );
  await page.locator("#extension-higher-test").click();
  await expect(page.locator("#extension-test-result")).toBeVisible();
  await expect(page.locator("#extension-volume-other")).toHaveText(
    "體積：−1.76%",
  );
  await expect(page.locator("#extension-result-title")).toHaveText(
    "細胞 Z 失水並輕微萎縮。",
  );
  await page.locator("#extension-to-explain").click();
  await expect(page.locator("#extension-summary-body tr")).toHaveCount(3);
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
  await page.locator("#extension-return").click();
  await expect(page.locator("#core-lab")).toBeVisible();
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
  await page.locator("#core-button").click();
  await expect(page.locator("#status")).toHaveText("Paused");
});
