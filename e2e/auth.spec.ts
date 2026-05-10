import { test, expect } from "@playwright/test";
import { uniqueEmail, registerUser, loginUser } from "./helpers";

test.describe.serial("Authentication", () => {
  const testEmail = uniqueEmail();
  const testPassword = "TestPass123!";

  test("register page loads without sidebar", async ({ page }) => {
    await page.goto("/register");

    // Should see the register form
    await expect(page.locator("h1")).toHaveText("Dana");
    await expect(page.getByText("Create your account")).toBeVisible();

    // Should have name, email, password fields
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Should NOT have the sidebar (nav items)
    await expect(page.getByText("Dashboard")).toHaveCount(0);
    await expect(page.getByText("Debt Tracker")).toHaveCount(0);
  });

  test("register and redirect to home", async ({ page }) => {
    await registerUser(page, testEmail, testPassword);

    // After successful registration, go to home page
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should show the dashboard content — use heading role to avoid hidden sidebar spans
    await expect(page.getByRole("heading", { name: "Dana" }).first()).toBeVisible();

    // Should show debt and navigation now that we're authenticated
    await expect(page.getByText("Income")).toBeVisible();
  });

  test("login and redirect to home", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Should see the login form without sidebar
    await expect(page.locator("h1")).toHaveText("Dana");
    await expect(page.getByText("Personal Finance OS")).toBeVisible();

    // Fill in credentials using page form (not API)
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click('button[type="submit"]');

    // Login uses window.location.href = "/" which triggers a full page load.
    // Wait for the page URL to settle. Use ** glob since actual URL will be
    // http://localhost:3000/ and we need it to match.
    await page.waitForURL("**/", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Should show dashboard
    await expect(page.getByText("Income")).toBeVisible();
  });

  test("redirect to login when accessing protected page while unauthenticated", async ({
    page,
  }) => {
    // Visit debt page without auth
    await page.goto("/debt");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Should be on login page
    await expect(page.locator("h1")).toHaveText("Dana");
    await expect(page.getByText("Personal Finance OS")).toBeVisible();
  });

  test("API returns 401 when unauthenticated", async ({ page }) => {
    const res = await page.request.get("/api/debt");
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Authentication required");
  });
});
