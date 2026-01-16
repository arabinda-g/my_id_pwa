import { test, expect } from "@playwright/test";

test("loads while offline after first visit", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Home")).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker?.controller);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText("Home")).toBeVisible();
});
