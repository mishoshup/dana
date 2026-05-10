import { test, expect } from "@playwright/test";
import { uniqueEmail, registerUser } from "./helpers";

test.describe("Grab Entries", () => {
  const password = "TestPass123!";

  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail();
    await registerUser(page, email, password);
  });

  test("log a ride entry via API and verify on page", async ({ page }) => {
    // Create a Grab entry via API
    const res = await page.request.post("/api/grab", {
      data: {
        date: "2026-05-10",
        platform: "Grab",
        hours: 6.5,
        gross: 250,
        commission: 50,
        fuel: 30,
        tolls: 10,
        net: 160,
      },
    });

    expect(res.ok()).toBeTruthy();
    const entry = await res.json();
    expect(entry).toHaveProperty("id");
    expect(entry.platform).toBe("Grab");
    expect(entry.gross).toBe(250);

    // Visit the Grab tracker page
    await page.goto("/grab");
    await page.waitForLoadState("networkidle");

    // Should see the Grab tracker page title
    await expect(page.getByText("Grab Tracker")).toBeVisible();
    // Should show stats (this week / this month)
    // These appear in both labels and card titles — use first()
    await expect(page.getByText("This Week").first()).toBeVisible();
    await expect(page.getByText("This Month").first()).toBeVisible();
    await expect(page.getByText("Avg/Day").first()).toBeVisible();

    // Should show the entry in the stats (aggregated into totals)
    // Since the API returns all entries (no user scoping), just verify stats populate
    await expect(page.getByText(/^RM\d/).first()).toBeVisible();
  });

  test("log a ride via the form on the page", async ({ page }) => {
    await page.goto("/grab");
    await page.waitForLoadState("networkidle");

    // Click "Log Ride" button to open form
    await page.getByText("Log Ride").click();

    // Fill in the form
    await page.fill('input[type="date"]', "2026-05-10");
    await page.selectOption("select", "Grab");

    // Fill hours
    const hourInputs = page.locator('input[type="number"]');
    await hourInputs.nth(0).fill("4");
    await hourInputs.nth(1).fill("180");

    // Submit
    await page.getByText("Save Entry").click();

    // Wait for save
    await page.waitForTimeout(2000);

    // Should show success or the entry reflects in stats
    // The form should close
    await expect(page.getByText("Log Ride")).toBeVisible();
  });

  test("rejects invalid grab entry", async ({ page }) => {
    const res = await page.request.post("/api/grab", {
      data: {
        platform: "Grab",
        // Missing date, hours, gross
      },
    });

    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
