import { join } from "node:path";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows the kite catalog", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Kites" })).toBeVisible();
  await expect(page.getByTestId("product")).toHaveCount(6);
});

test("adding kites updates the cart", async ({ page }) => {
  await page.getByRole("button", { name: "Add Pipeline Box Kite to cart" }).click();
  await page.getByRole("button", { name: "Add Pipeline Box Kite to cart" }).click();
  await page.getByRole("button", { name: "Add Hosted Glider to cart" }).click();

  await expect(page.getByTestId("cart-count")).toHaveText("3");
  await page.getByRole("button", { name: /^Cart/ }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("$169.00");
});

test("removing a kite from the cart", async ({ page }) => {
  await page.getByRole("button", { name: "Add The Agent to cart" }).click();
  await page.getByRole("button", { name: /^Cart/ }).click();
  await page.getByRole("button", { name: "Remove one The Agent" }).click();

  await expect(page.getByTestId("cart-count")).toHaveText("0");
  await expect(page.getByText("No kites yet.")).toBeVisible();
});

test("takes a screenshot of the shop", async ({ page }) => {
  await expect(page.getByTestId("product")).toHaveCount(6);
  await page.screenshot({ path: join(__dirname, "..", "screenshots", "shop.png") });
});
